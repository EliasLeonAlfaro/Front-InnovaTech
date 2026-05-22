#Dockerfile frontend

#definimos imagen base desde donde se iniciara el contenedor,
#version de node.js y el sistema operativo
FROM node:20-alpine AS build
WORKDIR /app
#copiar archivos de dependencias para aprovechar la caché de docker
COPY package.json ./
#instalacion de dependencias
RUN npm ci
#copiar el resto de codigo
COPY . .
#compilar app
RUN npm run build

#Nginx
FROM nginx:1.25-alpine
#copiar archivos estaticos desde etapa anterior
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
#ajustar permisos de "minimo privilegio"
RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid /var/cache/nginx /var/log/nginx /etc/nginx/conf.d
# Cambiar al usuario sin privilegios incorporado en la imagen de Nginx
USER nginx
# Exponer el puerto estándar HTTP
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]