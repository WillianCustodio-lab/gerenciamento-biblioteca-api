ARG ALPINE_VERSION=3.24

FROM node:24-alpine${ALPINE_VERSION} AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM alpine:${ALPINE_VERSION} AS runtime

RUN apk add --no-cache libstdc++ ca-certificates \
    && addgroup -g 1000 node \
    && adduser -D -u 1000 -G node node

WORKDIR /app

ENV NODE_ENV=production

COPY --from=dependencies /usr/local/bin/node /usr/local/bin/node
COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node migrations ./migrations
COPY --chown=node:node src ./src

USER node

EXPOSE 3000

CMD ["sh", "-c", "node ./node_modules/node-pg-migrate/bin/node-pg-migrate.js up && exec node src/server.js"]