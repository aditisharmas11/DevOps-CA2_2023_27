#!/usr/bin/env bash
# Generates traffic so the Grafana dashboard has data (Task 4).
# Usage: bash scripts/generate-traffic.sh [base_url] [seconds]
#   base_url defaults to http://localhost (Nginx). For minikube: $(minikube service frontend -n connect-the-dots --url)
BASE=${1:-http://localhost}
DURATION=${2:-300}
END=$((SECONDS + DURATION))
echo "Sending traffic to $BASE for ${DURATION}s ... (Ctrl+C to stop)"

# seed one metadata record so GET /api/metadata returns data
curl -s -X POST "$BASE/api/metadata" -H 'Content-Type: application/json' \
  -d '{"title":"demo","description":"load test seed","filePath":"none"}' > /dev/null || true

while [ $SECONDS -lt $END ]; do
  for _ in 1 2 3 4 5; do curl -s -o /dev/null "$BASE/api/metadata" & done   # cached reads (fast)
  curl -s -o /dev/null "$BASE/api/health" &                                  # touches Mongo+Redis+MinIO
  curl -s -o /dev/null "$BASE/api/get-file?id=does-not-exist" &              # 404 -> shows in 4xx line
  wait
  sleep 0.5
done
echo "Done."
cat <<'TIP'

To make the ERROR-RATE and UPTIME panels move (good screenshots):
  docker compose stop redis      # /api/health now returns 503 -> 5xx error rate rises
  docker compose start redis     # recovers
  docker compose restart backend # 'Backend status' goes DOWN briefly and 'Uptime' resets
TIP
