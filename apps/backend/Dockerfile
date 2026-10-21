FROM fh-base:latest AS build
#now rebuilds from a preloaded image
WORKDIR /app

COPY package.json yarn.lock .yarnrc ./
COPY .yarn ./.yarn

RUN yarn install --immutable

COPY . .    
RUN npx nx build backend

FROM node:24-alpine AS runtime
WORKDIR /app

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist/apps/backend ./dist/apps/backend

EXPOSE 3000

CMD ["node", "dist/apps/backend/main.js"]
