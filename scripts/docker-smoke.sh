#!/bin/sh
# Builds the Railway image and checks it the way Railway will, including a real
# login. Local only: the port is published on 127.0.0.1 and the container is
# removed on any exit. Run from the repo root: pnpm docker:smoke
set -eu
IMG=founderos-smoke; NAME=founderos-smoke-run; PORT=${SMOKE_PORT:-14100}; PW=smoke-pass-$$
cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker build -t "$IMG" .
# Same format and parameters as hashPassword in lib/auth.ts: scrypt:N:r:p:salt:key.
HASH=$(PW="$PW" node -e "const c=require('crypto');const s=c.randomBytes(16);const k=c.scryptSync(process.env.PW,s,32,{N:16384,r:8,p:1});console.log(['scrypt',16384,8,1,s.toString('hex'),k.toString('hex')].join(':'))")
SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
docker rm -f "$NAME" >/dev/null 2>&1 || true
# Mirrors the Railway service variables; PORT is what Railway injects.
docker run -d --name "$NAME" -p "127.0.0.1:$PORT:$PORT" -e "PORT=$PORT" -e GLADOS_HOST=0.0.0.0 \
  -e GLADOS_TRUST_PROXY=1 -e "GLADOS_PASSWORD_HASH=$HASH" -e "GLADOS_SESSION_SECRET=$SECRET" "$IMG" >/dev/null
URL="http://127.0.0.1:$PORT"
i=0; until curl -fsS "$URL/api/health" >/dev/null 2>&1; do
  i=$((i+1))
  if [ "$i" -gt 60 ]; then docker logs "$NAME" 2>&1 | tail -30; echo "FAIL health never came up"; exit 1; fi
  sleep 2
done
# The entrypoint must have copied both variables onto the volume file the gate reads.
docker exec "$NAME" sh -c 'grep -c "^GLADOS_PASSWORD_HASH=scrypt:" "$GLADOS_ENV_LOCAL" && grep -c "^GLADOS_SESSION_SECRET=" "$GLADOS_ENV_LOCAL"' >/dev/null \
  || { echo "FAIL entrypoint did not write the password variables to GLADOS_ENV_LOCAL"; exit 1; }
RAILWAY_URL="$URL" RAILWAY_PASSWORD="$PW" node scripts/verify-railway.mjs
