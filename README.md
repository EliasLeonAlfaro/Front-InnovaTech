# 🖥️ Innovatech Chile - Frontend Web Portal & API Gateway

Este repositorio contiene la interfaz de usuario de la plataforma **Innovatech Chile**, desarrollada en **React (Vite)** y empaquetada en un contenedor optimizado de **Nginx**. 

Además de servir los archivos estáticos del cliente, el servidor Nginx actúa estratégicamente como el **API Gateway / Proxy Inverso** de la arquitectura, centralizando y protegiendo las comunicaciones hacia los microservicios del Backend.

---

## 📐 Arquitectura del Sistema y Flujo de Red

La infraestructura del proyecto está distribuida en tres capas independientes (Multi-instancia) sobre AWS, garantizando el aislamiento y la seguridad de los componentes:

1. **Capa de Presentación (Frontend EC2 Pública):** Aloja este contenedor Nginx. Es la única máquina expuesta directamente a Internet para interactuar con los clientes.
2. **Capa de Negocio (Backend EC2 Privada):** Oculta en una subred privada. Contiene los microservicios de Ventas y Despachos. Solo es accesible desde la EC2 del Frontend mediante reglas de Security Groups.
3. **Capa de Datos (Database EC2 Privada):** Instancia con Amazon Linux 2023 que ejecuta MySQL 8.0 de forma aislada.

---

## ⚙️ Funcionamiento del API Gateway (Nginx)

Para evitar exponer los puertos internos de los microservicios (`8085` y `8086`) al internet público y solucionar de raíz los problemas de **CORS (Cross-Origin Resource Sharing)**, Nginx intercepta las peticiones y las redirige internamente a través de la red privada de AWS:

* Cualquier consulta a `http://<IP_PUBLICA_FRONTEND>/api/v1/despachos` es redirigida de forma invisible hacia `http://<IP_PRIVADA_BACKEND>:8085`.
* Cualquier consulta a `http://<IP_PUBLICA_FRONTEND>/api/v1/ventas` es redirigida hacia `http://<IP_PRIVADA_BACKEND>:8086`.

---

## 🚀 Requisitos y Guía de Uso Local

### Prerrequisitos:
* Docker instalado en la máquina EC2.
* Git instalado EC2.

### Pasos para Desplegar:
1. **Ajustar Direcciones IP:** Abre el archivo `nginx.conf` y actualiza las directivas `proxy_pass` con la IP privada actual de tu servidor de Backend.
2. **Construir la Imagen Docker:**
   ```bash
   docker build -t innovatech-frontend:latest .
