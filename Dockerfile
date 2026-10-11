FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production DATA_DIR=/app/data PORT=3000
COPY package*.json ./
RUN npm ci --omit=dev && mkdir -p /app/data
COPY . .
EXPOSE 3000
VOLUME ["/app/data"]
CMD ["node", "server.js"]
