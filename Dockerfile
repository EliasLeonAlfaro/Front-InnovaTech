# 1. Etapa de compilación (Build de React)
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 2. Etapa de producción (Servidor Nginx)
FROM nginx:alpine

# ❌ LÍNEA VIEJA CON ERROR: COPY ./nginx.conf /etc/nginx/nginx.conf
# ➡️ LÍNEA CORREGIDA: Se monta obligatoriamente en la carpeta conf.d/default.conf
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

# Copia los archivos compilados de React al directorio de Nginx
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]