FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev:renderer", "--", "--host", "0.0.0.0", "--port", "5173"]
