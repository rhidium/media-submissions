FROM node:20-slim AS base
RUN apt-get update -y && apt-get install -y openssl

COPY . /app
WORKDIR /app

FROM base AS prod-deps
RUN npm install --frozen-lockfile --omit=dev

FROM base AS build
RUN npm install --frozen-lockfile
RUN DATABASE_URL=file:/app/prisma/production.db npm run build

FROM base
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=build /app/dist /app/dist
CMD [ "npm", "start" ]