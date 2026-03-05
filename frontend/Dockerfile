FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/rainblet/browser/ /usr/share/nginx/html/

EXPOSE 80
ENV APP_CONFIG_API_BASE_URL=http://localhost:8080


