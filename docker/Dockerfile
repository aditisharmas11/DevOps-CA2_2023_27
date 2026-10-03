FROM node:20-alpine

WORKDIR /app

COPY app/package.json app/package-lock.json ./
RUN npm ci --omit=dev

COPY app/ ./

ENV PORT=4000
EXPOSE 4000

USER node

CMD ["node", "server.js"]