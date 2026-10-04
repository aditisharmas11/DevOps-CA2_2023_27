#!/bin/bash
cd "$(dirname "$0")/.."
while true; do
  curl -s -X POST localhost:8000/predict -H "Content-Type: application/json" -d @samples/normal.json >/dev/null
  curl -s -X POST localhost:8000/predict -H "Content-Type: application/json" -d @samples/attack.json >/dev/null
  curl -s localhost:8000/slow >/dev/null
  [ $((RANDOM % 5)) -eq 0 ] && curl -s localhost:8000/error >/dev/null
  sleep 0.3
done