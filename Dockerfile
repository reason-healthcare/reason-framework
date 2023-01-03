FROM node:18-alpine AS builder

WORKDIR /app

COPY packages/cpg-execution/package.json ./packages/cpg-execution/package.json
COPY packages/cds-service/package.json ./packages/cds-service/package.json
COPY package.json ./
COPY tsconfig* ./
RUN npm install

COPY packages ./packages
RUN npm run build

#
# TODO: Work out multistage with a monorepo
#
# FROM node:18-alpine
# WORKDIR /app
# RUN mkdir -p ./packages/cpg-execution
# RUN mkdir -p ./packages/cds-service
# COPY --from=builder *.json ./
# COPY --from=builder /app/node_modules ./node_modules
# COPY --from=builder /app/packages/cpg-execution/package.json ./packages/cpg-execution/package.json
# COPY --from=builder /app/packages/cds-service/package.json ./packages/cds-service/package.json
# COPY --from=builder /app/packages/cpg-execution/node_modules ./packages/cpg-execution/node_modules
# COPY --from=builder /app/packages/cds-service/node_modules ./packages/cds-service/node_modules
# COPY --from=builder /app/packages/cpg-execution/lib ./packages/cpg-execution/lib
# COPY --from=builder /app/packages/cds-service/lib ./packages/cds-service/lib

EXPOSE 9001

WORKDIR /app/packages/cds-service

CMD DEBUG=* node ./lib/server.js