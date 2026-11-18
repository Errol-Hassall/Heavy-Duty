# syntax=docker/dockerfile:1

# ---- build ---------------------------------------------------------------
FROM oven/bun:1-alpine AS build
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# ---- runtime -------------------------------------------------------------
FROM oven/bun:1-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    DATABASE_PATH=/data/heavy-duty.db

# The bun user (UID 1000) ships in the oven/bun image.
RUN mkdir -p /data \
  && chown -R bun:bun /data

COPY --from=build --chown=bun:bun /app/.output ./.output

USER bun
EXPOSE 3000
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/" > /dev/null || exit 1

CMD ["bun", ".output/server/index.mjs"]
