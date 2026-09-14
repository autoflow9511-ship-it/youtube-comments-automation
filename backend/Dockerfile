FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json ./
COPY .npmrc ./

# Install dependencies (skip package-lock.json)
RUN npm install --legacy-peer-deps

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/main"]
