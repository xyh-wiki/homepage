FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
COPY data ./data
COPY src ./src
COPY scripts ./scripts
ARG SITE_URL=https://xyh.wiki
ARG ADSENSE_CLIENT=
ARG ADSENSE_PUBLISHER_ID=
RUN SITE_URL="$SITE_URL" ADSENSE_CLIENT="$ADSENSE_CLIENT" ADSENSE_PUBLISHER_ID="$ADSENSE_PUBLISHER_ID" npm run build

FROM caddy:2.10.2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
USER 65532:65532
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:3000/healthz || exit 1
