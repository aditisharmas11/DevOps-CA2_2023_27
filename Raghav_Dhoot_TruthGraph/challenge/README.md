# Production Engineering Challenge - TruthGraph

## Challenge

This implementation is based on the Production Engineering Hackathon challenge:

**"Break production - on purpose!"**

The goal is to improve the production readiness of an application by testing its ability to handle load, failures, outages, and recovery.

Challenge source:
https://pe-hackathon.devpost.com/

## Project

TruthGraph is a fact-verification application with a FastAPI backend.

For this DevOps challenge, the TruthGraph backend was deployed using a production-oriented DevOps workflow.

## DevOps Architecture

The implementation includes:

- GitHub Actions for CI/CD
- Docker for containerization
- Kubernetes for deployment and orchestration
- Two backend replicas for availability
- Kubernetes rolling updates
- Readiness and liveness probes
- Prometheus for metrics collection
- Grafana for monitoring
- Load testing
- Failure simulation and automatic recovery testing

## Load Test

A Python-based concurrent load test was created in:

`challenge/load_test.py`

Test configuration:

- Total requests: 500
- Concurrent requests: 25
- Target: TruthGraph Prometheus metrics endpoint

### Results

- Successful requests: 500
- Failed requests: 0
- Success rate: 100%
- Throughput: 361.66 requests/second
- Average latency: 68.63 ms
- Maximum latency: 670.95 ms

This demonstrated that the deployed service was able to respond successfully under concurrent traffic.

## Failure and Recovery Test

A running TruthGraph backend pod was intentionally deleted using Kubernetes.

Kubernetes detected the missing replica and automatically created a replacement pod.

Final deployment state:

- Desired replicas: 2
- Ready replicas: 2
- Up-to-date replicas: 2
- Available replicas: 2

This demonstrated Kubernetes self-healing and automatic recovery from a simulated application failure.

## Monitoring

Prometheus collects metrics from the TruthGraph backend `/metrics` endpoint.

Grafana is used to visualize:

- Application uptime
- HTTP request latency
- HTTP request count
- Error rate

## Conclusion

The Production Engineering challenge demonstrated that TruthGraph can be operated using production-oriented DevOps practices.

The system successfully handled concurrent load and automatically recovered from a simulated Kubernetes pod failure while maintaining two backend replicas.

This implementation was completed as an academic implementation of the published challenge concepts and is not an official submission to the original Devpost event.
