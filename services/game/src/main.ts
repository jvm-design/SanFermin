import { createGameServer } from "./index";

const port = Number(process.env.PORT ?? 2567);
const simulatedLatencyMs = Number(process.env.SIMULATE_LATENCY_MS ?? 0);

const server = createGameServer();

server.listen(port).then(() => {
  console.log(`tomatina game server listening on :${port}`);
  if (simulatedLatencyMs > 0) {
    // Phase 1 acceptance: behaves acceptably at a simulated 150 ms latency.
    server.simulateLatency(simulatedLatencyMs);
    console.log(`simulating ${simulatedLatencyMs} ms round-trip latency`);
  }
});
