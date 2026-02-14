FROM node:18-alpine

WORKDIR /app

# Copy shared modules
COPY shared ./shared

# Copy service files
COPY services/api-gateway/package*.json ./
RUN npm ci --only=production

COPY services/api-gateway/src ./src

EXPOSE 3000

CMD ["node", "src/index.js"]
