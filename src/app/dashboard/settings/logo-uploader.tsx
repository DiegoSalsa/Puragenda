"use client";
import { useTranslations } from "next-intl";

import { LocalizedText } from "@/components/i18n/localized-text";

import { useState, useRef } from "react";
import { Upload, Loader2, Trash2, ImageIcon } from "lucide-react";
import { updateBusinessLogoAction, removeBusinessLogoAction } from "@/server/actions/dashboard.actions";
import { useRouter } from "next/navigation";

export function LogoUploader({ currentLogoUrl }: { currentLogoUrl: string | null }) {
  const legacy = useTranslations("legacy");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentLogoUrl);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      setError("Formato no soportado. Usa PNG, JPG, WebP o SVG.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(legacy("w1nTcaJQ0HNf"));
      return;
    }

    // Show local preview
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setError("");
    setSuccess("");

    // Upload to server
    setUploading(true);
    const formData = new FormData();
    formData.append("logo", file);

    const result = await updateBusinessLogoAction(formData);

    if (result.error) {
      setError(result.error);
      setPreview(currentLogoUrl); // revert
    } else {
      setPreview(result.url || preview);
      setSuccess("Logo actualizado correctamente");
      setTimeout(() => setSuccess(""), 3000);
      router.refresh();
    }
    setUploading(false);

    // Reset input so same file can be re-selected
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleRemove() {
    setRemoving(true);
    setError("");
    const result = await removeBusinessLogoAction();
    if (result.error) {
      setError(result.error);
    } else {
      setPreview(null);
      setSuccess("Logo eliminado");
      setTimeout(() => setSuccess(""), 3000);
      router.refresh();
    }
    setRemoving(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:gap-5">
        {/* Logo preview */}
        <div className="relative shrink-0">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-muted">
            {preview ? (
              <img
                src={preview}
                alt={legacy("CSiaYxnzL4rR")}
                className="h-full w-full object-cover"
              />
            ) : (
              <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex min-w-0 w-full flex-col gap-2.5">
          <p className="break-words text-sm text-muted-foreground">
            <LocalizedText id="crHzXhObvPQ1" />
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 rounded-xl bg-[#7C3AED] px-4 h-10 text-sm font-semibold text-white disabled:opacity-50 transition-all hover:bg-[#6D28D9]"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> <LocalizedText id="c1gMCW92MDWd" />
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" /> <LocalizedText id="PZHzA2hgsUm1" />
                </>
              )}
            </button>
            {preview && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={removing || uploading}
                className="flex items-center gap-1.5 rounded-xl border border-red-500/20 px-3 h-10 text-sm text-red-400 disabled:opacity-50 transition-all hover:bg-red-500/10"
              >
                {removing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                <LocalizedText id="yYlM8AL5C9C-" />
              </button>
            )}
          </div>
          <p className="break-words text-[11px] text-muted-foreground">
            <LocalizedText id="C9xH_AWyDoAL" />
          </p>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Feedback */}
      {error && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-400">
          ✓ {success}
        </p>
      )}
    </div>
  );
}
