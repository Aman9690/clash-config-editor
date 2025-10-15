@echo off
echo ====================================
echo Clash Config Editor - Docker 启动
echo ====================================
echo.

echo 检查 Docker 是否安装...
docker --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Docker，请先安装 Docker Desktop
    echo 下载地址: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

echo Docker 已安装
docker --version
echo.

echo 检查 Docker 是否运行...
docker ps >nul 2>&1
if errorlevel 1 (
    echo [错误] Docker 未运行，请先启动 Docker Desktop
    pause
    exit /b 1
)

echo.
echo ====================================
echo 使用 Docker Compose 启动服务
echo ====================================
echo.

docker-compose up -d

if errorlevel 1 (
    echo [错误] Docker Compose 启动失败
    pause
    exit /b 1
)

echo.
echo ====================================
echo 启动完成！
echo ====================================
echo.
echo 访问地址: http://localhost:3000
echo.
echo 查看日志: docker-compose logs -f
echo 停止服务: docker-compose down
echo ====================================
echo.

pause
