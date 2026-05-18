import { notFoundResponse } from "@/lib/errors";
import { getLocalStorageService, getPublicAssetContentType } from "@/lib/storage-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const key = path.join("/");

  try {
    const object = await getLocalStorageService().readObject(key);
    return new Response(Uint8Array.from(object.bytes), {
      headers: {
        "Content-Type": getPublicAssetContentType(key),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return notFoundResponse("资源不存在。");
  }
}
