# Frontend Innovatech — Despliegue en AWS EKS con ECR y GitHub Actions

Este repositorio contiene el frontend de Innovatech, desarrollado con React/Vite y servido mediante Nginx dentro de un clúster Kubernetes en AWS EKS.

El frontend se despliega como contenedor Docker, se almacena como imagen en Amazon ECR y se publica en AWS EKS mediante GitHub Actions.

---

## 1. Arquitectura general

El frontend funciona como la capa pública del sistema. Es el único componente expuesto a Internet mediante un Service de Kubernetes tipo LoadBalancer.

```text
Usuario en Internet
   ↓
LoadBalancer AWS
   ↓
frontend-service
   ↓
Pod frontend con Nginx
   ↓
React/Vite
```

Además, Nginx actúa como reverse proxy para redirigir las peticiones del frontend hacia los microservicios backend internos:

```text
/api/v1/ventas     → ventas-service:8086
/api/v1/despachos  → despachos-service:8085
```

De esta forma, el usuario solo accede al frontend público, mientras que el backend permanece privado dentro del clúster.

---

## 2. Requisitos previos

Antes de desplegar este frontend, se asume que ya existen y están correctamente configurados:

* VPC en AWS.
* Subredes públicas y privadas.
* Security Groups.
* Clúster EKS creado.
* Nodos activos en el clúster EKS.
* Namespace `innovatech`.
* Backend desplegado en EKS.
* Services internos:

  * `ventas-service`
  * `despachos-service`
* AWS Load Balancer Controller o soporte de LoadBalancer funcionando.
* Repositorio ECR para frontend.
* GitHub Actions habilitado.
* GitHub Secrets configurados.

También se requiere tener instalado localmente:

```bash
aws --version
kubectl version --client
git --version
```

---

## 3. Crear repositorio en Amazon ECR

Antes de ejecutar el pipeline, se debe crear el repositorio del frontend en Amazon ECR.

Nombre del repositorio:

```text
front-innovatech
```

Crear el repositorio:

```bash
aws ecr create-repository \
  --repository-name front-innovatech \
  --region us-east-1
```

Verificar repositorios:

```bash
aws ecr describe-repositories \
  --region us-east-1
```

La imagen final del frontend tendrá una URL similar a:

```text
308769698189.dkr.ecr.us-east-1.amazonaws.com/front-innovatech:latest
```

---

## 4. Estructura esperada del repositorio

```text
Front-Innovatech/
│
├── src/
├── public/
├── package.json
├── package-lock.json
├── Dockerfile
├── nginx.conf
│
├── k8s/
│   ├── frontend-deployment.yaml
│   └── frontend-hpa.yaml
│
└── .github/
    └── workflows/
        └── deploy.yml
```

---

## 5. Dockerfile del frontend

El frontend utiliza un Dockerfile multi-stage.

Primero se construye la aplicación con Node.js. Luego se copia el resultado compilado a una imagen Nginx.

```dockerfile
# Etapa 1: Build React/Vite
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# Etapa 2: Servir con Nginx
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid /var/cache/nginx /var/log/nginx /usr/share/nginx/html /etc/nginx/conf.d

USER nginx

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
```

---

## 6. Configuración de Nginx

Archivo:

```text
nginx.conf
```

Configuración recomendada:

```nginx
server {
    listen 8080;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html index.htm;

    location / {
        try_files $uri $uri/ /index.html;

        add_header Cross-Origin-Resource-Policy "cross-origin" always;
        add_header Cross-Origin-Opener-Policy "unsafe-none" always;
        add_header Cross-Origin-Embedder-Policy "unsafe-none" always;
        add_header Access-Control-Allow-Origin "*" always;
    }

    location /api/v1/ventas {
        proxy_pass http://ventas-service.innovatech.svc.cluster.local:8086;

        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/v1/despachos {
        proxy_pass http://despachos-service.innovatech.svc.cluster.local:8085;

        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Esta configuración permite que el frontend se comunique con el backend usando DNS interno de Kubernetes.

Ejemplo:

```text
ventas-service.innovatech.svc.cluster.local
```

Donde:

```text
ventas-service  → nombre del Service
innovatech      → namespace
svc             → tipo de recurso Service
cluster.local   → dominio interno del clúster
```

---

## 7. Deployment y Service del frontend

Archivo:

```text
k8s/frontend-deployment.yaml
```

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: innovatech
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
        - name: frontend
          image: 308769698189.dkr.ecr.us-east-1.amazonaws.com/front-innovatech:latest
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "250m"
              memory: "256Mi"
---
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
  namespace: innovatech
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-scheme: internet-facing
spec:
  selector:
    app: frontend
  type: LoadBalancer
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
```

