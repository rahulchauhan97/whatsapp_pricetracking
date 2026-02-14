FROM node:18-alpine

WORKDIR /app

# Copy shared modules
COPY shared ./shared

# Copy service files
COPY services/stock-monitor-service/package*.json ./
RUN npm install --omit=dev

COPY services/stock-monitor-service/src ./src

EXPOSE 3005

CMD ["node", "src/index.js"]
