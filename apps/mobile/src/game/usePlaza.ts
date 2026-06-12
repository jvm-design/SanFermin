import { useCallback, useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import { Client, Room } from "colyseus.js";
import {
  MatchedInfo,
  MSG_MATCHED,
  MSG_NEARBY,
  MSG_POSITION,
  NearbyInfo,
  PlazaJoinOptions,
  PositionUpdate,
} from "@tomatina/protocol";
import { GAME_SERVER_URL } from "../config";
import { supabase } from "../lib/supabase";

export type PlazaStatus =
  | "permission"
  | "denied"
  | "connecting"
  | "searching"
  | "matched"
  | "error";

export interface UsePlazaResult {
  status: PlazaStatus;
  errorMessage: string | null;
  /** Players active in your zone (excluding you). -1 = unknown yet. */
  nearbyCount: number;
  requestPermission: () => void;
}

/**
 * Opt-in presence + automatic matchmaking. Joining the plaza shares your
 * position with the SERVER ONLY; other players never see it. Leaving the
 * screen (unmount) leaves the room and revokes presence instantly.
 */
export function usePlaza(onMatched: (reservation: unknown) => void): UsePlazaResult {
  const [status, setStatus] = useState<PlazaStatus>("permission");
  const [nearbyCount, setNearbyCount] = useState(-1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const roomRef = useRef<Room | null>(null);
  const watcherRef = useRef<Location.LocationSubscription | null>(null);
  const onMatchedRef = useRef(onMatched);
  onMatchedRef.current = onMatched;
  const [permissionAsked, setPermissionAsked] = useState(0);

  const requestPermission = useCallback(() => setPermissionAsked((c) => c + 1), []);

  useEffect(() => {
    let disposed = false;

    const start = async () => {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (disposed) return;
      if (perm !== "granted") {
        setStatus("denied");
        return;
      }

      setStatus("connecting");
      try {
        let accessToken: string | undefined;
        if (supabase) {
          const { data } = await supabase.auth.getSession();
          accessToken = data.session?.access_token;
        }
        const options: PlazaJoinOptions = { accessToken };
        const room = await new Client(GAME_SERVER_URL).joinOrCreate("plaza", options);
        if (disposed) {
          room.leave();
          return;
        }
        roomRef.current = room;
        setStatus("searching");

        room.onMessage(MSG_NEARBY, (info: NearbyInfo) => {
          setNearbyCount(info.count);
        });
        room.onMessage(MSG_MATCHED, (m: MatchedInfo) => {
          setStatus("matched");
          onMatchedRef.current(m.reservation);
        });
        room.onLeave(() => {
          if (!disposed) {
            setStatus((s) => (s === "matched" ? s : "error"));
            setErrorMessage("Lost connection to the plaza.");
          }
        });

        // Stream our own position to the server. Never broadcast.
        watcherRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 10_000,
            distanceInterval: 10,
          },
          (loc) => {
            const update: PositionUpdate = {
              lat: loc.coords.latitude,
              lng: loc.coords.longitude,
              accuracyM: loc.coords.accuracy ?? 50,
            };
            roomRef.current?.send(MSG_POSITION, update);
          },
        );
      } catch (err) {
        if (!disposed) {
          setStatus("error");
          setErrorMessage(
            err instanceof Error && err.message === "account_required"
              ? "You need an anonymous avatar (account) to play nearby."
              : err instanceof Error
                ? err.message
                : "Could not reach the game server.",
          );
        }
      }
    };
    start();

    return () => {
      disposed = true;
      // Instant presence revocation (invariant 3).
      watcherRef.current?.remove();
      watcherRef.current = null;
      roomRef.current?.leave();
      roomRef.current = null;
    };
  }, [permissionAsked]);

  return { status, errorMessage, nearbyCount, requestPermission };
}
