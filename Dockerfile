# --- ETAPA 1: COMPILACIÓN ---
FROM node:20-alpine AS build
WORKDIR /app

# Copiamos los manifiestos apuntando a la subcarpeta interna
COPY ./front_despacho/package*.json ./
RUN npm install

# Copiamos el resto del código fuente del frontend
COPY ./front_despacho/ ./
RUN npm run build

# --- ETAPA 2: SERVIDOR PRODUCCIÓN ---
FROM nginx:alpine

# Copiamos TU archivo de configuración (el que tiene el reverse proxy de arriba)
COPY ./front_despacho/nginx.conf /etc/nginx/conf.d/default.conf

# Copiamos los archivos compilados en la etapa 1 al directorio de Nginx
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]