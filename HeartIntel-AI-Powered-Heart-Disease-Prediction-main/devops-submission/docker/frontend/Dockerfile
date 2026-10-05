# Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY frontend/heart-disease-app/package*.json ./
RUN npm install
COPY frontend/heart-disease-app/ ./
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
RUN echo 'server { listen 80; location / { root /usr/share/nginx/html; index index.html; try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
