# PBL Project â€“ DevOps CA2

## Team

| Name | PRN |
|---|---|
| Om Ghule | 23070122154 |
| Dhruv Gangurde | 23070122091 |
| Lakshya Jain | 23070122124 |
| Aman Srivastava | 23070122024 |


Service used: `backend/` (Express + MongoDB auth API). Frontend unchanged.

## 0. One-time fix (required)
```bash
cd backend && npm install      # adds prom-client and updates package-lock.json (CI uses npm ci)
npm test
```
**Security:** `backend/.env` contains real credentials â€“ it is now git-ignored. Run `git rm --cached backend/.env` and rotate the MongoDB password/JWT secret if it was ever pushed.

## Step 1 â€“ Pipeline
`.github/workflows/ci-cd.yml`; diagram in `docs/pipeline-diagram.md`. Push to GitHub, open the Actions tab, screenshot green run.

## Step 2 â€“ Ansible (use WSL/Linux)
```bash
sudo apt install ansible -y
cd ansible && ansible-playbook site.yml --ask-become-pass
```

## Step 3 â€“ Docker & Kubernetes (Docker Desktop + kind or minikube)
```bash
docker build -t pbl-backend:v1 backend
kind create cluster            # or: minikube start
kind load docker-image pbl-backend:v1
kubectl apply -f k8s/namespace.yaml
kubectl -n pbl create secret generic backend-secret --from-literal=MONGO_URI=mongodb://mongo:27017/pbl --from-literal=JWT_SECRET=dev-secret
kubectl apply -f k8s/mongo.yaml
sed "s#IMAGE_PLACEHOLDER#pbl-backend:v1#" k8s/deployment.yaml | kubectl apply -f -
kubectl apply -f k8s/service.yaml
kubectl -n pbl get pods
cd k8s && ./rolling-update-demo.sh      # rolling update + rollback (screenshot output)
```
(Windows PowerShell: replace `sed` by manually editing the image in deployment.yaml.)

## Step 4 â€“ Monitoring
```bash
docker compose up -d --build
bash monitoring/load.sh
```
Prometheus http://localhost:9090/targets, Grafana http://localhost:3001 (admin/admin) -> dashboard "PBL Backend". Screenshot into `docs/screenshots/`.

## Step 5 â€“ Report
`docs/report.md` and `docs/slides.md`.

## Push
```bash
git init && git add . && git commit -m "DevOps CA2" 
git remote add origin https://github.com/aditisharmas11/DevOps-CA2_2023_27
git push -u origin main
```
(Confirm with your instructor whether to push into a subfolder/branch of that shared repo, e.g. `Group_X/`.)

Working CI/CD pipeline and full repo: https://github.com/ghuleom/pbl-devops (Actions: https://github.com/ghuleom/pbl-devops/actions)
