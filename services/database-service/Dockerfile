FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

# Copy shared modules
COPY shared ./shared

# Copy service files
COPY services/database-service/package*.json ./
RUN npm ci --only=production

COPY services/database-service/src ./src

RUN mkdir -p /app/data

EXPOSE 3008

CMD ["node", "src/index.js"]
