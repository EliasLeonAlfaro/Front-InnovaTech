# 1. Etapa de compilación (Build de React)
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 2. Etapa de producción (Servidor Nginx)
FROM nginx:alpine

# ➡️ ESTA LÍNEA ES CRÍTICA: Copia tu nginx.conf personalizado borrando el de fábrica
COPY front_despacho/nginx.conf /etc/nginx/nginx.conf

# Copia los archivos compilados de React
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]