import { StreamChat } from "stream-chat";
import { ChatCredentials } from "@tomatina/protocol";

/**
 * Stream Chat integration. Chat is instantiated ONLY after a match exists
 * (CLAUDE.md stack rule): the channel is created at mutual reveal, never
 * before. Server-side credentials only; clients receive scoped user
 * tokens. Null when STREAM_API_KEY/STREAM_API_SECRET are absent — the
 * reveal then proceeds without a hosted chat.
 */
const apiKey = process.env.STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;

const stream: StreamChat | null =
  apiKey && apiSecret ? StreamChat.getInstance(apiKey, apiSecret) : null;

if (stream) console.log("stream chat configured");

interface ChatMember {
  userId: string;
  name: string;
}

export async function createBattleChat(
  roomId: string,
  a: ChatMember,
  b: ChatMember,
): Promise<{ a: ChatCredentials; b: ChatCredentials } | null> {
  if (!stream || !apiKey) return null;

  await stream.upsertUsers([
    { id: a.userId, name: a.name },
    { id: b.userId, name: b.name },
  ]);

  const channelId = `battle-${roomId}`;
  const channel = stream.channel("messaging", channelId, {
    members: [a.userId, b.userId],
    created_by_id: a.userId,
  });
  await channel.create();

  return {
    a: { apiKey, token: stream.createToken(a.userId), channelId, userId: a.userId },
    b: { apiKey, token: stream.createToken(b.userId), channelId, userId: b.userId },
  };
}
