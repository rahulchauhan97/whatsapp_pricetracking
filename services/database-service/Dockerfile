FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

# Copy shared modules
COPY shared ./shared

# Copy service files
COPY services/database-service/package*.json ./
RUN npm install --omit=dev

COPY services/database-service/src ./src

# Create symlink at /shared to resolve ../../shared from service code
RUN ln -s /app/shared /shared

RUN mkdir -p /app/data

EXPOSE 3008

CMD ["node", "src/index.js"]
