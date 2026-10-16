import { describe, expect, it } from "vitest";
import { emptyPinkConfig, pinkConfigSchema } from "@/websites/templates/pink-y2k/config";
import { MAX_STICKERS, applyStickerEdit, duplicateSticker, layerSticker, newSticker, placementAtPoint, stickerArt, stickersForViewport, STICKER_KINDS, STICKER_LIBRARY, stickerEditMessageSchema, stickerSchema, stickersSchema } from "@/websites/templates/pink-y2k/stickers";
import { PREVIEW_PROTOCOL, trustedPreviewSender } from "@/websites/preview-transport";
import { parsePinkPreview } from "@/websites/templates/pink-y2k/preview";
import { mediaUrls, referencedAssets } from "@/websites/editor-utils";
import { storedMediaUrls } from "@/websites/stored-media";
import { templateSwitchDraft } from "@/websites/template-snapshots";

describe("Y2K freely placed stickers", () => {
  it("defaults older drafts to an empty collection without importing decorations", () => {
    const { stickers, ...old } = emptyPinkConfig();
    expect(stickers).toEqual([]);
    expect(pinkConfigSchema.parse(old).stickers).toEqual([]);
  });
  it("preserves reference stickers in drafts without treating bundled art as an owned upload", () => {
    const item = newSticker("kitty-leopard-head", "kitty-1");
    const config = pinkConfigSchema.parse({ ...emptyPinkConfig(), stickers: [item] });
    expect(config.stickers[0].kind).toBe("kitty-leopard-head");
    expect(mediaUrls(config)).not.toContain(stickerArt(item.kind)?.src);
    expect(referencedAssets(config)).toEqual([]);
    expect(stickerSchema.safeParse({ ...item, kind: "unknown-reference" }).success).toBe(false);
  });
  it("has actual cutouts for every built-in kind, including saved legacy kinds", () => {
    expect(new Set(STICKER_LIBRARY.map(art => art.kind)).size).toBe(STICKER_LIBRARY.length);
    for (const kind of STICKER_KINDS) {
      if (kind !== "custom") expect(stickerArt(kind)?.src).toMatch(/^\/websites\/pink-y2k\/stickers\/[a-z0-9-]+\.webp$/);
    }
  });
  it("keeps independent mobile and desktop placement across preview and template switches", () => {
    const item = newSticker("chrome-heart", "heart-1");
    item.mobile = { region: "footer", x: 12, y: 80, size: 60, rotation: -25 };
    const config = { ...emptyPinkConfig(), stickers: [item] };
    const preview = parsePinkPreview({ protocol: PREVIEW_PROTOCOL, type: "draft", sequence: 2, config, stickerEditor: { enabled: true, selectedId: item.id, viewport: "mobile" } }, "http://localhost:3005");
    expect(preview.success && preview.data.config.stickers[0].mobile).toEqual(item.mobile);
    const away = templateSwitchDraft({ templateKey: "y2k", templateVersion: 1, draftConfig: config, templateConfigs: {} }, "bella", 1);
    const back = templateSwitchDraft({ templateKey: "bella", templateVersion: 1, draftConfig: away.config, templateConfigs: away.snapshots }, "y2k", 1);
    expect(pinkConfigSchema.parse(back.config).stickers).toEqual([item]);
  });
  it("rejects duplicate IDs, unsafe images and unbounded transforms", () => {
    const item = newSticker("chrome-star", "star-1");
    for (const patch of [{ x: -1 }, { y: 101 }, { size: 9999 }, { rotation: Infinity }, { region: "script" }]) expect(stickerSchema.safeParse({ ...item, mobile: { ...item.mobile, ...patch } }).success).toBe(false);
    for (const input of [{ ...item, kind: "custom", image: "javascript:alert(1)" }, { ...item, kind: "custom", image: "" }, { ...item, kind: "custom", image: "https://evil.test/photo.png" }]) expect(stickerSchema.safeParse(input).success).toBe(false);
    expect(pinkConfigSchema.safeParse({ ...emptyPinkConfig(), stickers: [item, item] }).success).toBe(false);
  });
  it("moves through arbitrary regions and preserves the other viewport", () => {
    const item = newSticker("pink-bow", "bow-1", "", "mobile");
    const next = placementAtPoint(item.mobile, 375, 1700, 500, [{ region: "hero", top: 0, height: 700 }, { region: "services", top: 700, height: 1500 }]);
    expect(next).toMatchObject({ region: "services", x: 75, y: 66.67 });
    const moved = applyStickerEdit([item], { id: item.id, viewport: "mobile", action: "move", placement: next });
    expect(moved[0].desktop).toEqual(item.desktop);
    expect(moved[0].mobile).toEqual(next);
    expect(applyStickerEdit(moved, { id: item.id, viewport: "mobile", action: "delete" })).toEqual([]);
  });
  it.each(["mobile", "desktop"] as const)("adds and duplicates stickers only in %s", viewport => {
    const other = viewport === "mobile" ? "desktop" : "mobile";
    const item = newSticker("pink-bow", "bow-1", "", viewport);
    const copy = duplicateSticker(item, "bow-2", viewport);
    expect(stickersForViewport([item, copy], viewport)).toHaveLength(2);
    expect(stickersForViewport([item, copy], other)).toEqual([]);
    expect(copy[viewport].x).toBe(item[viewport].x + 5);
    expect(copy[viewport].size).toBe(item[viewport].size);
    expect(item[other].visible).toBe(false);
    const deleted = applyStickerEdit([item, copy], { id: item.id, viewport, action: "delete" });
    expect(deleted).toEqual([copy]);
  });
  it.each(["mobile", "desktop"] as const)("moves and removes legacy shared stickers only in %s", viewport => {
    const other = viewport === "mobile" ? "desktop" : "mobile";
    const item = stickerSchema.parse({ id: "legacy-1", kind: "chrome-heart", image: "", desktop: { x: 20, rotation: 15 }, mobile: { x: 80, size: 60 } });
    expect(stickersForViewport([item], viewport)).toEqual([item]);
    const moved = applyStickerEdit([item], { id: item.id, viewport, action: "move", placement: { ...item[viewport], region: "footer", x: 12, y: 78, size: 90, rotation: -30 } });
    expect(moved[0][other]).toEqual(item[other]);
    expect(moved[0][viewport]).toMatchObject({ region: "footer", x: 12, y: 78, size: 90, rotation: -30 });
    const removed = applyStickerEdit(moved, { id: item.id, viewport, action: "delete" });
    expect(stickersForViewport(removed, viewport)).toEqual([]);
    expect(stickersForViewport(removed, other)[0][other]).toEqual(item[other]);
    expect(applyStickerEdit(removed, { id: item.id, viewport: other, action: "delete" })).toEqual([]);
  });
  it("keeps layer changes independent and puts new stickers in front after reordering", () => {
    const items = ["first", "second", "third"].map(id => stickerSchema.parse({ id, kind: "pink-bow", image: "" }));
    const reordered = layerSticker(items, "first", "mobile", true);
    expect(stickersForViewport(reordered, "mobile").map(item => item.id)).toEqual(["second", "third", "first"]);
    expect(stickersForViewport(reordered, "desktop").map(item => item.id)).toEqual(["first", "second", "third"]);
    for (const [index, item] of items.entries()) expect(reordered[index].desktop).toEqual(item.desktop);
    const added = newSticker("chrome-star", "fourth", "", "mobile");
    const next = layerSticker([...reordered, added], added.id, "mobile", true);
    expect(stickersForViewport(next, "mobile").map(item => item.id)).toEqual(["second", "third", "first", "fourth"]);
    expect(stickersForViewport(next, "desktop").map(item => item.id)).toEqual(["first", "second", "third"]);
  });
  it("allows a full composition in each viewport without exceeding either limit", () => {
    const mobile = Array.from({ length: MAX_STICKERS }, (_, i) => newSticker("pink-bow", `mobile-${i}`, "", "mobile"));
    const desktop = Array.from({ length: MAX_STICKERS }, (_, i) => newSticker("chrome-star", `desktop-${i}`));
    expect(stickersSchema.safeParse([...mobile, ...desktop]).success).toBe(true);
    expect(stickersSchema.safeParse([...mobile, newSticker("pink-bow", "extra", "", "mobile")]).success).toBe(false);
    expect(stickersSchema.safeParse([...desktop, newSticker("pink-bow", "extra")]).success).toBe(false);
  });
  it("preserves separate visibility and layers across preview, serialization and template switches", () => {
    const items = [newSticker("pink-bow", "mobile-only", "", "mobile"), newSticker("chrome-star", "desktop-only")];
    const config = pinkConfigSchema.parse(JSON.parse(JSON.stringify({ ...emptyPinkConfig(), stickers: layerSticker(items, "mobile-only", "mobile", true) })));
    const preview = parsePinkPreview({ protocol: PREVIEW_PROTOCOL, type: "draft", sequence: 3, config }, "http://localhost:3005");
    expect(preview.success && preview.data.config.stickers).toEqual(config.stickers);
    const away = templateSwitchDraft({ templateKey: "y2k", templateVersion: 1, draftConfig: config, templateConfigs: {} }, "bella", 1);
    const back = templateSwitchDraft({ templateKey: "bella", templateVersion: 1, draftConfig: away.config, templateConfigs: away.snapshots }, "y2k", 1);
    const restored = pinkConfigSchema.parse(back.config).stickers;
    expect(stickersForViewport(restored, "mobile").map(item => item.id)).toEqual(["mobile-only"]);
    expect(stickersForViewport(restored, "desktop").map(item => item.id)).toEqual(["desktop-only"]);
  });
  it("requires a valid transform and a trusted iframe source for reverse preview messages", () => {
    const child = {} as MessageEventSource, origin = "https://www.puragenda.cl";
    expect(trustedPreviewSender({ origin, source: child }, child, origin)).toBe(true);
    expect(trustedPreviewSender({ origin: "https://evil.test", source: child }, child, origin)).toBe(false);
    expect(trustedPreviewSender({ origin, source: {} as MessageEventSource }, child, origin)).toBe(false);
    const message = { protocol: PREVIEW_PROTOCOL, type: "sticker-edit", id: "bow-1", viewport: "mobile", action: "move" };
    expect(stickerEditMessageSchema.safeParse(message).success).toBe(false);
    expect(stickerEditMessageSchema.safeParse({ ...message, placement: newSticker("pink-bow", "bow-1").mobile }).success).toBe(true);
  });
  it("retains uploaded sticker refs and protects them in older snapshots", () => {
    const image = "https://res.cloudinary.com/demo/image/upload/sticker.webp";
    const asset = { id: "asset-sticker", publicId: "sticker", secureUrl: image, width: 200, height: 200, bytes: 3000, format: "webp" as const };
    const config = { ...emptyPinkConfig(), stickers: [newSticker("custom", "my-sticker", image)], mediaAssets: [asset] };
    expect(mediaUrls(config)).toContain(image);
    expect(referencedAssets(config)).toEqual([asset]);
    expect(storedMediaUrls({ "y2k@1": config })).toContain(image);
  });
});
