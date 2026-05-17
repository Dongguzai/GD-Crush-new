import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, normalize, resolve } from "node:path";
import {
  getServerEnv,
  hasR2Config,
  isImageDebugEnabled,
  isVoiceDebugEnabled,
} from "@/lib/env";

const LOCAL_STORAGE_ROOT = join(process.cwd(), ".data", "uploads");
const PUBLIC_ASSET_PREFIX = "assets";
const TEMP_REFERENCE_PREFIX = "tmp/reference";
const TEMP_AUDIO_PREFIX = "tmp/audio";
const PUBLIC_ASSET_ROUTE = "/api/uploads/assets";
const REMOTE_FETCH_TIMEOUT_MS = 30_000;

export type StoredObject = {
  key: string;
  url: string;
  contentType: string;
  byteLength: number;
};

type StoredObjectInput = {
  category: string;
  bytes: Buffer;
  contentType: string;
  fileNameHint?: string;
};

type StoredReferenceInput = {
  bytes: Buffer;
  contentType: string;
};

export type StoredObjectReader = {
  key: string;
  bytes: Buffer;
  contentType: string;
};

export interface StorageService {
  saveTemporaryReferenceImage(input: StoredReferenceInput): Promise<StoredObject>;
  saveTemporaryAudio(input: StoredReferenceInput): Promise<StoredObject>;
  readObject(key: string): Promise<StoredObjectReader>;
  savePublicAsset(input: StoredObjectInput): Promise<StoredObject>;
  persistRemoteImage(input: { sourceUrl: string; category: string }): Promise<StoredObject>;
  deleteObject(key: string): Promise<void>;
  deletePublicAssetByUrl(url: string): Promise<void>;
  getPublicObjectUrl(key: string): string | null;
}

const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "audio/mpeg": ".mp3",
  "audio/mp3": ".mp3",
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
  "audio/ogg": ".ogg",
};

const EXTENSION_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
};

function log(level: "info" | "warn" | "error", message: string, data?: unknown) {
  if (!isImageDebugEnabled() && !isVoiceDebugEnabled()) return;

  const timestamp = new Date().toISOString();
  const prefix = `[Storage-Service] [${timestamp}] [${level.toUpperCase()}]`;

  if (level === "error") {
    console.error(prefix, message, data);
  } else if (level === "warn") {
    console.warn(prefix, message, data);
  } else {
    console.log(prefix, message, data);
  }
}

function extensionForContentType(contentType: string) {
  return MIME_TO_EXTENSION[contentType] ?? ".bin";
}

function contentTypeForKey(key: string) {
  return EXTENSION_TO_MIME[extname(key).toLowerCase()] ?? "application/octet-stream";
}

