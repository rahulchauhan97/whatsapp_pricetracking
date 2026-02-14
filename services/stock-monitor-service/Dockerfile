FROM node:18-alpine

WORKDIR /app

# Copy shared modules
COPY shared ./shared

# Copy service files
COPY services/stock-monitor-service/package*.json ./
RUN npm install --omit=dev

COPY services/stock-monitor-service/src ./src

# Create symlink at /shared to resolve ../../shared from service code
RUN ln -s /app/shared /shared

EXPOSE 3005

CMD ["node", "src/index.js"]
