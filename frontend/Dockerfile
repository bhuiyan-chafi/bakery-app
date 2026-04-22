FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

# Vite default port is 5173, but we can configure it to 3000 or just map in docker-compose
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
