import "server-only";
import { AwsClient } from "aws4fetch";

/**
 * S3-compatible object storage (AWS S3, Cloudflare R2, Supabase Storage, MinIO...).
 * Browsers upload straight to the bucket with a short-lived presigned URL, which avoids
 * serverless request-body limits (4.5 MB on Vercel). The server then downloads the object,
 * trains on it and deletes it.
 */

const PRESIGN_SECONDS = 15 * 60;

export function storageEnabled() {
  return Boolean(
    process.env.S3_ENDPOINT && process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY,
  );
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

/** URL the browser can PUT the file to for the next 15 minutes. */
export async function presignUpload(key: string) {
  const url = new URL(objectUrl(key));
  url.searchParams.set("X-Amz-Expires", String(PRESIGN_SECONDS));
  const signed = await s3().sign(url.toString(), { method: "PUT", aws: { signQuery: true } });
  return signed.url;
}

/** Size in bytes, or null if the object doesn't exist (upload never finished). */
export async function objectSize(key: string): Promise<number | null> {
  const res = await s3().fetch(objectUrl(key), { method: "HEAD" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Storage HEAD failed (${res.status})`);
  return Number(res.headers.get("content-length") ?? 0);
}

export async function downloadObject(key: string): Promise<Buffer> {
  const res = await s3().fetch(objectUrl(key));
  if (!res.ok) throw new Error(`Storage GET failed (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

export async function deleteObject(key: string) {
  const res = await s3().fetch(objectUrl(key), { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new Error(`Storage DELETE failed (${res.status})`);
}
