FROM fh-base:latest AS build
WORKDIR /app

COPY package.json yarn.lock .yarnrc ./
COPY .yarn ./.yarn


RUN yarn install --immutable

ARG VITE_API_BASE_URL
ARG VITE_COGNITO_USER_POOL_ID
ARG VITE_COGNITO_APP_CLIENT_ID
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_COGNITO_USER_POOL_ID=$VITE_COGNITO_USER_POOL_ID \
    VITE_COGNITO_APP_CLIENT_ID=$VITE_COGNITO_APP_CLIENT_ID

RUN missing=""; \
    for name in VITE_API_BASE_URL VITE_COGNITO_USER_POOL_ID VITE_COGNITO_APP_CLIENT_ID; do \
      eval "value=\${$name}"; \
      [ -n "$(echo "$value" | tr -d '[:space:]')" ] || missing="$missing $name"; \
    done; \
    [ -z "$missing" ] || { echo "Missing frontend build args:$missing" >&2; exit 1; }

COPY . .
RUN npm pkg set type=module
RUN npx nx build frontend

FROM nginx:1.27-alpine

COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/apps/frontend /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
