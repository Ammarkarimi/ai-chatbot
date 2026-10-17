import "server-only";
import { AwsClient } from "aws4fetch";
import { BlobNotFoundError, del, get, head } from "@vercel/blob";

/**
 * Where browsers upload large files so they never pass through a serverless function
 * (Vercel caps request bodies at 4.5 MB). The server then downloads the file, trains on it
 * and deletes it, so storage only ever holds files for a few seconds.
 *
 * - "vercel-blob": a *private* Vercel Blob store (set BLOB_READ_WRITE_TOKEN). Best on Vercel.
 * - "s3": any S3-compatible bucket (Cloudflare R2, AWS S3, Supabase, MinIO). Best elsewhere.
 * - "none": files are sent through the app itself (fine for self-hosting, 4 MB cap on Vercel).
 */
export type StorageMode = "vercel-blob" | "s3" | "none";

const PRESIGN_SECONDS = 15 * 60;

export function storageMode(): StorageMode {
  if (process.env.BLOB_READ_WRITE_TOKEN) return "vercel-blob";
  if (
    process.env.S3_ENDPOINT &&
    process.env.S3_BUCKET &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY
  ) {
    return "s3";
  }
  return "none";
}

export function storageEnabled() {
  return storageMode() !== "none";
}

let client: AwsClient | null = null;
function s3() {
  client ??= new AwsClient({
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    region: process.env.S3_REGION || "auto",
    service: "s3",
  });
  return client;
}

function objectUrl(key: string) {
  const endpoint = process.env.S3_ENDPOINT!.replace(/\/$/, "");
  const path = key.split("/").map(encodeURIComponent).join("/");
  if (process.env.S3_VIRTUAL_HOSTED === "true") {
    const url = new URL(endpoint);
    url.hostname = `${process.env.S3_BUCKET}.${url.hostname}`;
    return `${url.origin}/${path}`;
  }
  return `${endpoint}/${process.env.S3_BUCKET}/${path}`;
}

/** S3 mode: URL the browser can PUT the file to for the next 15 minutes. */
export async function presignUpload(key: string) {
  const url = new URL(objectUrl(key));
  url.searchParams.set("X-Amz-Expires", String(PRESIGN_SECONDS));
  const signed = await s3().sign(url.toString(), { method: "PUT", aws: { signQuery: true } });
  return signed.url;
}

/** Size in bytes, or null if the object doesn't exist (upload never finished). */
export async function objectSize(key: string): Promise<number | null> {
  if (storageMode() === "vercel-blob") {
    try {
      return (await head(key)).size;
    } catch (err) {
      if (err instanceof BlobNotFoundError) return null;
      throw err;
    }
  }
  const res = await s3().fetch(objectUrl(key), { method: "HEAD" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Storage HEAD failed (${res.status})`);
  return Number(res.headers.get("content-length") ?? 0);
}

export async function downloadObject(key: string): Promise<Buffer> {
  if (storageMode() === "vercel-blob") {
    const result = await get(key, { access: "private", useCache: false });
    if (!result?.stream) throw new Error("Blob not found");
    return Buffer.from(await new Response(result.stream).arrayBuffer());
  }
  const res = await s3().fetch(objectUrl(key));
  if (!res.ok) throw new Error(`Storage GET failed (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

export async function deleteObject(key: string) {
  if (storageMode() === "vercel-blob") return del(key);
  const res = await s3().fetch(objectUrl(key), { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new Error(`Storage DELETE failed (${res.status})`);
}
