#!/bin/bash
# Part D: verify POST /jobs with good AND bad input.
# Run from the server folder while the server is running:
#   bash test-post-jobs.sh | tee test-results.txt

BASE=${BASE:-http://localhost:5001}
EMPLOYER_ID=2   # change to an id that is an employer in YOUR users table

count_jobs() {
  curl -s "$BASE/jobs" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).length)}catch{console.log('?')}})"
}

check() {
  local label="$1" expected="$2" data="$3"
  local out status body result
  out=$(curl -s -w "\n%{http_code}" -X POST "$BASE/jobs" -H "Content-Type: application/json" -d "$data")
  status=$(echo "$out" | tail -n1)
  body=$(echo "$out" | sed '$d')
  if [ "$status" = "$expected" ]; then result=PASS; else result=FAIL; fi
  echo "[$result] $label -> got $status, expected $expected"
  echo "        $body"
}

echo "=== POST /jobs tests ($(date)) ==="
BEFORE=$(count_jobs)
echo "Active jobs before: $BEFORE"
echo

echo "--- Bad input (all should be rejected with 400) ---"
check "Missing title"               400 "{\"category\":\"plumbing\",\"location\":\"Westlands\",\"pay\":1500,\"employerId\":$EMPLOYER_ID}"
check "Missing pay and employerId"  400 '{"title":"Fix sink","category":"plumbing","location":"Westlands"}'
check "Empty title (spaces only)"   400 "{\"title\":\"   \",\"category\":\"plumbing\",\"location\":\"Westlands\",\"pay\":1500,\"employerId\":$EMPLOYER_ID}"
check "pay as string"               400 "{\"title\":\"Fix sink\",\"category\":\"plumbing\",\"location\":\"Westlands\",\"pay\":\"1500\",\"employerId\":$EMPLOYER_ID}"
check "Negative pay"                400 "{\"title\":\"Fix sink\",\"category\":\"plumbing\",\"location\":\"Westlands\",\"pay\":-50,\"employerId\":$EMPLOYER_ID}"
check "employerId not an integer"   400 '{"title":"Fix sink","category":"plumbing","location":"Westlands","pay":1500,"employerId":"two"}'
check "employerId does not exist"   400 '{"title":"Fix sink","category":"plumbing","location":"Westlands","pay":1500,"employerId":99999}'
check "urgent as string"            400 "{\"title\":\"Fix sink\",\"category\":\"plumbing\",\"location\":\"Westlands\",\"pay\":1500,\"employerId\":$EMPLOYER_ID,\"urgent\":\"yes\"}"
check "Body is an array"            400 '[]'
check "Malformed JSON"              400 '{"title": "Fix sink",'

AFTER_BAD=$(count_jobs)
echo
if [ "$AFTER_BAD" = "$BEFORE" ]; then
  echo "[PASS] No garbage data left behind: still $AFTER_BAD active jobs after rejected requests"
else
  echo "[FAIL] Job count changed from $BEFORE to $AFTER_BAD after rejected requests"
fi
echo

echo "--- Good input (should be created with 201) ---"
check "Valid job, all fields"       201 "{\"title\":\"Fix leaking kitchen sink\",\"category\":\"plumbing\",\"location\":\"Westlands, Nairobi\",\"pay\":1500,\"payType\":\"fixed\",\"urgent\":true,\"duration\":\"~2 hours\",\"employerId\":$EMPLOYER_ID,\"employer\":\"Peter Mwangi\",\"description\":\"Replace the tap washer.\"}"
check "Valid job, required only"    201 "{\"title\":\"Paint gate\",\"category\":\"painting\",\"location\":\"Kilimani\",\"pay\":2000,\"employerId\":$EMPLOYER_ID}"

AFTER_GOOD=$(count_jobs)
echo
if [ "$AFTER_GOOD" = "$((BEFORE + 2))" ]; then
  echo "[PASS] Data actually changed: $BEFORE -> $AFTER_GOOD active jobs (re-fetched with GET /jobs)"
else
  echo "[FAIL] Expected $((BEFORE + 2)) active jobs, found $AFTER_GOOD"
fi