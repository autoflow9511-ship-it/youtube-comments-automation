FROM node:20-alpine

# OpenSSL install karo Prisma ke liye
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files
COPY package.json ./
COPY .npmrc ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source
COPY . .

# Generate Prisma client — schema src/database mein hai
RUN npx prisma generate --schema=src/database/schema.prisma

# Build
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/main"]
