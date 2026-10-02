/** Conservative inspection of snapshots, including older or partially invalid configs. */
export function storedMediaUrls(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const urls: string[] = [];
  for (const [key, item] of Object.entries(value)) {
    if (["image", "heroImage", "aboutImage", "logo", "favicon", "socialImage"].includes(key) && typeof item === "string" && item) urls.push(item);
    else if (item && typeof item === "object" && key !== "mediaAssets") urls.push(...storedMediaUrls(item));
  }
  return urls;
}
