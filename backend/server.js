import express from 'express';
import cors from 'cors';
import yaml from 'js-yaml';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const configDir = path.join(__dirname, '../configs');
const publicDir = path.join(__dirname, 'public');

const AUTH_ENABLED = process.env.AUTH_ENABLED === 'true';
const AUTH_USERNAME = process.env.AUTH_USERNAME || 'admin';
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || 'admin';
const TOKEN_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24小时

const tokens = new Map(); // 改为Map以存储过期时间
const loginAttempts = new Map(); // 存储登录尝试次数
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_BLOCK_TIME = 15 * 60 * 1000; // 15分钟

const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const isValidFilename = (filename) => {
  if (!filename || typeof filename !== 'string') {
    return false;
  }
  
  const normalized = path.normalize(filename);
  
  if (normalized.includes('..') || 
      normalized.includes('/') || 
      normalized.includes('\\') ||
      path.isAbsolute(normalized)) {
    return false;
  }
  
  if (!/^[a-zA-Z0-9_\-\.]+$/.test(filename)) {
    return false;
  }
  
  return true;
};

const cleanExpiredTokens = () => {
  const now = Date.now();
  for (const [token, expiry] of tokens.entries()) {
    if (now > expiry) {
      tokens.delete(token);
    }
  }
};

setInterval(cleanExpiredTokens, 60 * 60 * 1000); // 每小时清理一次过期token

const authMiddleware = (req, res, next) => {
  if (!AUTH_ENABLED) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  const expiry = tokens.get(token);
  
  if (!expiry || Date.now() > expiry) {
    tokens.delete(token);
    return res.status(401).json({ success: false, message: 'Token expired or invalid' });
  }

  next();
};

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '5mb' }));

app.use(express.static(publicDir));

app.get('/api/auth/status', (req, res) => {
  res.json({ 
    success: true, 
    authEnabled: AUTH_ENABLED 
  });
});

app.post('/api/auth/login', (req, res) => {
  if (!AUTH_ENABLED) {
    return res.status(400).json({ 
      success: false, 
      message: 'Authentication is not enabled' 
    });
  }

  const { username, password } = req.body;
  const clientIp = req.ip || req.connection.remoteAddress;
  
  const attemptData = loginAttempts.get(clientIp);
  if (attemptData && attemptData.count >= MAX_LOGIN_ATTEMPTS) {
    const timeSinceLastAttempt = Date.now() - attemptData.lastAttempt;
    if (timeSinceLastAttempt < LOGIN_BLOCK_TIME) {
      const remainingTime = Math.ceil((LOGIN_BLOCK_TIME - timeSinceLastAttempt) / 60000);
      return res.status(429).json({ 
        success: false, 
        message: `Too many login attempts. Please try again in ${remainingTime} minutes.` 
      });
    } else {
      loginAttempts.delete(clientIp);
    }
  }

  if (username === AUTH_USERNAME && password === AUTH_PASSWORD) {
    loginAttempts.delete(clientIp);
    
    const token = generateToken();
    const expiry = Date.now() + TOKEN_EXPIRY_TIME;
    tokens.set(token, expiry);
    
    res.json({ 
      success: true, 
      token,
      expiresIn: TOKEN_EXPIRY_TIME,
      message: 'Login successful' 
    });
  } else {
    const attempts = attemptData ? attemptData.count + 1 : 1;
    loginAttempts.set(clientIp, {
      count: attempts,
      lastAttempt: Date.now()
    });
    
    res.status(401).json({ 
      success: false, 
      message: 'Invalid username or password',
      remainingAttempts: Math.max(0, MAX_LOGIN_ATTEMPTS - attempts)
    });
  }
});

app.get('/api/auth/verify', authMiddleware, (req, res) => {
  res.json({ 
    success: true, 
    message: 'Token is valid' 
  });
});

app.post('/api/auth/logout', authMiddleware, (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    tokens.delete(token);
  }
  
  res.json({ 
    success: true, 
    message: 'Logged out successfully' 
  });
});

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.mkdir(configDir, { recursive: true });
      cb(null, configDir);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.yaml' || ext === '.yml') {
      cb(null, true);
    } else {
      cb(new Error('Only YAML files are allowed'));
    }
  }
});

