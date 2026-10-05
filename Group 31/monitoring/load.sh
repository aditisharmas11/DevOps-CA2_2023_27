#!/bin/bash
# Generates traffic (incl. some errors) so the dashboard has data.
for i in $(seq 1 300); do
  curl -s localhost:5000/ >/dev/null
  curl -s localhost:5000/tasks >/dev/null
  [ $((i % 5)) -eq 0 ] && curl -s localhost:5000/error >/dev/null
  sleep 0.2
done
