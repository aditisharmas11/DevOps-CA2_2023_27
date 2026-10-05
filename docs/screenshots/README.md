# Screenshots

## Already captured (real run, local Prometheus 3.5 + Grafana 12.1 against the API)

| File | Shows |
|---|---|
| `grafana-dashboard.png` | 15 min across v1 → v2: v1 latency spikes, restart, then the fixed v2 (with 1.5 % injected 5xx and 3 % invalid requests) |
| `grafana-steady-state.png` | 5 min of steady traffic on v2: 100 % availability, p95 ≈ 240 ms, error panels |
| `prometheus-targets.png` | Prometheus scraping `airline-api` (UP) |
| `prometheus-alerts.png` | The four alert rules loaded |

## To add after the pipeline / cluster runs

| Step | Capture | How |
|---|---|---|
| 1 | GitHub Actions run with all 5 jobs green | Actions tab → the run → screenshot the job graph |
| 2 | Ansible run + idempotent re-run (`changed=0`) | `ansible` job log, or the `ansible-logs` artifact |
| 3 | `kubectl get pods,svc -n airline` | `k8s-evidence` artifact → `k8s-final-state.txt`, or run locally |
| 3 | Rolling update in progress (old + new ReplicaSets) | `scripts/k8s-rollout-demo.sh` output, step 2 (`kubectl get rs`) |
| 3 | Broken release stuck, then `rollout undo` + `rollout history` | demo output, steps 3–4 (`docs/evidence/k8s-rollout-demo.log`) |
| 3 | Zero-downtime summary (non-200 responses: 0) | last lines of the demo output |
| 4 | Grafana on Kubernetes | `k8s-evidence` artifact → `grafana-k8s.png` |
| 6 | Kaggle submission / leaderboard | see `docs/BONUS.md` |
