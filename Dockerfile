# 1. Usamos una imagen base de Node.js ligera (Alpine)
FROM node:24-alpine

# 2. Creamos el directorio de trabajo dentro del contenedor
WORKDIR /app

# 3. Copiamos los archivos de dependencias primero (para aprovechar caché)
COPY package*.json ./
COPY prisma ./prisma/

# 4. Instalamos las dependencias
RUN npm install

# 5. Copiamos el resto del código fuente
COPY . .

# 6. Generamos el cliente de Prisma (Vital para que funcione)
RUN npx prisma generate

# 7. Compilamos el TypeScript a JavaScript
RUN npm run build

# 8. Exponemos el puerto 3000
EXPOSE 3000

# 9. Comando para iniciar la app (usando el código compilado)
CMD ["node", "dist/server.js"]