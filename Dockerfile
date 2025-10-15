# 前端构建阶段
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# 后端构建阶段
FROM node:18-alpine AS backend-builder

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm install --production

COPY backend/ ./

# 生产阶段
FROM node:18-alpine

WORKDIR /app

# 复制后端代码
COPY --from=backend-builder /app/backend ./backend

# 复制前端构建产物
COPY --from=frontend-builder /app/frontend/dist ./backend/public

# 创建配置目录
RUN mkdir -p /app/configs

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app/backend

EXPOSE 3000

CMD ["node", "server.js"]
