FROM node:18-alpine

WORKDIR /app

# Copy shared modules
COPY shared ./shared

# Copy service files
COPY services/price-tracker-service/package*.json ./
RUN npm ci --only=production

COPY services/price-tracker-service/src ./src

EXPOSE 3003

CMD ["node", "src/index.js"]