function sanitizeSegment(segment: string) {
  return segment.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function localPathForKey(key: string) {
  const normalizedKey = normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
  const path = resolve(LOCAL_STORAGE_ROOT, normalizedKey);
  const root = resolve(LOCAL_STORAGE_ROOT);

  if (path !== root && !path.startsWith(`${root}/`)) {
    throw new Error("Invalid storage key.");
  }

  return path;
}

function localPublicUrlForKey(key: string) {
  return `${PUBLIC_ASSET_ROUTE}/${key
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

function r2PublicUrlForKey(publicBaseUrl: string, key: string) {
  return `${publicBaseUrl.replace(/\/$/, "")}/${key
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

function extractLocalAssetKey(url: string) {
  if (!url.startsWith(`${PUBLIC_ASSET_ROUTE}/`)) {
    return null;
  }

  return decodeURIComponent(url.slice(PUBLIC_ASSET_ROUTE.length + 1));
}

function extractR2AssetKey(url: string, publicBaseUrl: string) {
  const normalizedBase = publicBaseUrl.replace(/\/$/, "");
  if (!url.startsWith(`${normalizedBase}/`)) {
    return null;
  }

  return decodeURIComponent(url.slice(normalizedBase.length + 1));
}

function buildObjectKey(category: string, contentType: string, fileNameHint?: string) {
  const extension = extname(fileNameHint ?? "").toLowerCase() || extensionForContentType(contentType);
  return `${PUBLIC_ASSET_PREFIX}/${sanitizeSegment(category)}/${crypto.randomUUID()}${extension}`;
}

async function downloadRemoteBytes(sourceUrl: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REMOTE_FETCH_TIMEOUT_MS);
  const response = await fetch(sourceUrl, {
    cache: "no-store",
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));

  if (!response.ok) {
    throw new Error(`Failed to download remote asset: ${response.status}`);
  }

  return {
    contentType: response.headers.get("content-type") ?? "application/octet-stream",
    bytes: Buffer.from(await response.arrayBuffer()),
    fileNameHint: basename(new URL(sourceUrl).pathname),
  };
}

async function persistLocalBuffer(key: string, bytes: Buffer) {
  const path = localPathForKey(key);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes);
}

export class LocalStorageService implements StorageService {
  async saveTemporaryReferenceImage(input: StoredReferenceInput): Promise<StoredObject> {
    const key = `${TEMP_REFERENCE_PREFIX}/${crypto.randomUUID()}${extensionForContentType(input.contentType)}`;
    await persistLocalBuffer(key, input.bytes);
    log("info", "Saved temporary reference image locally", {
      key,
      byteLength: input.bytes.byteLength,
      contentType: input.contentType,
    });

    return {
      key,
      url: key,
      contentType: input.contentType,
      byteLength: input.bytes.byteLength,
    };
  }

  async saveTemporaryAudio(input: StoredReferenceInput): Promise<StoredObject> {
    const key = `${TEMP_AUDIO_PREFIX}/${crypto.randomUUID()}${extensionForContentType(input.contentType)}`;
    await persistLocalBuffer(key, input.bytes);
    log("info", "Saved temporary audio locally", {
      key,
      byteLength: input.bytes.byteLength,
      contentType: input.contentType,
    });

    return {
      key,
      url: key,
      contentType: input.contentType,
      byteLength: input.bytes.byteLength,
    };
  }

  async readObject(key: string): Promise<StoredObjectReader> {
    const bytes = await readFile(localPathForKey(key));
    return {
      key,
      bytes,
      contentType: contentTypeForKey(key),
    };
  }

  async savePublicAsset(input: StoredObjectInput): Promise<StoredObject> {
    const key = buildObjectKey(input.category, input.contentType, input.fileNameHint);
    await persistLocalBuffer(key, input.bytes);
    const url = localPublicUrlForKey(key);

    log("info", "Persisted local public asset", {
      key,
      url,
      byteLength: input.bytes.byteLength,
      contentType: input.contentType,
    });

    return {
      key,
      url,
      contentType: input.contentType,
      byteLength: input.bytes.byteLength,
    };
  }

  async persistRemoteImage(input: { sourceUrl: string; category: string }): Promise<StoredObject> {
    const remote = await downloadRemoteBytes(input.sourceUrl);
    return this.savePublicAsset({
      category: input.category,
      bytes: remote.bytes,
      contentType: remote.contentType,
      fileNameHint: remote.fileNameHint,
    });
  }

  async deleteObject(key: string) {
    await rm(localPathForKey(key), { force: true });
    log("info", "Deleted local object", { key });
  }

  async deletePublicAssetByUrl(url: string) {
    const key = extractLocalAssetKey(url);
    if (!key) {
      return;
    }

    await this.deleteObject(key);
  }

  getPublicObjectUrl(key: string) {
    void key;
    return null;
  }
}

export class R2StorageService implements StorageService {
  private client: S3Client;
  private bucketName: string;
  private publicBaseUrl: string;

  constructor() {
    const env = getServerEnv();
    if (
      !env.R2_ACCESS_KEY_ID ||
      !env.R2_SECRET_ACCESS_KEY ||
      !env.R2_ENDPOINT ||
      !env.R2_BUCKET_NAME ||
      !env.R2_PUBLIC_BASE_URL
    ) {
      throw new Error("R2 storage is not fully configured");
    }

    this.bucketName = env.R2_BUCKET_NAME;
    this.publicBaseUrl = env.R2_PUBLIC_BASE_URL;
    this.client = new S3Client({
      region: "auto",
      endpoint: env.R2_ENDPOINT,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });
  }

  private async putObject(input: {
    key: string;
    bytes: Buffer;
    contentType: string;
  }) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: input.key,
        Body: input.bytes,
        ContentType: input.contentType,
      }),
    );
  }

  async saveTemporaryReferenceImage(input: StoredReferenceInput): Promise<StoredObject> {
    const key = `${TEMP_REFERENCE_PREFIX}/${crypto.randomUUID()}${extensionForContentType(input.contentType)}`;
    await this.putObject({ key, bytes: input.bytes, contentType: input.contentType });
    const url = r2PublicUrlForKey(this.publicBaseUrl, key);

    log("info", "Saved temporary reference image to R2", {
      key,
      url,
      byteLength: input.bytes.byteLength,
      contentType: input.contentType,
    });

    return {
      key,
      url,
      contentType: input.contentType,
      byteLength: input.bytes.byteLength,
    };
  }

  async saveTemporaryAudio(input: StoredReferenceInput): Promise<StoredObject> {
    const key = `${TEMP_AUDIO_PREFIX}/${crypto.randomUUID()}${extensionForContentType(input.contentType)}`;
    await this.putObject({ key, bytes: input.bytes, contentType: input.contentType });
    const url = r2PublicUrlForKey(this.publicBaseUrl, key);

    log("info", "Saved temporary audio to R2", {
      key,
      url,
      byteLength: input.bytes.byteLength,
      contentType: input.contentType,
    });

    return {
      key,
      url,
      contentType: input.contentType,
      byteLength: input.bytes.byteLength,
    };
  }

  async readObject(key: string): Promise<StoredObjectReader> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
    );

    const bytes = Buffer.from(await response.Body!.transformToByteArray());
    return {
      key,
      bytes,
      contentType: response.ContentType ?? contentTypeForKey(key),
    };
  }

  async savePublicAsset(input: StoredObjectInput): Promise<StoredObject> {
    const key = buildObjectKey(input.category, input.contentType, input.fileNameHint);
    await this.putObject({ key, bytes: input.bytes, contentType: input.contentType });
    const url = r2PublicUrlForKey(this.publicBaseUrl, key);

    log("info", "Persisted R2 public asset", {
      key,
      url,
      byteLength: input.bytes.byteLength,
      contentType: input.contentType,
    });

    return {
      key,
      url,
      contentType: input.contentType,
      byteLength: input.bytes.byteLength,
    };
  }

  async persistRemoteImage(input: { sourceUrl: string; category: string }): Promise<StoredObject> {
    const remote = await downloadRemoteBytes(input.sourceUrl);
    return this.savePublicAsset({
      category: input.category,
      bytes: remote.bytes,
      contentType: remote.contentType,
      fileNameHint: remote.fileNameHint,
    });
  }

  async deleteObject(key: string) {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
    );
    log("info", "Deleted R2 object", { key });
  }

  async deletePublicAssetByUrl(url: string) {
    const r2Key = extractR2AssetKey(url, this.publicBaseUrl);
    if (r2Key) {
      await this.deleteObject(r2Key);
      return;
    }

    const localKey = extractLocalAssetKey(url);
    if (localKey) {
      await getLocalStorageService().deleteObject(localKey);
    }
  }

  getPublicObjectUrl(key: string) {
    return r2PublicUrlForKey(this.publicBaseUrl, key);
  }
}

let storageInstance: StorageService | null = null;
let localStorageInstance: LocalStorageService | null = null;

export function getLocalStorageService() {
  if (!localStorageInstance) {
    localStorageInstance = new LocalStorageService();
  }

  return localStorageInstance;
}

export function getStorageService() {
  if (!storageInstance) {
    storageInstance = hasR2Config() ? new R2StorageService() : getLocalStorageService();
    log("info", "Initialized storage service", {
      provider: storageInstance instanceof R2StorageService ? "r2" : "local",
      appUrl: getServerEnv().NEXT_PUBLIC_APP_URL ?? "same-origin",
    });
  }

  return storageInstance;
}

export function getPublicAssetContentType(key: string) {
  return contentTypeForKey(key);
}