app.get('/api/files/list', authMiddleware, async (req, res) => {
  try {
    await fs.mkdir(configDir, { recursive: true });
    const files = await fs.readdir(configDir);
    const yamlFiles = files.filter(f => {
      const validExt = f.endsWith('.yaml') || f.endsWith('.yml');
      return validExt && isValidFilename(f);
    });
    
    const fileList = await Promise.all(
      yamlFiles.map(async (filename) => {
        const filePath = path.join(configDir, filename);
        const stats = await fs.stat(filePath);
        return {
          name: filename,
          path: filename,
          size: stats.size,
          modified: stats.mtime
        };
      })
    );
    
    res.json({ success: true, files: fileList });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to list files' });
  }
});

app.post('/api/files/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    const content = await fs.readFile(req.file.path, 'utf8');
    yaml.load(content);
    
    res.json({
      success: true,
      file: {
        name: req.file.filename,
        path: req.file.filename,
        size: req.file.size
      }
    });
  } catch (error) {
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    res.status(400).json({ success: false, error: 'Invalid YAML file: ' + error.message });
  }
});

app.get('/api/files/read/:filename', authMiddleware, async (req, res) => {
  try {
    const filename = req.params.filename;
    
    if (!isValidFilename(filename)) {
      return res.status(400).json({ success: false, error: 'Invalid filename' });
    }
    
    const filePath = path.join(configDir, filename);
    const realPath = await fs.realpath(filePath).catch(() => null);
    
    if (!realPath || !realPath.startsWith(await fs.realpath(configDir))) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const stats = await fs.stat(realPath);
    if (!stats.isFile()) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    
    const content = await fs.readFile(realPath, 'utf8');
    const config = yaml.load(content);
    
    res.json({
      success: true,
      filename,
      content,
      config
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ success: false, error: 'File not found' });
    } else {
      res.status(400).json({ success: false, error: 'Failed to read file' });
    }
  }
});

app.post('/api/files/save', authMiddleware, async (req, res) => {
  try {
    const { filename, config } = req.body;
    
    if (!filename || !config) {
      return res.status(400).json({ success: false, error: 'Missing filename or config' });
    }
    
    if (!isValidFilename(filename)) {
      return res.status(400).json({ success: false, error: 'Invalid filename' });
    }
    
    if (!(filename.endsWith('.yaml') || filename.endsWith('.yml'))) {
      return res.status(400).json({ success: false, error: 'Filename must end with .yaml or .yml' });
    }
    
    const yamlContent = yaml.dump(config, {
      indent: 2,
      lineWidth: -1,
      noRefs: true
    });
    
    const filePath = path.join(configDir, filename);
    const realConfigDir = await fs.realpath(configDir);
    const resolvedPath = path.resolve(filePath);
    
    if (!resolvedPath.startsWith(realConfigDir)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    await fs.writeFile(resolvedPath, yamlContent, 'utf8');
    
    res.json({
      success: true,
      message: 'File saved successfully',
      filename
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to save file' });
  }
});

app.post('/api/config/parse', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ success: false, error: 'No content provided' });
    }
    
    const config = yaml.load(content);
    
    res.json({
      success: true,
      config
    });
  } catch (error) {
    res.status(400).json({ success: false, error: 'Invalid YAML: ' + error.message });
  }
});