Este Service expone el frontend públicamente mediante un LoadBalancer de AWS.

---

## 8. Autoscaling del frontend

Archivo:

```text
k8s/frontend-hpa.yaml
```

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: frontend-hpa
  namespace: innovatech
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: frontend
  minReplicas: 2
  maxReplicas: 3
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 80
```

Aplicar manualmente:

```bash
kubectl apply -f k8s/frontend-hpa.yaml
```

Verificar:

```bash
kubectl get hpa -n innovatech
```

---

## 9. GitHub Secrets requeridos

En GitHub se deben configurar los siguientes secrets:

```text
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_SESSION_TOKEN
AWS_ACCOUNT_ID
AWS_REGION
```

Ejemplo:

```text
AWS_ACCOUNT_ID=308769698189
AWS_REGION=us-east-1
```

En AWS Academy las credenciales son temporales, por lo que `AWS_SESSION_TOKEN` debe actualizarse cuando expire la sesión.

---

## 10. Pipeline CI/CD con GitHub Actions

El pipeline se ejecuta automáticamente al hacer push a la rama:

```text
deploy
```

Flujo:

```text
Push a rama deploy
   ↓
GitHub Actions
   ↓
Build imagen Docker
   ↓
Push a Amazon ECR
   ↓
Conexión a EKS
   ↓
Aplicación de manifiestos Kubernetes
   ↓
Actualización del deployment frontend
   ↓
Rollout
   ↓
Aplicación del HPA
```

Archivo:

```text
.github/workflows/deploy.yml
```

```yaml
name: Frontend CI/CD (ECR + EKS)

on:
  push:
    branches:
      - deploy

env:
  AWS_REGION: us-east-1
  EKS_CLUSTER_NAME: innovatech
  K8S_NAMESPACE: innovatech
  AWS_ACCOUNT_ID: "308769698189"
  ECR_REPOSITORY: front-innovatech

