Task 4 Monitoring and Logging

Submission: screenshots/01_dashboard_normal.jpg and screenshots/02_dashboard_controlled_errors.jpg.

Prometheus 3.4.0 and Grafana 11.6.0 run locally against the real Lex Orion Streamlit app.
Dashboard: http://127.0.0.1:3000/d/lex-orion-task4
App metrics: http://127.0.0.1:8000/metrics
App: http://127.0.0.1:8501
Prometheus targets: http://127.0.0.1:9090/targets

The dashboard shows application process uptime, health availability, mean HTTP response latency and the percentage of HTTP 4xx/5xx responses. Latency covers HTTP requests, not LLM generation.
Screenshot 01 shows normal operation. Screenshot 02 shows a controlled test using invalid POST requests rejected with HTTP 403. The errors were intentionally generated to verify the error-rate metric.
JSON request logs: logs/app-requests.log (UTC timestamps, method, path, status and latency).

Run start.ps1 in PowerShell to start all three services. Run stop.ps1 to stop them.
Dependencies and downloaded binaries are already installed under runtime and downloads.
