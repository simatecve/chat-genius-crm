# Etapa 1: Construir la aplicación React (Vite)
FROM node:18-alpine AS build

# Establecer el directorio de trabajo
WORKDIR /app

# Copiar los archivos de configuración
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código fuente
COPY . .

# Argumentos de compilación para las variables de entorno de Vite
ARG VITE_SUPABASE_PROJECT_ID
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_URL
ARG VITE_WAHA_API_KEY
ARG VITE_WAHA_BASE_URL

# Establecerlas como variables de entorno durante la compilación
ENV VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_WAHA_API_KEY=$VITE_WAHA_API_KEY
ENV VITE_WAHA_BASE_URL=$VITE_WAHA_BASE_URL

# Construir la aplicación
RUN npm run build

# Etapa 2: Servir la aplicación estática con Nginx
FROM nginx:alpine

# Copiar la configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar la salida del build de Vite al directorio público de Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Exponer el puerto 80
EXPOSE 80

# Iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]
