import "server-only";

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, normalize, resolve } from "node:path";
import { getServerEnv, isImageDebugEnabled } from "@/lib/env";

const LOCAL_STORAGE_ROOT = join(process.cwd(), ".data", "uploads");
const PUBLIC_ASSET_PREFIX = "assets";
const TEMP_REFERENCE_PREFIX = "tmp/reference";
const PUBLIC_ASSET_ROUTE = "/api/uploads/assets";
const REMOTE_FETCH_TIMEOUT_MS = 30_000;

type StoredObject = {
  key: string;
  url: string;
  contentType: string;
  byteLength: number;
};

type LocalObject = {
  key: string;
  bytes: Buffer;
  contentType: string;
};

const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const EXTENSION_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function log(level: "info" | "warn" | "error", message: string, data?: unknown) {
  if (!isImageDebugEnabled()) return;

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

function publicUrlForKey(key: string) {
  return `${PUBLIC_ASSET_ROUTE}/${key
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

async function persistBuffer(key: string, bytes: Buffer) {
  const path = localPathForKey(key);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes);
}

export class LocalStorageService {
  async saveTemporaryReferenceImage(input: {
    bytes: Buffer;
    contentType: string;
  }): Promise<StoredObject> {
    const key = `${TEMP_REFERENCE_PREFIX}/${crypto.randomUUID()}${extensionForContentType(input.contentType)}`;
    await persistBuffer(key, input.bytes);
    log("info", "Saved temporary reference image", {
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

  async readObject(key: string): Promise<LocalObject> {
    const bytes = await readFile(localPathForKey(key));
    return {
      key,
      bytes,
      contentType: contentTypeForKey(key),
    };
  }

  async savePublicAsset(input: {
    category: string;
    bytes: Buffer;
    contentType: string;
    fileNameHint?: string;
  }): Promise<StoredObject> {
    const extension =
      extname(input.fileNameHint ?? "").toLowerCase() || extensionForContentType(input.contentType);
    const key = `${PUBLIC_ASSET_PREFIX}/${sanitizeSegment(input.category)}/${crypto.randomUUID()}${extension}`;
    await persistBuffer(key, input.bytes);
    const url = publicUrlForKey(key);

    log("info", "Persisted public asset", {
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

  async persistRemoteImage(input: {
    sourceUrl: string;
    category: string;
  }): Promise<StoredObject> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REMOTE_FETCH_TIMEOUT_MS);
    const response = await fetch(input.sourceUrl, {
      cache: "no-store",
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));
    if (!response.ok) {
      throw new Error(`Failed to download generated image: ${response.status}`);
    }

    const contentType = response.headers.get("content-type") ?? "image/png";
    const bytes = Buffer.from(await response.arrayBuffer());

    return this.savePublicAsset({
      category: input.category,
      bytes,
      contentType,
      fileNameHint: basename(new URL(input.sourceUrl).pathname),
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

  isLocalPublicAssetUrl(url: string) {
    return Boolean(extractLocalAssetKey(url));
  }
}

let storageInstance: LocalStorageService | null = null;

export function getStorageService() {
  if (!storageInstance) {
    storageInstance = new LocalStorageService();
    log("info", "Initialized local storage service", {
      appUrl: getServerEnv().NEXT_PUBLIC_APP_URL ?? "same-origin",
    });
  }

  return storageInstance;
}

export function getPublicAssetContentType(key: string) {
  return contentTypeForKey(key);
}
