FROM node:18-alpine

WORKDIR /app

# Copy shared modules
COPY shared ./shared

# Copy service files
COPY services/notification-service/package*.json ./
RUN npm install --omit=dev

COPY services/notification-service/src ./src

# Create symlink at /shared to resolve ../../shared from service code
RUN ln -s /app/shared /shared

EXPOSE 3006

CMD ["node", "src/index.js"]
