# ============================================================
# Stage 1 — Build React application
# ============================================================
FROM node:22-bookworm-slim AS build

WORKDIR /app

# Frontend build-time configuration
ARG VITE_GOOGLE_CLIENT_ID=""
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}

# Copy frontend package files from the repository root context
COPY frontend/package*.json ./

# Install dependencies
RUN if [ -f package-lock.json ]; then \
        npm ci; \
    else \
        npm install; \
    fi

# Copy frontend source
COPY frontend/ ./

# Build production frontend
RUN npm run build


# ============================================================
# Stage 2 — Serve production build using Nginx
# ============================================================
FROM nginx:alpine

# Copy compiled React application
COPY --from=build /app/dist /usr/share/nginx/html

# IMPORTANT:
# The Docker build context is the MediTwin root,
# therefore nginx.conf is located at frontend/nginx.conf
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]