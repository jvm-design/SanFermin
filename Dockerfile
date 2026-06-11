# Tomatina game server (Colyseus) — built from the repo root so the pnpm
# workspace packages (@tomatina/shared, @tomatina/protocol) are available.
FROM node:22-alpine

WORKDIR /app
RUN corepack enable

# Install with only the manifests first so Docker caches dependencies.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/protocol/package.json packages/protocol/
COPY services/game/package.json services/game/
RUN pnpm install --frozen-lockfile --filter @tomatina/game-server...

# Then the source.
COPY packages ./packages
COPY services/game ./services/game

ENV NODE_ENV=production
EXPOSE 2567
CMD ["pnpm", "--filter", "@tomatina/game-server", "start"]
