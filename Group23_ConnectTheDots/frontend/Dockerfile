# Build context = repo root (needs both frontend/ and nginx/)
# ---------- Stage 1: build React static files ----------
FROM node:20-alpine AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# ---------- Stage 2: serve with Nginx (also the reverse proxy for /api and /storage) ----------
FROM nginx:1.27-alpine
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
