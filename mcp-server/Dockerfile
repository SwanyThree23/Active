FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# The MCP server runs on stdio, so no port exposure needed
CMD ["node", "index.js"]
