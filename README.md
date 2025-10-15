# Clash 配置文件在线编辑器

一个现代化的 Clash/Mihomo 配置文件可视化编辑工具，提供友好的用户界面来简化 Clash 配置文件的编辑过程。

## ✨ 特性

- 🎨 **直观的UI界面** - 基于 Vue 3 + Element Plus 的现代化界面
- 📝 **可视化编辑** - 通过表单、表格等UI组件编辑配置，无需手写YAML
- 💡 **配置说明** - 每个配置项都有详细的说明和示例
- ✅ **配置验证** - 保存前自动验证配置，避免错误
- 🔒 **可选认证** - 支持用户名密码登录保护
- 📁 **文件管理** - 支持上传、编辑、删除服务器上的配置文件
- 🐳 **Docker部署** - 开箱即用的 Docker 容器化部署
- 🌐 **全配置支持** - 支持 Mihomo 的所有主要配置项

## 🚀 快速开始

### 方式一：Docker 部署（推荐）

1. 克隆项目：
```bash
git clone <repository-url>
cd ClashConfigEdit
```

2. 启动容器：
```bash
docker-compose up -d
```

3. 访问：http://localhost:3000

### 方式二：本地开发

#### 前置要求
- Node.js 18+ 
- npm 或 yarn

#### 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

#### 启动服务

**开发模式（推荐）：**

打开两个终端窗口：

```bash
# 终端1 - 启动后端
cd backend
npm run dev

# 终端2 - 启动前端
cd frontend
npm run dev
```

然后访问：http://localhost:5173

**使用脚本启动：**

```bash
# 在项目根目录
npm install      # 安装 concurrently
npm run dev      # 同时启动前后端
```

## 🔧 配置

### 环境变量

创建 `.env` 文件或在 `docker-compose.yml` 中配置：

```env
# 服务端口
PORT=3000

# 是否启用认证（true/false）
AUTH_ENABLED=false

# 登录用户名（当AUTH_ENABLED=true时生效）
AUTH_USERNAME=admin

# 登录密码（当AUTH_ENABLED=true时生效）
AUTH_PASSWORD=admin
```

### 启用登录认证

在 `docker-compose.yml` 中修改环境变量：

```yaml
environment:
  - AUTH_ENABLED=true
  - AUTH_USERNAME=your_username
  - AUTH_PASSWORD=your_password
```

或在本地运行时设置环境变量：

```bash
# Windows PowerShell
$env:AUTH_ENABLED="true"
$env:AUTH_USERNAME="admin"
$env:AUTH_PASSWORD="your_secure_password"
npm run dev

# Linux/macOS
export AUTH_ENABLED=true
export AUTH_USERNAME=admin
export AUTH_PASSWORD=your_secure_password
npm run dev
```

## 📖 使用指南

### 1. 选择或上传配置文件

- **服务器文件**：从服务器上已有的配置文件中选择
- **上传文件**：拖拽或选择本地 YAML 文件上传

### 2. 编辑配置

编辑器分为多个标签页：

- **基础配置**：端口、模式、日志等基础设置
- **网络配置**：认证、接口、TLS指纹等网络相关设置
- **TUN配置**：TUN模式相关配置
- **DNS配置**：DNS服务器和解析策略
- **嗅探配置**：域名嗅探相关设置
- **代理节点**：添加和管理代理服务器
- **代理组**：配置策略组
- **规则配置**：配置路由规则

### 3. 保存配置

点击右上角"保存配置"按钮，系统会：
1. 自动验证配置的正确性
2. 显示错误和警告信息（如有）
3. 保存到服务器

### 4. 预览 YAML

点击"预览YAML"可以查看生成的原始 YAML 配置内容。

## 🏗️ 项目结构

```
ClashConfigEdit/
├── backend/                 # 后端服务
│   ├── server.js           # Express 服务器
│   ├── config-metadata.json # 配置元数据
│   └── package.json
├── frontend/               # 前端应用
│   ├── src/
│   │   ├── views/         # 页面组件
│   │   ├── components/    # UI组件
│   │   ├── api/          # API调用
│   │   ├── stores/       # 状态管理
│   │   └── router/       # 路由配置
│   └── package.json
├── configs/               # 配置文件存储目录
├── docker-compose.yml    # Docker编排文件
├── Dockerfile           # Docker镜像构建文件
├── .env.example        # 环境变量示例
└── README.md

```

## 🛠️ 技术栈

### 后端
- **Node.js** - 运行环境
- **Express** - Web框架
- **js-yaml** - YAML解析
- **Multer** - 文件上传

### 前端
- **Vue 3** - 渐进式JavaScript框架
- **Element Plus** - UI组件库
- **Pinia** - 状态管理
- **Vite** - 构建工具
- **Vue Router** - 路由管理

## 📝 支持的配置项

### 基础配置
- HTTP/SOCKS/混合端口配置
- 运行模式（规则/全局/直连）
- IPv6 支持
- 日志级别
- 外部控制器

### 代理节点
- Shadowsocks
- VMess
- Trojan
- Hysteria2
- 更多协议...

### 代理组
- 手动选择 (select)
- 自动测速 (url-test)
- 故障转移 (fallback)
- 负载均衡 (load-balance)

### 规则类型
- DOMAIN - 完整域名匹配
- DOMAIN-SUFFIX - 域名后缀匹配
- DOMAIN-KEYWORD - 域名关键字匹配
- IP-CIDR - IP段匹配
- GEOIP - 地理位置匹配
- GEOSITE - 域名集合匹配
- MATCH - 兜底规则

## 🔒 安全说明

### ✅ 已实施的安全措施

本项目已修复所有已知安全漏洞，包括：

1. **路径遍历漏洞防护** - 严格验证文件名，防止访问系统文件
2. **Token过期机制** - Token 24小时自动过期
3. **登录暴力破解防护** - 5次失败锁定15分钟
4. **CORS配置** - 支持白名单限制
5. **输入验证** - 所有用户输入都经过严格验证

### 🛡️ 生产环境部署要求

**必须做到：**
1. ✅ **启用认证**：`AUTH_ENABLED=true`
2. ✅ **使用强密码**：至少12位，包含大小写字母、数字和特殊字符
3. ✅ **配置HTTPS**：使用反向代理配置SSL证书
4. ✅ **配置CORS白名单**：限制允许的域名
5. ✅ **配置防火墙**：只开放必要的端口

**详细安全指南请查看：[SECURITY.md](./SECURITY.md)**

## 📄 License

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📮 联系方式

如有问题或建议，请提交 Issue。
