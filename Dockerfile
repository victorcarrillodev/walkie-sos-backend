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

# --- AQUI ESTA LA MAGIA (LA SOLUCION AL ERROR) ---
# Declaramos una URL falsa para que la validación de tu env.ts y Prisma no exploten.
# Cuando el contenedor arranque de verdad, el docker-compose.yml sobreescribirá esto con la URL real.
ENV DATABASE_URL="postgresql://usuario_falso:password_falso@localhost:5432/bd_falsa"
# Si tu env.ts te exige otras variables estrictamente, agrégalas aquí abajo también, por ejemplo:
# ENV JWT_SECRET="secreto_falso"

# 6. Generamos el cliente de Prisma (Vital para que funcione)
RUN npx prisma generate

# 7. Compilamos el TypeScript a JavaScript
RUN npm run build

# 8. Exponemos el puerto 3000
EXPOSE 3000

# 9. Comando para iniciar la app (usando el código compilado)
CMD ["node", "dist/server.js"]