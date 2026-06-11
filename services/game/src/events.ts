import { EventName, GameEvent } from "@tomatina/shared";

/**
 * Kill-gate event sink. Phase 2 interim: structured JSON lines on stdout,
 * captured by Railway logs and queryable there; the Supabase sink replaces
 * `write` once the project exists, without touching call sites.
 */
type Sink = (event: GameEvent) => void;

let write: Sink = (event) => {
  console.log(`EVT ${JSON.stringify(event)}`);
};

/** Swap the sink (Supabase insert in Phase 2, in-memory array in tests). */
export function setEventSink(sink: Sink) {
  write = sink;
}

export function logEvent(
  name: EventName,
  fields: Omit<GameEvent, "name" | "ts"> = {},
) {
  write({ name, ts: Date.now(), ...fields });
}