jobs:
  build-and-deploy:
    name: Build, Push & Deploy Frontend
    runs-on: ubuntu-latest

    steps:
      - name: Checkout del codigo
        uses: actions/checkout@v4

      - name: Configurar credenciales AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-session-token: ${{ secrets.AWS_SESSION_TOKEN }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Verificar identidad AWS
        run: aws sts get-caller-identity

      - name: Login Amazon ECR
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build y Push imagen Frontend
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile
          push: true
          tags: 308769698189.dkr.ecr.us-east-1.amazonaws.com/front-innovatech:latest

      - name: Instalar kubectl
        uses: azure/setup-kubectl@v4

      - name: Configurar conexion con EKS
        run: |
          aws eks update-kubeconfig --region us-east-1 --name innovatech

      - name: Crear namespace si no existe
        run: |
          kubectl create namespace innovatech --dry-run=client -o yaml | kubectl apply -f -

      - name: Pausar HPA durante deploy
        run: |
          kubectl delete hpa frontend-hpa -n innovatech --ignore-not-found

      - name: Aplicar manifiesto frontend
        run: |
          kubectl apply -f k8s/frontend-deployment.yaml

      - name: Actualizar imagen frontend
        run: |
          kubectl set image deployment/frontend frontend=308769698189.dkr.ecr.us-east-1.amazonaws.com/front-innovatech:latest -n innovatech

      - name: Reiniciar deployment frontend
        run: |
          kubectl rollout restart deployment/frontend -n innovatech

      - name: Verificar rollout
        run: |
          kubectl rollout status deployment/frontend -n innovatech --timeout=5m
          kubectl get pods -n innovatech

      - name: Activar HPA
        run: |
          kubectl apply -f k8s/frontend-hpa.yaml
          kubectl get hpa -n innovatech
```

---

## 11. Despliegue automático

Para desplegar:

```bash
git checkout deploy
git add .
git commit -m "Deploy frontend EKS"
git push origin deploy
```

Esto activa GitHub Actions automáticamente.

---

## 12. Verificar despliegue

Ver pods:

```bash
kubectl get pods -n innovatech
```

Ver deployment:

```bash
kubectl get deployment frontend -n innovatech
```

Ver service:

```bash
kubectl get svc frontend-service -n innovatech
```

Ver HPA:

```bash
kubectl get hpa -n innovatech
```

Ver endpoints:

```bash
kubectl get endpoints -n innovatech
```

---

## 13. Obtener URL pública del frontend

Ejecutar:

```bash
kubectl get svc frontend-service -n innovatech
```

Buscar la columna:

```text
EXTERNAL-IP
```

Si aparece un DNS similar a:

```text
k8s-innovate-frontend-xxxxx.elb.us-east-1.amazonaws.com
```

Abrir en navegador:

```text
http://k8s-innovate-frontend-xxxxx.elb.us-east-1.amazonaws.com
```

---

## 14. Probar comunicación con backend

Desde navegador:

```text
http://DNS-DEL-LOADBALANCER/api/v1/ventas
```

También se puede probar con curl:

```bash
curl http://DNS-DEL-LOADBALANCER/api/v1/ventas
```

Respuesta esperada:

```json
[
  {
    "idVenta": 1,
    "direccionCompra": "Av. Siempre Viva 123",
    "valorCompra": 25000,
    "fechaCompra": "2026-06-19",
    "despachoGenerado": false
  }
]
```

---

## 15. Logs del frontend

Ver logs:

```bash
kubectl logs deployment/frontend -n innovatech --tail=100
```

Logs en vivo:

```bash
kubectl logs deployment/frontend -n innovatech -f
```

---

## 16. Probar autorecuperación

Listar pods:

```bash
kubectl get pods -n innovatech
```

Eliminar un pod frontend:

```bash
kubectl delete pod NOMBRE_DEL_POD -n innovatech
```

Observar recuperación:

```bash
kubectl get pods -n innovatech -w
```

Kubernetes creará un nuevo pod automáticamente para mantener el estado deseado del Deployment.

---

## 17. Problemas comunes

### LoadBalancer queda en Pending

Ver eventos:

```bash
kubectl describe svc frontend-service -n innovatech
```

Causa probable:

* Subredes públicas sin etiquetas requeridas.
* Falta de permisos del clúster.
* Configuración incorrecta de subredes.

Etiquetas requeridas en subredes públicas:

```text
kubernetes.io/role/elb = 1
kubernetes.io/cluster/innovatech = shared
```

---

### Frontend carga, pero backend no responde

Revisar Nginx:

```bash
kubectl logs deployment/frontend -n innovatech --tail=100
```

Verificar services backend:

```bash
kubectl get svc -n innovatech
```

Verificar endpoints:

```bash
kubectl get endpoints -n innovatech
```

Probar backend interno:

```bash
kubectl run curl-test \
  -n innovatech \
  --image=curlimages/curl \
  -it \
  --rm \
  --restart=Never \
  -- sh
```

Dentro del pod:

```bash
curl http://ventas-service:8086/api/v1/ventas
```

---

### GitHub Actions falla por credenciales

En AWS Academy las credenciales son temporales. Actualizar:

```text
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_SESSION_TOKEN
```

---

## 18. Evidencias recomendadas

Para defensa técnica o video demostrativo, mostrar:

```bash
kubectl get pods -n innovatech
kubectl get deployments -n innovatech
kubectl get svc -n innovatech
kubectl get endpoints -n innovatech
kubectl get hpa -n innovatech
kubectl logs deployment/frontend -n innovatech --tail=50
```

Además:

* GitHub Actions exitoso.
* Imagen en ECR.
* Frontend abierto desde navegador.
* Endpoint `/api/v1/ventas` respondiendo JSON.
* Eliminación de un pod y autorecuperación.

---

## 19. Flujo final resumido

```text
git push origin deploy
   ↓
GitHub Actions
   ↓
Docker build frontend
   ↓
Push imagen a Amazon ECR
   ↓
Deploy en Amazon EKS
   ↓
Kubernetes levanta pods frontend
   ↓
Service LoadBalancer expone frontend a Internet
   ↓
Nginx redirige /api/v1/ventas y /api/v1/despachos al backend interno
```

---

## 20. Estado esperado final

```text
frontend             Running
frontend-service     LoadBalancer
frontend-hpa         Activo
URL pública          Disponible
/api/v1/ventas       Respondiendo
```

Con esto, el frontend queda desplegado correctamente en AWS EKS, expuesto públicamente mediante LoadBalancer, conectado al backend mediante DNS interno de Kubernetes y automatizado mediante GitHub Actions.
