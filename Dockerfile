FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY index.html /srv/index.html
COPY riffast-intro.js /srv/riffast-intro.js
COPY assets /srv/assets
