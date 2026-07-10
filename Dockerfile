# Etapa 1: Build React/Vite
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# Etapa 2: Servir con Nginx + SSL self-signed
FROM nginx:alpine

# Instalar openssl para generar certificado autofirmado
RUN apk add --no-cache openssl

# Copiar frontend compilado
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar configuracion nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Crear carpeta SSL y generar certificado autofirmado
RUN mkdir -p /etc/nginx/ssl && \
    openssl req -x509 -nodes -days 365 \
    -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/selfsigned.key \
    -out /etc/nginx/ssl/selfsigned.crt \
    -subj "/C=CL/ST=Santiago/L=Santiago/O=Innovatech/OU=DevOps/CN=innovatech.local"

# Permisos para usuario nginx
RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx \
    /var/run/nginx.pid \
    /var/cache/nginx \
    /var/log/nginx \
    /usr/share/nginx/html \
    /etc/nginx/conf.d \
    /etc/nginx/ssl

USER nginx

EXPOSE 8080
EXPOSE 8443

CMD ["nginx", "-g", "daemon off;"]