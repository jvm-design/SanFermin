/**
 * Non-secret client config via Expo public env (CLAUDE.md conventions).
 * Point this at your machine's LAN IP when testing on a real device, e.g.
 * EXPO_PUBLIC_GAME_SERVER_URL=ws://192.168.1.20:2567
 */
export const GAME_SERVER_URL =
  process.env.EXPO_PUBLIC_GAME_SERVER_URL ?? "ws://localhost:2567";

/** Same server, HTTP side (media moderation endpoints). */
export const GAME_SERVER_HTTP_URL = GAME_SERVER_URL.replace(/^ws/, "http");
