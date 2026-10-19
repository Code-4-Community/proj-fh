FROM fh-base:latest AS build
WORKDIR /app

COPY package.json yarn.lock .yarnrc ./
COPY .yarn ./.yarn


RUN yarn install --immutable
COPY . .
RUN npm pkg set type=module
RUN npx nx build frontend

FROM nginx:1.27-alpine

COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/apps/frontend /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
