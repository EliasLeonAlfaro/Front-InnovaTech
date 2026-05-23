# 1. Etapa de compilación (Build de React con Vite)
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 2. Etapa de producción (Servidor Nginx de Docker)
FROM nginx:alpine

# ➡️ CORREGIDO: Copia el nginx.conf local de la carpeta directamente a default.conf
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

# Copia los archivos estáticos generados por Vite hacia el directorio de Nginx
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]