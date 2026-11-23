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

# Starts as root only so the entrypoint can give /data to PUID:PGID, then drops.
RUN apk add --no-cache su-exec \
  && mkdir -p /data \
  && chown -R bun:bun /data

COPY --from=build --chown=bun:bun /app/.output ./.output
COPY --chmod=755 docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/" > /dev/null || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["bun", ".output/server/index.mjs"]
