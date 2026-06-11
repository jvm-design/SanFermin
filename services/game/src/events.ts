import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { EventName, GameEvent } from "@tomatina/shared";

/**
 * Kill-gate event sink. Events always go to stdout (Railway logs, local
 * debugging); when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are present
 * in the environment, they are ALSO persisted to the `events` table so
 * both gates are queryable in SQL. Secrets live in server env only.
 */
type Sink = (event: GameEvent) => void;

let supabase: SupabaseClient | null = null;

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (url && serviceRoleKey) {
  supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
  console.log("supabase event sink enabled");
}

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
