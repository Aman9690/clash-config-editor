@echo off
echo ====================================
echo Clash Config Editor - 启动脚本
echo ====================================
echo.

echo 检查 Node.js 是否安装...
node --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js 已安装
node --version
echo.

echo ====================================
echo 1. 安装后端依赖
echo ====================================
cd backend
if not exist "node_modules" (
    echo 正在安装后端依赖...
    call npm install
    if errorlevel 1 (
        echo [错误] 后端依赖安装失败
        pause
        exit /b 1
    )
) else (
    echo 后端依赖已存在，跳过安装
)
cd ..

echo.
echo ====================================
echo 2. 安装前端依赖
echo ====================================
cd frontend
if not exist "node_modules" (
    echo 正在安装前端依赖...
    call npm install
    if errorlevel 1 (
        echo [错误] 前端依赖安装失败
        pause
        exit /b 1
    )
) else (
    echo 前端依赖已存在，跳过安装
)
cd ..

echo.
echo ====================================
echo 3. 启动服务
echo ====================================
echo.
echo 后端服务将运行在: http://localhost:3000
echo 前端服务将运行在: http://localhost:5173
echo.
echo 请在浏览器中访问前端地址进行配置编辑
echo 按 Ctrl+C 可以停止服务
echo.

echo 启动后端服务...
start "Clash Config Editor - Backend" cmd /k "cd backend && npm run dev"

timeout /t 3 /nobreak >nul

echo 启动前端服务...
start "Clash Config Editor - Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ====================================
echo 启动完成！
echo ====================================
echo 前端访问地址: http://localhost:5173
echo 后端API地址: http://localhost:3000
echo ====================================
echo.

pause
