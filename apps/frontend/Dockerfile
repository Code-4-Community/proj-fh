FROM node:24-alpine AS build
WORKDIR /app

COPY . .

RUN npm pkg set type=module
RUN npm ci
RUN npx nx build frontend

FROM nginx:1.27-alpine

COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/apps/frontend /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
