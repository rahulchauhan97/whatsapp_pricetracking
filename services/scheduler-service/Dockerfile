FROM node:18-alpine

WORKDIR /app

# Copy shared modules
COPY shared ./shared

# Copy service files
COPY services/scheduler-service/package*.json ./
RUN npm ci --only=production

COPY services/scheduler-service/src ./src

EXPOSE 3007

CMD ["node", "src/index.js"]
