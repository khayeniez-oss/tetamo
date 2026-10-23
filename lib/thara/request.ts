import { HttpError } from "./service";
export async function readJson(req: Request, maxBytes: number): Promise<unknown> {
  if (!req.headers.get("content-type")?.includes("application/json")) throw new HttpError(415, "JSON required");
  if (Number(req.headers.get("content-length") || 0) > maxBytes) throw new HttpError(413, "Request too large");
  const reader = req.body?.getReader();
  if (!reader) throw new HttpError(400, "JSON body required");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new HttpError(413, "Request too large"); }
      chunks.push(value);
    }
    try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch { throw new HttpError(400, "Invalid JSON"); }
  } finally { reader.releaseLock(); }
}
