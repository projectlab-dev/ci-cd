ARG NODE_VERSION=20

FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json tsconfig.test.json ./
COPY src ./src
COPY test ./test

RUN npm run test
RUN npm run build

FROM node:${NODE_VERSION}-alpine AS runtime
WORKDIR /app

ARG SERVICE_NAME=landing
ARG APP_VERSION=local
ARG NODE_ENV=production

ENV NODE_ENV=${NODE_ENV}
ENV SERVICE_NAME=${SERVICE_NAME}
ENV APP_VERSION=${APP_VERSION}
ENV PORT=3000

COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/server.js"]
