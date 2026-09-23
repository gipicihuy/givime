#!/usr/bin/env bash
# Smoke test endpoint penting AnimeHub (karanime.com WP REST)
set -u
BASE="${BASE:-https://karanime.com/wp-json/wp/v2}"
fail=0

check() {
  local name="$1" url="$2" expect="${3:-200}"
  local code
  code=$(curl -sS -o /tmp/animehub_smoke_body.json -w "%{http_code}" --max-time 40 "$url" || echo 000)
  local total pages
  total=$(curl -sSI --max-time 20 "$url" 2>/dev/null | tr -d '\r' | awk -F': ' 'tolower($1)=="x-wp-total"{print $2}')
  pages=$(curl -sSI --max-time 20 "$url" 2>/dev/null | tr -d '\r' | awk -F': ' 'tolower($1)=="x-wp-totalpages"{print $2}')
  if [[ "$code" == "$expect" ]]; then
    echo "OK   [$code] $name  total=${total:-n/a} pages=${pages:-n/a}"
  else
    echo "FAIL [$code≠$expect] $name  $url"
    fail=1
  fi
}

echo "Base: $BASE"
check "list ongoing"        "$BASE/animes?animestatus=2872&orderby=modified&order=desc&per_page=3&_fields=id,slug,title,meta_box.ero_image,meta_box.ero_episode"
check "list random"         "$BASE/animes?orderby=rand&order=asc&per_page=3&_fields=id,slug,title"
check "search"              "$BASE/animes?search=naruto&per_page=3&_fields=id,slug,title"
check "detail by id"        "$BASE/animes/75405"
check "detail by slug"      "$BASE/animes?slug=manaria-friends"
check "genres"              "$BASE/animegenre?per_page=100&orderby=id&order=asc"
check "animetype"           "$BASE/animetype?per_page=100"
check "animestatus"         "$BASE/animestatus?per_page=100"
check "animetop"            "$BASE/animetop?per_page=100"
check "jadwalrilis"         "$BASE/jadwalrilis?per_page=100"
check "filter genre"        "$BASE/animes?animegenre=2873&orderby=rand&order=asc&per_page=3&_fields=id,slug,title"
check "filter movie"        "$BASE/animes?animetype=2916&orderby=date&order=desc&per_page=3&_fields=id,slug,title"
check "filter top"          "$BASE/animes?animetop=2901&orderby=modified&order=desc&per_page=3&_fields=id,slug,title"
check "jaddal senin"        "$BASE/animes?jadwalrilis=3058&orderby=title&order=asc&per_page=3&_fields=id,slug,title"
check "page 2"              "$BASE/animes?orderby=id&per_page=3&page=2&_fields=id,slug,title"
check "not found expect404" "$BASE/animes/999999999" 404
check "bad per_page 400"    "$BASE/animes?per_page=101" 400

# sample episode URL probe (first ep of detail 75405)
EP=$(python3 - <<'PY'
import json,urllib.parse,sys
try:
  d=json.load(open('/tmp/animehub_smoke_body.json'))
except Exception:
  d=None
# fetch fresh detail
import subprocess
subprocess.check_call(['curl','-sS','-o','/tmp/animehub_detail.json','--max-time','40',
  'https://karanime.com/wp-json/wp/v2/animes/75405'])
d=json.load(open('/tmp/animehub_detail.json'))
ab=d.get('meta_box',{}).get('ab_cdngroup') or []
if ab:
  print(urllib.parse.quote(ab[0]['ab_linkcdn'], safe=':/'))
PY
)
if [[ -n "${EP:-}" ]]; then
  code=$(curl -sSI -L --max-time 25 -A 'Mozilla/5.0' "$EP" | tr -d '\r' | head -1 | awk '{print $2}')
  echo "video HEAD first status: $code  $EP"
  [[ "$code" == "200" || "$code" == "206" ]] || fail=1
else
  echo "FAIL cannot extract episode url"
  fail=1
fi

if [[ $fail -eq 0 ]]; then echo "ALL PASS"; else echo "SOME FAILED"; exit 1; fi
