# CI/CD Workflow

The GitHub Actions workflow at `.github/workflows/ci.yml` runs on pushes and
pull requests targeting `main`.

Pipeline stages:

1. Check out the repository and set up Node.js 20.
2. Install the locked application dependencies with `npm ci`.
3. Check `server.js` syntax with `node --check`.
4. Start the Express app and smoke-test `/`, `/health`, and `/metrics`, including
   the HTTP request and Node.js metrics.
5. Print a deployment simulation message. This confirms the pipeline reached
   its final stage; it does not deploy to Kubernetes or another environment.

To test the same checks locally from the project root:

```bash
cd app
npm ci
node --check server.js
npm start
```

With the app running, verify `/`, `/health`, and `/metrics` at
`http://localhost:4000`. The repository's `npm test` script is currently a
placeholder, so the workflow uses these syntax and endpoint checks instead.