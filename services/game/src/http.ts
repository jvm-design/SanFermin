import { IncomingMessage, ServerResponse } from "node:http";
import { chatConfigured, sendImageMessage } from "./chat";
import { moderateImage, moderationEnabled } from "./moderation";
import { supabase } from "./supabase";

/** Storage bucket holding chat media (created by migration 0002). */
const BUCKET = "chat-media";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
/** Approved media is served via signed URLs with this lifetime. */
const SIGNED_URL_TTL_S = 7 * 24 * 3600;

/** Media requires storage+auth (supabase), delivery (stream) AND moderation. */
function mediaEnabled(): boolean {
  return moderationEnabled && chatConfigured && supabase !== null;
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > 4096) throw new Error("body_too_large");
    chunks.push(chunk as Buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
}

async function authenticate(req: IncomingMessage): Promise<string | null> {
  if (!supabase) return null;
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  const { data, error } = await supabase.auth.getUser(header.slice(7));
  if (error || !data.user) return null;
  return data.user.id;
}

/**
 * Moderated media pipeline (invariant 5):
 * 1. the client uploaded the image to its own quarantine/ folder (storage
 *    RLS allows nothing else, and nobody can read quarantine);
 * 2. POST /media/moderate: the server downloads it, runs moderation, and
 *    only on approval moves it to approved/, signs a URL and posts it to
 *    the Stream channel as the sender. Rejected files are deleted.
 * Delivery is pull-based on the client (tap to view, never auto-shown).
 */
async function handleModerate(req: IncomingMessage, res: ServerResponse) {
  if (!mediaEnabled() || !supabase) {
    json(res, 503, { error: "media_unavailable" });
    return;
  }
  const userId = await authenticate(req);
  if (!userId) {
    json(res, 401, { error: "unauthorized" });
    return;
  }

  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(req);
  } catch {
    json(res, 400, { error: "bad_request" });
    return;
  }
  const path = body.path;
  const channelId = body.channelId;
  if (
    typeof path !== "string" ||
    typeof channelId !== "string" ||
    !path.startsWith(`quarantine/${userId}/`) || // only YOUR quarantine
    path.includes("..")
  ) {
    json(res, 400, { error: "bad_request" });
    return;
  }

  const download = await supabase.storage.from(BUCKET).download(path);
  if (download.error || !download.data) {
    json(res, 404, { error: "not_found" });
    return;
  }
  const bytes = new Uint8Array(await download.data.arrayBuffer());
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    await supabase.storage.from(BUCKET).remove([path]);
    json(res, 413, { error: "too_large" });
    return;
  }

  const verdict = await moderateImage(bytes);
  if (!verdict.allowed) {
    await supabase.storage.from(BUCKET).remove([path]);
    console.log(`media rejected (${verdict.reason}) for user ${userId}`);
    json(res, 200, { allowed: false });
    return;
  }

  const approvedPath = path.replace(/^quarantine\//, "approved/");
  const move = await supabase.storage.from(BUCKET).move(path, approvedPath);
  if (move.error) {
    json(res, 500, { error: "storage_error" });
    return;
  }
  const signed = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(approvedPath, SIGNED_URL_TTL_S);
  if (signed.error || !signed.data) {
    json(res, 500, { error: "storage_error" });
    return;
  }

  try {
    await sendImageMessage(channelId, userId, signed.data.signedUrl);
  } catch (err) {
    json(res, 403, { error: (err as Error).message });
    return;
  }
  json(res, 200, { allowed: true });
}

/**
 * Attached alongside Colyseus' own request listener: we only answer the
 * routes Colyseus ignores. Never touch /matchmake.
 */
export function mediaRequestHandler(req: IncomingMessage, res: ServerResponse) {
  const url = req.url ?? "";
  if (url === "/" && req.method === "GET") {
    json(res, 200, { app: "tomatina-game-server" });
    return;
  }
  if (url === "/media/status" && req.method === "GET") {
    json(res, 200, { enabled: mediaEnabled() });
    return;
  }
  if (url === "/media/moderate" && req.method === "POST") {
    handleModerate(req, res).catch((err) => {
      console.error(`media error: ${(err as Error).message}`);
      if (!res.headersSent) json(res, 500, { error: "internal" });
    });
    return;
  }
  // anything else: leave it to Colyseus' listener
}