app.post('/api/config/validate', authMiddleware, async (req, res) => {
  try {
    const { config } = req.body;
    
    const errors = [];
    const warnings = [];
    
    if (!config.mode) {
      warnings.push('运行模式 (mode) 未指定，将使用默认值');
    } else if (!['rule', 'global', 'direct'].includes(config.mode)) {
      errors.push('运行模式 (mode) 必须是 rule、global 或 direct 之一');
    }
    
    if (config.port && (config.port < 1 || config.port > 65535)) {
      errors.push('HTTP端口 (port) 必须在 1-65535 之间');
    }
    
    if (config['socks-port'] && (config['socks-port'] < 1 || config['socks-port'] > 65535)) {
      errors.push('SOCKS端口 (socks-port) 必须在 1-65535 之间');
    }
    
    if (config['mixed-port'] && (config['mixed-port'] < 1 || config['mixed-port'] > 65535)) {
      errors.push('混合端口 (mixed-port) 必须在 1-65535 之间');
    }
    
    if (config.proxies) {
      if (!Array.isArray(config.proxies)) {
        errors.push('代理列表 (proxies) 必须是数组');
      } else {
        config.proxies.forEach((proxy, index) => {
          if (!proxy.name) {
            errors.push(`代理 #${index + 1}: 缺少 name 字段`);
          }
          if (!proxy.type) {
            errors.push(`代理 "${proxy.name || index + 1}": 缺少 type 字段`);
          }
          if (!proxy.server) {
            errors.push(`代理 "${proxy.name || index + 1}": 缺少 server 字段`);
          }
          if (!proxy.port) {
            errors.push(`代理 "${proxy.name || index + 1}": 缺少 port 字段`);
          } else if (proxy.port < 1 || proxy.port > 65535) {
            errors.push(`代理 "${proxy.name || index + 1}": port 必须在 1-65535 之间`);
          }
        });
      }
    } else {
      warnings.push('未配置代理 (proxies)');
    }
    
    if (config['proxy-groups']) {
      if (!Array.isArray(config['proxy-groups'])) {
        errors.push('代理组 (proxy-groups) 必须是数组');
      } else {
        config['proxy-groups'].forEach((group, index) => {
          if (!group.name) {
            errors.push(`代理组 #${index + 1}: 缺少 name 字段`);
          }
          if (!group.type) {
            errors.push(`代理组 "${group.name || index + 1}": 缺少 type 字段`);
          } else if (!['select', 'url-test', 'fallback', 'load-balance', 'relay'].includes(group.type)) {
            errors.push(`代理组 "${group.name || index + 1}": type 必须是 select、url-test、fallback、load-balance 或 relay 之一`);
          }
          if (!group.proxies || !Array.isArray(group.proxies) || group.proxies.length === 0) {
            errors.push(`代理组 "${group.name || index + 1}": 必须包含至少一个代理`);
          }
        });
      }
    } else {
      warnings.push('未配置代理组 (proxy-groups)');
    }
    
    if (config.rules) {
      if (!Array.isArray(config.rules)) {
        errors.push('规则列表 (rules) 必须是数组');
      } else if (config.rules.length === 0) {
        warnings.push('规则列表 (rules) 为空');
      } else {
        config.rules.forEach((rule, index) => {
          if (typeof rule !== 'string') {
            errors.push(`规则 #${index + 1}: 必须是字符串`);
          } else {
            const parts = rule.split(',');
            if (parts.length < 2) {
              errors.push(`规则 #${index + 1} "${rule}": 格式不正确`);
            }
          }
        });
      }
    } else {
      warnings.push('未配置规则 (rules)，所有流量将使用默认策略');
    }
    
    if (config.dns) {
      if (config.dns.enable === true) {
        if (!config.dns.nameserver || !Array.isArray(config.dns.nameserver) || config.dns.nameserver.length === 0) {
          warnings.push('DNS已启用但未配置 nameserver');
        }
      }
    }
    
    res.json({
      success: true,
      valid: errors.length === 0,
      errors,
      warnings
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/files/:filename', authMiddleware, async (req, res) => {
  try {
    const filename = req.params.filename;
    
    if (!isValidFilename(filename)) {
      return res.status(400).json({ success: false, error: 'Invalid filename' });
    }
    
    const filePath = path.join(configDir, filename);
    const realPath = await fs.realpath(filePath).catch(() => null);
    
    if (!realPath || !realPath.startsWith(await fs.realpath(configDir))) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    await fs.unlink(realPath);
    
    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ success: false, error: 'File not found' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to delete file' });
    }
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Clash Config Editor running on http://localhost:${PORT}`);
  console.log(`Config directory: ${configDir}`);
});
