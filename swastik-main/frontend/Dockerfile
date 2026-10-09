# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies (npm install tolerates lock file out of sync; use npm ci after running npm install locally for strict reproducibility)
COPY package*.json ./
RUN npm install

# Copy source and build (env vars like REACT_APP_* can be set via build-arg)
COPY . .
ARG REACT_APP_CRATER_URL=http://localhost
ENV REACT_APP_CRATER_URL=$REACT_APP_CRATER_URL
RUN npm run build

# Production stage: serve static files with nginx
FROM nginx:alpine

# Copy built app from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Optional: custom nginx config (e.g. SPA fallback)
RUN echo 'server { \
  listen 80; \
  root /usr/share/nginx/html; \
  index index.html; \
  location / { try_files $uri $uri/ /index.html; } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
