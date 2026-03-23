FROM node:18-slim

WORKDIR /app

# Cài đặt Angular CLI
RUN npm install -g @angular/cli@17

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 4200

# Chạy server development, cho phép truy cập từ bên ngoài container
CMD ["npm", "start", "--", "--host", "0.0.0.0"]
