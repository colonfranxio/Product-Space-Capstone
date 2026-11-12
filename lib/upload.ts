import { MEDIA_BUCKET, MEDIA_MAX_BYTES, MEDIA_MIME_TYPES } from "./contract";
import { createClient } from "./supabase/client";

/**
 * Browser upload into the media bucket. `folder` must start with the org id (`<orgId>` or `<orgId>/<eventId>`),
 * which the storage policy enforces. Returns the storage path to save, never the URL.
 */
export async function uploadMedia(file: File, folder: string): Promise<{ path: string } | { error: string }> {
  const bad = checkImage(file);
  if (bad) return { error: bad };
  const path = `${folder}/${crypto.randomUUID()}.${file.type === "image/jpeg" ? "jpg" : file.type.slice(6)}`;
  const { error } = await createClient().storage.from(MEDIA_BUCKET).upload(path, file);
  return error ? { error: error.message } : { path };
}

/** Friendly client-side check before uploading; the bucket enforces the same limits. */
export function checkImage(file: File): string | null {
  if (!(MEDIA_MIME_TYPES as readonly string[]).includes(file.type)) return "Use a JPG, PNG or WebP image.";
  if (file.size > MEDIA_MAX_BYTES) return "That image is over 8 MB. Try a smaller one.";
  return null;
}
