# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
COPY packages/cds-service/package.json ./packages/cds-service/package.json
COPY packages/cpg-execution/package.json ./packages/cpg-execution/package.json
COPY packages/cpg-review/package.json ./packages/cpg-review/package.json
COPY packages/cpg-test-support/package.json ./packages/cpg-test-support/package.json

RUN npm ci

FROM deps AS build
WORKDIR /app

COPY packages/cpg-review ./packages/cpg-review

RUN npm run build --workspace @reason-framework/cpg-review

FROM node:22-alpine AS runtime
WORKDIR /app

ENV HOSTNAME=0.0.0.0
ENV CPG_REVIEW_DOCKER_HOST_INTERNAL=host.docker.internal
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV PORT=3000

RUN apk add --no-cache poppler-utils

COPY --from=build /app/packages/cpg-review/.next/standalone ./
COPY --from=build /app/packages/cpg-review/.next/static ./packages/cpg-review/.next/static
COPY --from=build /app/packages/cpg-review/public ./packages/cpg-review/public

EXPOSE 3000

WORKDIR /app/packages/cpg-review

CMD ["node", "server.js"]
