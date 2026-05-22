# --- ETAPA 1: COMPILACIÓN ---
FROM node:20-alpine AS build
WORKDIR /app

# ➡️ CORREGIDO: Rutas directas y limpias porque ya estamos en la raíz del proyecto
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# --- ETAPA 2: SERVIDOR PRODUCCIÓN ---
FROM nginx:alpine

# ➡️ CORREGIDO: Toma tu nginx.conf original que está al lado de este Dockerfile
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]