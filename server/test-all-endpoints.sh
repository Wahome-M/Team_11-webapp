#!/bin/bash
# Tests every FundiLink API endpoint: good requests AND bad ones.
#
# 1. Start the API in one terminal:  cd server && npm start
# 2. In a second terminal (Git Bash on Windows), from the server folder:
#      bash test-all-endpoints.sh
#    Different port? (e.g. Mac on 5001):  BASE=http://localhost:5001 bash test-all-endpoints.sh
#    Save results as evidence:            bash test-all-endpoints.sh | tee test-all-results.txt
#
# Safe to run more than once: it creates its own test records and deletes the test user at the end.

BASE=${BASE:-http://localhost:5000}
PASS=0; FAIL=0
STAMP=$(date +%s)
EMAIL="test$STAMP@example.com"

# json_field <json> <field> : print one field from a JSON object (uses node, which you already have)
json_field() {
  node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const v=JSON.parse(d)[process.argv[1]];console.log(v===undefined?'':v)}catch{console.log('')}})" "$2" <<< "$1"
}

# check <label> <expected status> <method> <path> [json body]
check() {
  local label="$1" expected="$2" method="$3" path="$4" data="$5" out
  if [ -n "$data" ]; then
    out=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE$path" -H "Content-Type: application/json" -d "$data")
  else
    out=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE$path")
  fi
  STATUS=$(echo "$out" | tail -n1)
  BODY=$(echo "$out" | sed '$d')
  if [ "$STATUS" = "$expected" ]; then
    PASS=$((PASS+1)); echo "[PASS] $label -> $STATUS"
  else
    FAIL=$((FAIL+1)); echo "[FAIL] $label -> got $STATUS, expected $expected"
  fi
  [ -n "$BODY" ] && echo "       ${BODY:0:200}"
}

echo "=== FundiLink endpoint tests against $BASE ($(date)) ==="
if ! curl -s -o /dev/null "$BASE/"; then
  echo "Cannot reach $BASE. Is the server running (npm start)? Wrong port? Set BASE=..."
  exit 1
fi

echo; echo "--- Jobs ---"
check "GET /jobs (browse)"                       200 GET  "/jobs"
check "GET /jobs?category=plumbing (filter)"     200 GET  "/jobs?category=plumbing"
check "POST /jobs (valid)"                       201 POST "/jobs" '{"title":"Test job","category":"painting","location":"Kilimani, Nairobi","pay":2000,"employerId":2}'
JOB_ID=$(json_field "$BODY" id)
check "POST /jobs missing title"                 400 POST "/jobs" '{"category":"painting","location":"Kilimani","pay":2000}'
check "POST /jobs pay as string"                 400 POST "/jobs" '{"title":"x","category":"p","location":"k","pay":"2000"}'
check "POST /jobs employerId doesn't exist"      400 POST "/jobs" '{"title":"x","category":"p","location":"k","pay":20,"employerId":99999}'
check "POST /jobs malformed JSON"                400 POST "/jobs" '{"title": "Fix sink",'
check "GET /jobs/1/bookings"                     200 GET  "/jobs/1/bookings"
check "GET /jobs/99999/bookings (no such job)"   404 GET  "/jobs/99999/bookings"

echo; echo "--- Bookings ---"
check "POST /bookings (apply to new job)"        201 POST "/bookings" "{\"jobId\":${JOB_ID:-1},\"workerId\":4,\"workerName\":\"Brian Otieno\"}"
BOOKING_ID=$(json_field "$BODY" id)
check "GET /bookings/{id}"                       200 GET  "/bookings/${BOOKING_ID:-1}"
check "PUT /bookings/{id} confirm"               200 PUT  "/bookings/${BOOKING_ID:-1}" '{"status":"confirmed"}'
check "PUT /bookings/{id} same again (idempotent)" 200 PUT "/bookings/${BOOKING_ID:-1}" '{"status":"confirmed"}'
check "PUT /bookings/{id} invalid status"        400 PUT  "/bookings/${BOOKING_ID:-1}" '{"status":"banana"}'
check "PUT /bookings/99999 (no such booking)"    404 PUT  "/bookings/99999" '{"status":"confirmed"}'
check "POST /bookings empty body"                400 POST "/bookings" '{}'
check "POST /bookings job doesn't exist"         404 POST "/bookings" '{"jobId":99999,"workerId":1}'
check "GET /bookings/99999 (no such booking)"    404 GET  "/bookings/99999"

echo; echo "--- Users ---"
check "GET /users (all)"                         200 GET  "/users"
check "GET /users?role=worker&verified=true"     200 GET  "/users?role=worker&verified=true"
check "GET /users/1"                             200 GET  "/users/1"
check "GET /users/99999 (no such user)"          404 GET  "/users/99999"
check "POST /users (register)"                   201 POST "/users" "{\"firstName\":\"Test\",\"lastName\":\"User\",\"email\":\"$EMAIL\",\"password\":\"secret1\",\"role\":\"worker\",\"trade\":\"painting\",\"location\":\"South B, Nairobi\"}"
USER_ID=$(json_field "$BODY" id)
check "POST /users same email again"             409 POST "/users" "{\"firstName\":\"Test\",\"lastName\":\"User\",\"email\":\"$EMAIL\",\"password\":\"secret1\",\"role\":\"worker\"}"
check "POST /users missing fields"               400 POST "/users" '{"firstName":"Test"}'
check "POST /users/login (correct)"              200 POST "/users/login" "{\"email\":\"$EMAIL\",\"password\":\"secret1\"}"
check "POST /users/login (wrong password)"       401 POST "/users/login" "{\"email\":\"$EMAIL\",\"password\":\"wrong\"}"
check "POST /users/login (missing password)"     400 POST "/users/login" "{\"email\":\"$EMAIL\"}"
check "PUT /users/{id} (update)"                 200 PUT  "/users/${USER_ID:-0}" "{\"firstName\":\"Test\",\"lastName\":\"User\",\"email\":\"$EMAIL\",\"role\":\"worker\",\"location\":\"South C, Nairobi\",\"verified\":true}"
check "PUT /users/{id} missing fields"           400 PUT  "/users/${USER_ID:-0}" '{"firstName":"Test"}'
check "PUT /users/99999 (no such user)"          404 PUT  "/users/99999" '{"firstName":"A","lastName":"B","email":"nobody@example.com","role":"worker"}'
check "DELETE /users/{id}"                       204 DELETE "/users/${USER_ID:-0}"
check "GET deleted user"                  404 GET  "/users/${USER_ID:-0}"
check "DELETE same user again"            404 DELETE "/users/${USER_ID:-0}"

echo; echo "--- Other ---"
check "Unknown route returns JSON 404"           404 GET  "/nope"

echo
echo "=== $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ]
