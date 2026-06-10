import { createGameServer } from "./index";

const port = Number(process.env.PORT ?? 2567);

createGameServer()
  .listen(port)
  .then(() => {
    console.log(`tomatina game server listening on :${port}`);
  });
