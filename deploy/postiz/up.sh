#!/bin/sh
# Local Postiz for FounderOS. Starts nothing unless you pass "up".
#   sh deploy/postiz/up.sh config   validate only (no containers)
#   sh deploy/postiz/up.sh up       start the stack, UI on http://127.0.0.1:4007
#   sh deploy/postiz/up.sh down     stop it (volumes kept)
set -eu
cd "$(dirname "$0")"
SHA=d833d9bfa1ad5174cc37b66de809a62ca70bfc5f   # gitroomhq/postiz-docker-compose, 2026-07-16
RAW=https://raw.githubusercontent.com/gitroomhq/postiz-docker-compose/$SHA
mkdir -p .upstream/dynamicconfig
# fetch NAME DEST SHA256: download to a temp file, verify the hash, only then move into place.
fetch() {
  if [ -s "$2" ] && [ "$(shasum -a 256 "$2" | cut -d' ' -f1)" = "$3" ]; then return 0; fi
  t=$(mktemp); curl -fsSL "$RAW/$1" -o "$t" || { rm -f "$t"; echo "fetch failed: $1"; exit 1; }
  [ "$(shasum -a 256 "$t" | cut -d' ' -f1)" = "$3" ] || { rm -f "$t"; echo "sha256 mismatch for $1: refusing to use it"; exit 1; }
  mv "$t" "$2"
}
fetch docker-compose.yaml .upstream/docker-compose.yaml 6716c1d47054699ee0d6760f30986304659ff3167ea461493568dd21eedbc4fa
fetch dynamicconfig/development-sql.yaml .upstream/dynamicconfig/development-sql.yaml 7bf93f05a292f3fd12605fe0f7df2956ccd88ffedabc134109a75c154a173788
# The secret lives in a 0600 file next to this script (gitignored), so a restart does not lose it.
if [ -z "${POSTIZ_JWT_SECRET:-}" ]; then
  [ -s .secret ] || { umask 077; node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" > .secret; }
  POSTIZ_JWT_SECRET=$(cat .secret); export POSTIZ_JWT_SECRET
fi
# "ports: !override" in override.yaml needs Docker Compose 2.24.4 or newer. Older
# versions would merge the ports and keep upstream's public mapping, so refuse.
V=$(docker compose version --short 2>/dev/null | sed 's/^v//') || V=""
echo "$V" | awk -F'[.-]' '{ok=($1>2)||($1==2&&($2>24||($2==24&&$3>=4))); exit !ok}' || { echo "need docker compose >= 2.24.4, found '${V:-none}'"; exit 1; }
C="docker compose -p postiz -f .upstream/docker-compose.yaml -f override.yaml"
case "${1:-config}" in
  config) $C config --quiet && echo "ok compose valid; published ports:" && $C config | grep -E "host_ip|published" ;;
  up)     $C up -d ;;
  down)   $C down ;;
  *)      echo "usage: up.sh config|up|down"; exit 2 ;;
esac
