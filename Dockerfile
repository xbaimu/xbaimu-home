# syntax=docker/dockerfile:1
FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    DATABASE_PATH=/app/data/home.sqlite
COPY --from=build --chown=node:node /app/.next/standalone ./
RUN mkdir -p /app/data /app/.next/cache && chown -R node:node /app/data /app/.next/cache
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const r=require('node:http').get('http://127.0.0.1:'+process.env.PORT+'/',r=>{r.resume();process.exit(r.statusCode===200?0:1)});r.on('error',()=>process.exit(1));r.setTimeout(2000,()=>{r.destroy();process.exit(1)})"
CMD ["node", "server.js"]
