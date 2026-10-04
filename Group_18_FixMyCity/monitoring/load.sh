#!/usr/bin/env bash
# Generates traffic (incl. some 4xx) so dashboard panels have data.
for i in $(seq 1 300); do
  curl -s localhost:5000/health >/dev/null
  curl -s -X POST localhost:5000/api/login -H 'Content-Type: application/json' -d '{}' >/dev/null
  sleep 0.2
done
