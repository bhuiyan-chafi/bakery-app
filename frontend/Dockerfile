FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000

# Use vite preview to serve the production build
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "3000"]
