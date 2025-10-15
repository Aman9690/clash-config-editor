# GitHub Actions 工作流说明

## Docker 镜像自动构建和发布

### 触发条件

此工作流在以下情况下触发：
1. **创建Release版本时自动触发** - 当你在GitHub上创建新的Release时
2. **手动触发** - 在Actions标签页手动运行工作流

### 镜像发布位置

镜像将发布到 GitHub Container Registry (ghcr.io):
```
ghcr.io/xiaoyutx94/clash-config-editor:latest
ghcr.io/xiaoyutx94/clash-config-editor:v1.0.0
ghcr.io/xiaoyutx94/clash-config-editor:1.0
ghcr.io/xiaoyutx94/clash-config-editor:1
```

### 如何创建Release并触发构建

#### 方法1：通过GitHub网页创建Release

1. 访问仓库页面：https://github.com/xiaoyutx94/clash-config-editor
2. 点击右侧的 "Releases" → "Create a new release"
3. 填写信息：
   - **Tag**: 输入版本号（如 `v1.0.0`）
   - **Title**: 输入版本标题（如 "v1.0.0 - 初始版本"）
   - **Description**: 描述本次更新内容
4. 点击 "Publish release"
5. 工作流会自动运行，开始构建Docker镜像

#### 方法2：通过命令行创建Release

```bash
# 创建tag
git tag -a v1.0.0 -m "Release version 1.0.0"

# 推送tag到GitHub
git push origin v1.0.0
```

然后在GitHub网页上基于这个tag创建Release。

### 支持的平台

工作流会自动构建以下平台的镜像：
- linux/amd64 (x86_64)
- linux/arm64 (ARM64/Apple Silicon)

### 使用发布的镜像

#### 从ghcr.io拉取镜像

```bash
# 拉取最新版本
docker pull ghcr.io/xiaoyutx94/clash-config-editor:latest

# 拉取指定版本
docker pull ghcr.io/xiaoyutx94/clash-config-editor:v1.0.0
```

#### 运行容器

```bash
docker run -d \
  -p 3000:3000 \
  -v ./configs:/app/configs \
  -e AUTH_ENABLED=true \
  -e AUTH_USERNAME=admin \
  -e AUTH_PASSWORD=your_password \
  --name clash-config-editor \
  ghcr.io/xiaoyutx94/clash-config-editor:latest
```

#### 使用docker-compose

修改 `docker-compose.yml`:

```yaml
services:
  clash-config-editor:
    image: ghcr.io/xiaoyutx94/clash-config-editor:latest
    container_name: clash-config-editor
    ports:
      - "3000:3000"
    volumes:
      - ./configs:/app/configs
    environment:
      - AUTH_ENABLED=true
      - AUTH_USERNAME=admin
      - AUTH_PASSWORD=your_password
    restart: unless-stopped
```

### 镜像可见性设置

首次发布后，镜像默认是私有的。如果要公开镜像：

1. 访问 https://github.com/xiaoyutx94?tab=packages
2. 找到 `clash-config-editor` 包
3. 点击 "Package settings"
4. 在 "Danger Zone" 中选择 "Change visibility"
5. 设置为 "Public"

### 查看构建状态

- 访问仓库的 Actions 标签页查看构建进度
- 每次Release都会创建一个新的workflow run
- 构建通常需要3-5分钟完成

### 版本号建议

建议使用语义化版本号 (Semantic Versioning):
- `v1.0.0` - 主版本.次版本.补丁版本
- `v1.1.0` - 新功能
- `v1.0.1` - Bug修复
- `v2.0.0` - 重大更新

### 工作流功能

✅ 自动构建多平台镜像  
✅ 自动推送到 ghcr.io  
✅ 支持多种标签格式  
✅ 使用缓存加速构建  
✅ 生成构建证明  
✅ 支持手动触发  
