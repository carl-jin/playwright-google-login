# 跨平台使用指南

## 🌍 支持的平台

Google登录批量自动化系统现已支持以下操作系统：

- **Windows** (Windows 10/11)
- **macOS** (10.15+)
- **Linux** (Ubuntu, Debian, CentOS 等)

## 🚀 快速开始

### 1. 首次安装

```bash
# 克隆或下载项目后
npm install

# 自动检测系统并配置
npm run setup
```

### 2. 运行测试

```bash
# 运行单个任务测试
npm start

# 运行批量任务
npm run pool

# 自定义任务数量
npm run pool:custom 3
```

## ⚙️ 自动配置

运行 `npm run setup` 会自动：

1. **检测操作系统类型**
2. **搜索可用的浏览器**
3. **生成适合的配置文件**
4. **创建必要的文件结构**

### 支持的浏览器

#### Windows
- Google Chrome
- Microsoft Edge
- Chromium

#### macOS
- Google Chrome
- Microsoft Edge
- Chromium

#### Linux
- Google Chrome
- Chromium
- Microsoft Edge (如果已安装)

## 📁 跨平台文件管理

### 日志管理 (替代 cat/tail 命令)

```bash
# 查看完整日志 (跨平台)
npm run logs

# 实时监控日志 (跨平台 tail -f)
npm run logs:tail

# 清空日志文件 (跨平台)
npm run logs:clear

# 显示日志统计
esno scripts/logs.ts --stats
```

### 系统信息

```bash
# 查看系统信息
esno scripts/setup.ts --info
```

输出示例：
```
🖥️  系统信息:
   操作系统: windows
   Node.js版本: v18.17.0
   平台: win32
   架构: x64
   浏览器: C:\Program Files\Google\Chrome\Application\chrome.exe
```

## 🔧 平台特定配置

### Windows 配置示例

```json
{
  "poolSize": 2,
  "browser": {
    "executablePath": "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "windowSize": "1080,720",
    "language": "en-US"
  },
  "timeouts": {
    "portCheck": 120000,
    "browserConnect": 10000
  },
  "platform": {
    "os": "windows",
    "autoDetected": true,
    "detectionTime": "2024-07-26T15:30:45.123Z"
  }
}
```

### macOS 配置示例

```json
{
  "poolSize": 2,
  "browser": {
    "executablePath": "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "windowSize": "1080,720",
    "language": "en-US"
  },
  "timeouts": {
    "portCheck": 120000,
    "browserConnect": 10000
  },
  "platform": {
    "os": "macos",
    "autoDetected": true,
    "detectionTime": "2024-07-26T15:30:45.123Z"
  }
}
```

### Linux 配置示例

```json
{
  "poolSize": 2,
  "browser": {
    "executablePath": "/usr/bin/google-chrome",
    "windowSize": "1080,720",
    "language": "en-US"
  },
  "timeouts": {
    "portCheck": 120000,
    "browserConnect": 10000
  },
  "platform": {
    "os": "linux",
    "autoDetected": true,
    "detectionTime": "2024-07-26T15:30:45.123Z"
  }
}
```

## 🛠️ 手动配置

如果自动检测失败，您可以手动配置：

### 1. 找到浏览器路径

#### Windows
```cmd
# 在命令提示符中运行
where chrome.exe
where msedge.exe
```

#### macOS/Linux
```bash
# 在终端中运行
which google-chrome
which chromium
```

### 2. 更新配置文件

编辑 `configs.json` 文件，更新 `browser.executablePath` 字段：

```json
{
  "browser": {
    "executablePath": "您的浏览器路径"
  }
}
```

## 📝 脚本功能对比

| 功能 | 原来 (Unix/Linux/macOS) | 现在 (跨平台) |
|------|-------------------------|---------------|
| 查看日志 | `cat logs.txt` | `npm run logs` |
| 实时监控 | `tail -f logs.txt` | `npm run logs:tail` |
| 清空日志 | `echo '' > logs.txt` | `npm run logs:clear` |
| 系统配置 | 手动配置 | `npm run setup` |

## 🚨 故障排除

### 浏览器未找到

如果设置脚本无法找到浏览器：

1. **确认浏览器已安装**
2. **手动指定路径**：编辑 `configs.json`
3. **检查权限**：确保有执行浏览器的权限

### Windows 特定问题

#### 路径包含空格
```json
{
  "browser": {
    "executablePath": "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
  }
}
```

#### 权限问题
- 确保以管理员身份运行终端（如果需要）
- 检查防病毒软件是否阻止执行

### Linux 特定问题

#### 缺少依赖
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install google-chrome-stable

# CentOS/RHEL
sudo yum install google-chrome-stable
```

#### 显示服务器问题
```bash
# 如果在无头服务器上运行，需要虚拟显示
export DISPLAY=:99
```

## 📊 环境变量支持

系统支持以下环境变量：

```bash
# 跨平台设置
cross-env NODE_ENV=production npm start

# 自定义浏览器路径
cross-env BROWSER_PATH="/path/to/browser" npm start
```

## 🔄 迁移指南

### 从旧版本迁移

1. **备份现有配置**
   ```bash
   cp configs.json configs.json.backup
   ```

2. **运行设置脚本**
   ```bash
   npm run setup
   ```

3. **验证配置**
   ```bash
   npm start
   ```

## 📚 开发者信息

### 使用的跨平台包

- **cross-env**: 跨平台环境变量设置
- **shx**: 跨平台 shell 命令
- **Node.js path**: 跨平台路径处理
- **Node.js fs**: 跨平台文件操作

### 代码结构

```
scripts/
├── setup.ts      # 跨平台设置脚本
├── logs.ts       # 跨平台日志管理
└── ...

src/
├── config.ts     # 跨平台配置加载
└── ...
```

## 🤝 贡献

如果您在其他平台上遇到问题或有改进建议，请：

1. 提交 Issue
2. 提供系统信息：`esno scripts/setup.ts --info`
3. 描述具体问题和错误信息

---

💡 **提示**: 始终运行 `npm run setup` 来确保最佳的跨平台兼容性！ 