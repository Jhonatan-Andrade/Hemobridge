# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json prisma.config.ts nest-cli.json tsconfig*.json ./
COPY prisma ./prisma
COPY src ./src
RUN DATABASE_URL=postgresql://build:build@127.0.0.1/build npm ci --no-audit --no-fund
RUN npm run build

FROM build AS migrations
CMD ["npx", "prisma", "migrate", "deploy"]

FROM build AS production-dependencies
RUN npm prune --omit=dev --ignore-scripts

FROM node:24-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production PORT=3000 API_PREFIX=api
WORKDIR /app
ADD https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem /app/certs/rds-ca.pem
RUN chmod 644 /app/certs/rds-ca.pem
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
