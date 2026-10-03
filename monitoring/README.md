# CA2 Monitoring Integration

The CA2 dashboard is in `ca2-dashboard.json`. In Grafana at
`http://localhost:3001`, choose **Dashboards > New > Import**, upload the JSON,
and select the existing Prometheus data source when prompted. The dashboard has
its own UID (`ca2-devops-monitoring`) and does not replace existing dashboards.

Prometheus scrapes CA2 at `host.docker.internal:4000/metrics`. The scrape job is
in the CA3 Prometheus configuration because the running `ca3-prometheus`
container bind-mounts that file. Keep this port-forward running in a separate
terminal while Prometheus scrapes CA2:

```powershell
kubectl port-forward service/devops-ca2 4000:4000
```

The dashboard displays scrape health, total HTTP requests, request rate by
route, Node.js heap usage, and process resident memory.