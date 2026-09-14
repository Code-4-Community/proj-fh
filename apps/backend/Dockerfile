FROM node:24-alpine AS build
WORKDIR /app

COPY . .

RUN npm ci
RUN npx nx build backend

FROM node:24-alpine AS runtime
WORKDIR /app

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist/apps/backend ./dist/apps/backend

ENV PORT=3000
EXPOSE 3000

CMD ["node", "dist/apps/backend/main.js"]
