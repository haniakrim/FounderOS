# FounderOS image for Railway (or any container host). Node 22, pnpm, next build.
FROM node:22-bookworm-slim AS build
WORKDIR /app
# better-sqlite3 falls back to node-gyp when no prebuilt binary matches.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# Prerender opens the app database. Point it at a throwaway folder so parallel
# build workers never race to create the demo store in the real data folder.
# The display currency is inlined at build time (next.config.mjs), so it is a build argument.
ARG GLADOS_CURRENCY=USD
ENV GLADOS_CURRENCY=$GLADOS_CURRENCY
RUN mkdir -p /tmp/build-data && GLADOS_DATA_DIR=/tmp/build-data GLADOS_DB=/tmp/build-data/glados.db pnpm build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
RUN corepack enable
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    GLADOS_DATA_DIR=/data \
    GLADOS_DB=/data/glados.db
COPY --from=build --chown=node:node /app /app
# /app itself must be writable: the demo store (filming mode) builds demo-data/ and swaps it in.
RUN mkdir -p /data && chown node:node /data /app
# The app's gate reads the password from the env file (lib/auth.ts -> readEnvLocal,
# never process.env), so the entrypoint copies the service variables into
# GLADOS_ENV_LOCAL on the volume, only when the key is absent there, so a
# password changed in the app survives a restart.
ENV GLADOS_ENV_LOCAL=/data/.env.local
COPY <<'SH' /usr/local/bin/entrypoint.sh
#!/bin/sh
set -e
umask 077
f="$GLADOS_ENV_LOCAL"
touch "$f"; chmod 600 "$f"
for k in GLADOS_PASSWORD_HASH GLADOS_SESSION_SECRET; do
  eval "v=\${$k:-}"
  if [ -n "$v" ] && ! grep -q "^$k=" "$f"; then
    printf '%s=%s\n' "$k" "$v" >> "$f"
  fi
done
exec "$@"
SH
RUN chmod +x /usr/local/bin/entrypoint.sh
USER node
# scripts/serve.mjs binds 127.0.0.1 unless GLADOS_HOST is set AND a password
# exists. Set GLADOS_HOST=0.0.0.0, GLADOS_PASSWORD_HASH and GLADOS_SESSION_SECRET
# as service variables; never bake them in. It reads PORT (Railway injects it).
EXPOSE 4100
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "scripts/serve.mjs", "start"]
