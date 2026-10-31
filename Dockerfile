FROM node:20-slim
WORKDIR /app

# Backend dependencies (devDependencies are included because the server runs through tsx)
COPY package.json package-lock.json ./
RUN npm install --include=dev --no-audit --no-fund

# Dashboard dependencies
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN npm --prefix frontend install --include=dev --no-audit --no-fund

# Source code, then build the dashboard
COPY . .
RUN npm --prefix frontend run build

ENV NODE_ENV=production
CMD ["npx", "tsx", "server.ts"]
