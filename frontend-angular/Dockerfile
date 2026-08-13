# --- builder ---
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Plain `ng build` = the "production" configuration (angular.json) -
# the only place environment.ts gets swapped for environment.development.ts
# is the "development" configuration, so this bundles environment.ts as
# committed (empty primeNgLicenseKey - see that file's own comment: the
# app still runs, PrimeNG just shows an unlicensed watermark without a
# real key).
RUN npm run build

# --- runtime ---
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
# @angular/build:application's output structure - the static bundle
# lives under dist/frontend-angular/browser/, not directly under
# dist/frontend-angular/ (that folder also holds prerendered-routes.json
# and 3rdpartylicenses.txt, which aren't servable assets).
COPY --from=builder /app/dist/frontend-angular/browser /usr/share/nginx/html
EXPOSE 80
