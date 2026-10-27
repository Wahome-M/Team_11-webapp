#!/bin/bash
# Rate-limit demo (Week 9, Part C).
#
# 1. In server/.env set RATE_LIMIT_MAX=3, then restart the server (Ctrl+C, npm start).
# 2. In Git Bash, from the server folder:
#      API_KEY=<your-api-key> bash test-rate-limit.sh | tee rate-limit-demo.txt
#    Expected: 200 200 200 429 429, then the 429 response with its Retry-After header.
# 3. Set RATE_LIMIT_MAX back to 100 in server/.env and restart.

BASE=${BASE:-http://localhost:5000}
if [ -z "$API_KEY" ]; then echo "Set API_KEY first, e.g. API_KEY=<your-api-key> bash test-rate-limit.sh"; exit 1; fi

echo "=== Rate limit demo against $BASE ($(date)) ==="
echo -n "Status codes for 5 quick requests to GET /jobs: "
for i in 1 2 3 4 5; do
  curl -s -o /dev/null -w "%{http_code} " -H "X-API-Key: $API_KEY" "$BASE/jobs"
done
echo
echo
echo "--- Full 6th response (should be 429 with Retry-After and a JSON body) ---"
curl -s -i -H "X-API-Key: $API_KEY" "$BASE/jobs" | grep -iE "^HTTP|^Retry-After|^Content-Type|^\{"
