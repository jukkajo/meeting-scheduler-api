FROM node:24-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM gcr.io/distroless/nodejs24-debian13:nonroot AS runtime

WORKDIR /app

COPY --from=build --chown=nonroot:nonroot /app/package.json ./package.json
COPY --from=build --chown=nonroot:nonroot /app/dist/src ./dist/src
COPY --chown=nonroot:nonroot data ./data

USER nonroot

EXPOSE 8080

CMD ["dist/src/server.js"]
