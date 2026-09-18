import { supabase } from "@/integrations/supabase/client";

export const SITE_MEDIA_BUCKET = "site-media";
export const APPLICATION_DOCUMENT_BUCKET = "application-documents";

export type UploadedMedia = {
  url: string;
  path: string;
  type: "image" | "video" | "document";
  mimeType: string;
  name: string;
  size: number;
};

export type ApplicationDocument = {
  path: string;
  name: string;
  mimeType: string;
  size: number;
};

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const DOCUMENT_TYPES = ["application/pdf", ...IMAGE_TYPES];

function fileType(file: File): UploadedMedia["type"] {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "document";
}

function safeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "upload";
}

function validateFile(file: File, allowed: string[], maxBytes: number, label: string) {
  if (!allowed.includes(file.type)) {
    throw new Error(`${label} must be ${allowed.map((type) => type.split("/").pop()).join(", ")}.`);
  }
  if (file.size > maxBytes) {
    throw new Error(`${label} must be smaller than ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  }
}

function uniquePath(folder: string, name: string) {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${folder}/${id}-${safeName(name)}`;
}

export async function uploadSiteMedia(file: File, folder: "gallery" | "news" | "news-inline") {
  validateFile(file, [...IMAGE_TYPES, ...VIDEO_TYPES, "application/pdf"], 50 * 1024 * 1024, "Media file");
  const path = uniquePath(folder, file.name);
  const { error } = await supabase.storage.from(SITE_MEDIA_BUCKET).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(SITE_MEDIA_BUCKET).getPublicUrl(path);
  return {
    url: data.publicUrl,
    path,
    type: fileType(file),
    mimeType: file.type,
    name: file.name,
    size: file.size,
  } satisfies UploadedMedia;
}

export async function uploadApplicationDocument(file: File, applicationId: string): Promise<ApplicationDocument> {
  validateFile(file, DOCUMENT_TYPES, 10 * 1024 * 1024, "Supporting document");
  const path = uniquePath(`applications/${applicationId}`, file.name);
  const { error } = await supabase.storage.from(APPLICATION_DOCUMENT_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  return { path, name: file.name, mimeType: file.type, size: file.size };
}

export async function removeSiteMedia(path: string | null | undefined) {
  if (!path) return;
  await supabase.storage.from(SITE_MEDIA_BUCKET).remove([path]);
}

export async function removeApplicationDocuments(documents: ApplicationDocument[]) {
  const paths = documents.map((document) => document.path).filter(Boolean);
  if (paths.length > 0) await supabase.storage.from(APPLICATION_DOCUMENT_BUCKET).remove(paths);
}

export function isVideoMedia(mediaType: string | null | undefined, mimeType?: string | null) {
  return mediaType === "video" || mimeType?.startsWith("video/") === true;
}
