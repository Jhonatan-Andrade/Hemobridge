FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG VITE_API_URL=/api
ARG VITE_LEGAL_ENTITY_NAME
ARG VITE_PRIVACY_CONTACT
ENV VITE_API_URL=$VITE_API_URL VITE_LEGAL_ENTITY_NAME=$VITE_LEGAL_ENTITY_NAME VITE_PRIVACY_CONTACT=$VITE_PRIVACY_CONTACT
RUN npm run build:production
FROM nginx:1.28-alpine
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html
USER nginx
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
