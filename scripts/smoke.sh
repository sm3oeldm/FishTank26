#!/usr/bin/env bash
# API smoke test against a running dev server with the seeded demo dataset.
set -euo pipefail
BASE="${BASE:-http://localhost:3000}"
J="content-type: application/json"

as() { # as <userId> <method> <path> [json]
  local user="$1" method="$2" path="$3" body="${4:-}"
  if [ -n "$body" ]; then
    curl -s -o /tmp/smoke.out -w "%{http_code}" -X "$method" -H "$J" -b "ch_user=$user" "$BASE$path" -d "$body"
  else
    curl -s -o /tmp/smoke.out -w "%{http_code}" -X "$method" -b "ch_user=$user" "$BASE$path"
  fi
}
expect() { # expect <code> <label>
  local got; got=$(cat /tmp/smoke.code)
  if [ "$got" = "$1" ]; then echo "ok   $1 $2"; else echo "FAIL want $1 got $got  $2"; cat /tmp/smoke.out; echo; exit 1; fi
}
run() { as "$@" > /tmp/smoke.code; }

run u_layla POST /api/demo/reset;                                  expect 200 "reseed"
EP=$(python3 -c 'import json;print(json.load(open("/tmp/smoke.out"))["episodeId"])')
PH=$(python3 -c 'import json;print(json.load(open("/tmp/smoke.out"))["itemIds"]["pharmacy"])')
BT=$(python3 -c 'import json;print(json.load(open("/tmp/smoke.out"))["itemIds"]["bloodTest"])')

run u_khalid GET "/api/episodes/$EP";                              expect 404 "uninvited guessed URL -> 404"
run u_omar   GET "/api/episodes/$EP/document";                     expect 403 "caregiver cannot read raw document"
run u_mariam GET "/api/episodes/$EP/document";                     expect 200 "patient can read raw document"
run u_omar   GET "/api/episodes/$EP";                              expect 200 "caregiver sees plan"
python3 - <<'EOF'
import json; v=json.load(open("/tmp/smoke.out"))
assert all(i["reviewStatus"]=="approved" for i in v["items"]), "caregiver saw non-approved items"
assert all(i["rejectionReason"] is None for i in v["items"])
print("ok   caregiver payload contains approved items only:", len(v["items"]))
EOF

run u_sara  POST "/api/episodes/$EP/items/$PH/transition" '{"event":"accept"}';   expect 403 "non-owner cannot accept"
run u_omar  POST "/api/episodes/$EP/items/$PH/transition" '{"event":"accept"}';   expect 200 "owner accepts"
run u_omar  POST "/api/episodes/$EP/items/$PH/transition" '{"event":"accept"}';   expect 409 "double accept rejected"
run u_omar  POST "/api/episodes/$EP/items/$PH/transition" '{"event":"needs_help","note":"pharmacy closed"}'; expect 200 "needs help"
run u_layla GET  /api/notifications;                                               expect 200 "reviewer notifications"
python3 -c 'import json;n=json.load(open("/tmp/smoke.out"));assert any(x["trigger"]=="needs_help" for x in n);print("ok   needs_help notified reviewer")'
run u_omar  POST "/api/episodes/$EP/items/$PH/transition" '{"event":"resume"}';   expect 200 "resume"

run u_omar  POST /api/demo/clock '{"action":"advance","minutes":180}';           expect 403 "caregiver cannot touch demo clock"
run u_layla POST /api/demo/clock '{"action":"advance","minutes":180}';           expect 200 "advance 3h"
python3 -c 'import json;r=json.load(open("/tmp/smoke.out"));assert r["created"]["overdue"]>=1,r;print("ok   overdue created:",r["created"])'
run u_layla POST /api/scheduler;                                                  expect 200 "scheduler rerun"
python3 -c 'import json;r=json.load(open("/tmp/smoke.out"));assert r["created"]=={"due_soon":0,"overdue":0,"backup_overdue":0},r;print("ok   scheduler idempotent")'
run u_layla POST /api/demo/clock '{"action":"advance","minutes":1440}';          expect 200 "advance +24h"
python3 -c 'import json;r=json.load(open("/tmp/smoke.out"));assert r["created"]["backup_overdue"]>=1,r;print("ok   backup escalation:",r["created"])'
run u_sara  GET  /api/notifications;                                               expect 200 "backup notifications"
python3 -c 'import json;n=json.load(open("/tmp/smoke.out"));assert any(x["trigger"]=="backup_overdue" for x in n);print("ok   backup (Sara) notified")'

run u_omar  POST "/api/episodes/$EP/items/$PH/transition" '{"event":"complete"}'; expect 200 "complete"
run u_omar  POST "/api/episodes/$EP/items/$PH/transition" '{"event":"reopen"}';   expect 403 "caregiver cannot reopen"
run u_layla POST "/api/episodes/$EP/items/$PH/transition" '{"event":"reopen","note":"receipt missing"}'; expect 200 "reviewer reopens"

run u_khalid POST "/api/episodes/$EP/items/$BT/transition" '{"event":"claim"}';  expect 404 "uninvited cannot claim"
run u_sara   POST "/api/episodes/$EP/items/$BT/transition" '{"event":"claim"}';  expect 200 "member claims unclaimed"

run u_layla POST "/api/episodes/$EP/circle" '{"userId":"u_sara"}';               expect 422 "zod validation"
run u_layla DELETE "/api/episodes/$EP/circle" '{"userId":"u_sara"}';             expect 200 "revoke sara"
run u_sara  GET "/api/episodes/$EP";                                              expect 404 "revoked -> 404"

# Consent gate on a fresh episode
run u_layla POST /api/episodes '{"patientName":"Test Patient","dischargedAt":"2026-09-25T10:00:00Z"}'; expect 201 "create episode"
EP2=$(python3 -c 'import json;print(json.load(open("/tmp/smoke.out"))["id"])')
run u_layla POST "/api/episodes/$EP2/document" '{"text":"Book a clinic review within 7 days. If you develop a fever above 38 C, call the ward on 02-555-0000."}'; expect 201 "paste text"
run u_layla POST "/api/episodes/$EP2/document" '{"text":"   "}';                  expect 422 "empty text rejected"
run u_layla POST "/api/episodes/$EP2/extract";                                    expect 200 "extract"
run u_layla POST "/api/episodes/$EP2/items" '{"kind":"action","title":"Fake","text":"Take 500 mg","sourceQuote":"This sentence is not in the document."}'; expect 201 "manual item with bad quote is created as rejected"
python3 -c 'import json;i=json.load(open("/tmp/smoke.out"));assert i["reviewStatus"]=="rejected",i;print("ok   rejected visibly:",i["rejectionReason"])'
run u_layla POST "/api/episodes/$EP2/publish";                                    expect 409 "publish blocked (consent+pending)"
echo "ALL SMOKE CHECKS PASSED"
