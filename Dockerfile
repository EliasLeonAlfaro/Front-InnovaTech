# 1. Etapa de compilación (Build de React)
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 2. Etapa de producción (Servidor Nginx)
FROM nginx:alpine

# ➡️ CORREGIDO: Usamos ./nginx.conf porque está en la misma carpeta que este Dockerfile
COPY ./nginx.conf /etc/nginx/nginx.conf

# Copia los archivos compilados de React al directorio de Nginx
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]