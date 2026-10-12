FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY migrations ./migrations
COPY src ./src

EXPOSE 3000

CMD ["sh", "-c", "node ./node_modules/node-pg-migrate/bin/node-pg-migrate.js up && node src/server.js"]
