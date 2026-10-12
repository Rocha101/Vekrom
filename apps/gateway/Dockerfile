FROM node:20-alpine AS base
WORKDIR /app/apps/gateway

COPY apps/gateway/package.json ./
RUN npm install --omit=dev 2>/dev/null || npm install --only=production

COPY apps/gateway/tsconfig.json ./
COPY apps/gateway/src ./src
RUN npm install --include=dev && npm run build && npm prune --omit=dev

ENV NODE_ENV=production
ENV PORT=3002
EXPOSE 3002

CMD ["node", "dist/index.js"]
