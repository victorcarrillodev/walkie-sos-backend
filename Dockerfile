# 1. Usamos una imagen base de Node.js ligera (Alpine)
FROM node:24-alpine

# 2. Instalamos pnpm globalmente (el gestor que usa este proyecto)
RUN npm install -g pnpm

# 3. Creamos el directorio de trabajo dentro del contenedor
WORKDIR /app

# 4. Copiamos los archivos de dependencias primero (para aprovechar caché de Docker)
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# 5. Instalamos las dependencias con pnpm (usa el lockfile exacto)
RUN pnpm install --frozen-lockfile

# 6. Copiamos el resto del código fuente
COPY . .

# --- VARIABLES FALSAS PARA QUE PRISMA Y EL BUILD NO EXPLOTEN ---
# El docker-compose.yml las sobreescribe con las reales al arrancar
ENV DATABASE_URL="postgresql://usuario_falso:password_falso@localhost:5432/bd_falsa"
ENV JWT_SECRET="secreto_falso_para_build_12345"

# 7. Generamos el cliente de Prisma (Vital para que funcione)
RUN pnpm exec prisma generate

# 8. Compilamos el TypeScript a JavaScript
RUN pnpm run build

# 9. Exponemos el puerto 3000
EXPOSE 3000

# 10. Comando para iniciar la app (usando el código compilado)
CMD ["node", "dist/server.js"]