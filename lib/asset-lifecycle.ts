import "server-only";

import type { StorageService } from "@/lib/storage-service";

const STORAGE_DELETE_RETRY_DELAYS_MS = [0, 100, 250, 500];

export const assetLifecyclePolicy = {
  referenceImage: {
    visibility: "temporary",
    deletedAfter: "character_generation",
    requiredAuditEvent: "image_deleted",
  },
  temporarySpeechInput: {
    visibility: "temporary",
    deletedAfter: "stt_completion",
    requiredAuditEvent: null,
  },
  generatedVisualAsset: {
    visibility: "public",
    deletedAfter: "crush_destroy",
    requiredAuditEvent: null,
  },
  generatedTtsOutput: {
    visibility: "public",
    deletedAfter: "crush_destroy",
    requiredAuditEvent: null,
  },
} as const;

async function sleep(ms: number) {
  if (ms > 0) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}

async function retryDelete(operation: () => Promise<void>) {
  let lastError: unknown;

  for (const delay of STORAGE_DELETE_RETRY_DELAYS_MS) {
    await sleep(delay);

    try {
      await operation();
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

export async function deleteStoredObjectWithRetry(storage: StorageService, key: string) {
  await retryDelete(() => storage.deleteObject(key));
}

export async function deletePublicAssetWithRetry(storage: StorageService, url: string) {
  await retryDelete(() => storage.deletePublicAssetByUrl(url));
}
