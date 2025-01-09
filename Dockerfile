FROM node:18-alpine AS build
WORKDIR /app

COPY packages/cpg-execution/package.json ./packages/cpg-execution/package.json
COPY packages/cds-service/package.json ./packages/cds-service/package.json
COPY package.json ./
COPY tsconfig* ./
COPY package-lock.json ./
RUN npm install

COPY . .
RUN npm run build --workspaces --workspace packages/cpg-execution --workspace packages/cds-service

# FROM node:18-alpine AS runtime
# WORKDIR /app
# COPY --from=build /app/packages/cpg-execution/lib packages/cpg-execution/lib
# COPY --from=build /app/packages/cds-service/lib packages/cds-service/lib
# COPY package.json package-lock.json ./
# RUN npm install
# RUN ls node_modules/fastify

EXPOSE 9001

WORKDIR /app/packages/cds-service

CMD DEBUG=* node ./lib/server.js