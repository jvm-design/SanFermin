import { EventName, GameEvent } from "@tomatina/shared";
import { supabase } from "./supabase";

/**
 * Kill-gate event sink. Events always go to stdout (Railway logs, local
 * debugging); when the Supabase service client is configured they are
 * ALSO persisted to the `events` table so both gates are queryable in SQL.
 */
type Sink = (event: GameEvent) => void;

let write: Sink = (event) => {
  console.log(`EVT ${JSON.stringify(event)}`);
  if (supabase) {
    supabase
      .from("events")
      .insert({
        name: event.name,
        ts: new Date(event.ts).toISOString(),
        room_id: event.roomId ?? null,
        session_ids: event.sessionIds ?? null,
        user_ids: event.userIds ?? null,
        props: event.props ?? null,
      })
      .then(({ error }) => {
        if (error) console.error(`event insert failed: ${error.message}`);
      });
  }
};

/** Swap the sink entirely (used by tests). */
export function setEventSink(sink: Sink) {
  write = sink;
}

export function logEvent(
  name: EventName,
  fields: Omit<GameEvent, "name" | "ts"> = {},
) {
  write({ name, ts: Date.now(), ...fields });
}
