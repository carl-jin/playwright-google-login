# Google登录批量自动化系统

> 🌍 **跨平台支持**: 现已支持 Windows、macOS 和 Linux 系统！  
> 📖 **详细的跨平台指南**: 查看 [README-CROSS-PLATFORM.md](./README-CROSS-PLATFORM.md)

## 功能特性

这个进程池系统为Google登录自动化提供了批量处理能力，具备以下特性：

### 🚀 主要功能
1. **并发控制**: 根据 `configs.json` 中的 `poolSize` 配置同时运行的任务数量
2. **智能账户管理**: 自动从 `accounts.txt` 读取账户信息并分配给任务
3. **友好输出**: 实时显示每个任务的执行状态和进度
4. **自动重试**: 任务失败后自动重试，最多重试3次
5. **详细统计**: 显示成功/失败数量、总耗时、平均耗时、账户使用统计
6. **完整日志**: 自动记录每个账户的执行结果到 `logs.txt` 文件
7. **跨平台兼容**: 支持 Windows、macOS 和 Linux 系统

### ⚙️ 配置文件

#### configs.json
在项目根目录的 `configs.json` 中配置系统参数：

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
  }
}
```

**配置说明：**
- `poolSize`: 同时运行的最大任务数（建议根据系统性能设置，一般2-4个）
- `browser.executablePath`: Chrome浏览器的可执行文件路径
- `browser.windowSize`: 浏览器窗口大小
- `browser.language`: 浏览器语言设置
- `timeouts.portCheck`: 端口检查超时时间（毫秒）
- `timeouts.browserConnect`: 浏览器连接超时时间（毫秒）

#### accounts.txt
在项目根目录的 `accounts.txt` 中配置账户信息，每行一个账户：

```
账户邮箱	密码	二步验证码/TOTP密钥
```

**示例：**
```
user1@gmail.com	password123	QEJA633DACRGZM25AD6PHHHYB3MWHACW
user2@gmail.com	password456	u5pg omhv bx23 stji 7wrw jesx l4ja lfz7
user3@gmail.com	password789	IHBQSRIR6SOJP4MW6UF73UPT7X2YCKZC
```

**账户格式说明：**
- 使用 **Tab** 分隔符分隔各字段
- **TOTP密钥**: 大写字母和数字组合，系统会自动生成验证码
- **应用专用密码**: 带空格的格式，系统会直接使用

## 🚀 快速开始

### 首次设置 (必须)

```bash
# 安装依赖
npm install

# 自动配置系统 (检测操作系统和浏览器)
npm run setup
```

## 使用方法

### 方法一：使用 npm 脚本

```bash
# 运行进程池，默认5个任务
npm run pool

# 自定义任务数量
npm run pool:custom 3
```

### 方法二：直接运行 TypeScript 文件

```bash
# 使用默认设置（5个任务）
npx esno src/pool.ts

# 指定任务数量
npx esno src/pool.ts 8

# 使用启动脚本
npx esno run-pool.ts 3
```

### 方法三：单个任务运行

```bash
# 运行单个登录任务（会自动选择账户）
npm start
```

### 方法四：日志管理 (跨平台)

```bash
# 查看完整日志
npm run logs

# 实时查看日志（跟踪模式）
npm run logs:tail

# 清空日志文件
npm run logs:clear

# 显示日志统计
esno scripts/logs.ts --stats
```

### 方法五：系统管理

```bash
# 重新配置系统
npm run setup

# 查看系统信息
esno scripts/setup.ts --info
```

## 输出示例

```
🎯 Google登录批量自动化系统
==================================================
⚙️  进程池大小: 2
📊 账户统计: 共有 15 个账户可用

📋 已添加 5 个任务到队列
🔄 启动进程池 (并发数: 2)
📊 总任务数: 5
────────────────────────────────────────────────

🚀 [task-1-1234567890] 开始执行任务 - user1@gmail.com
🚀 [task-2-1234567891] 开始执行任务 - user2@gmail.com
📊 进度: 0 完成 | 2 运行中 | 3 等待中
✅ [task-1-1234567890] 任务完成 (耗时: 45秒) - user1@gmail.com
⚠️  [task-2-1234567891] 任务失败，准备重试 (1/3): 登录超时
🚀 [task-3-1234567892] 开始执行任务 - user3@gmail.com
🚀 [task-2-1234567891] 开始执行任务 (重试 1/3) - user2@gmail.com
...

================================================================================
📈 执行结果汇总:
   ✅ 成功: 4 个任务
   ❌ 失败: 1 个任务
   ⏱️  总耗时: 180 秒
   🏃 平均每任务: 36 秒
   👥 账户统计: 5/15 已使用
================================================================================
```

## 账户管理系统

### 账户分配策略
- **轮询分配**: 系统会按顺序分配账户给任务
- **防重复使用**: 每个账户在一轮任务中只使用一次
- **自动循环**: 当所有账户都使用过后，会重置使用状态重新分配

### 账户状态说明
- 🚀 **开始执行**: 任务开始运行，显示使用的账户
- ✅ **任务完成**: 任务成功完成，显示账户信息
- ⚠️ **准备重试**: 任务失败，正在准备重试（重试时会使用相同账户）
- ❌ **最终失败**: 任务经过3次重试后仍然失败

### TOTP支持
系统自动识别 TOTP 密钥格式：
- **TOTP密钥**: 16位以上的大写字母和数字组合
- **应用专用密码**: 其他格式的字符串

## 重试机制

- 每个任务最多尝试 **3次** （1次初始 + 2次重试）
- 重试间隔：2秒
- 重试时使用相同的账户信息
- 重试时会显示当前重试次数

## 注意事项

1. **账户配置**: 请确保 `accounts.txt` 文件格式正确，使用Tab分隔符
2. **系统资源**: 请根据系统性能合理设置 `poolSize`，过多的并发可能导致浏览器资源不足
3. **网络稳定性**: 确保网络连接稳定，避免因网络问题导致任务失败
4. **账户安全**: 请确保账户信息正确，避免因登录问题导致账户被锁定
5. **浏览器路径**: 确认 `configs.json` 中的浏览器路径正确

## 故障排除

### 常见问题

1. **配置文件加载失败**
   - 检查 `configs.json` 文件是否存在
   - 确认 JSON 格式是否正确

2. **账户文件加载失败**
   - 检查 `accounts.txt` 文件是否存在
   - 确认文件使用 Tab 分隔符而不是空格
   - 检查账户格式是否正确

3. **任务全部失败**
   - 检查账户信息是否正确
   - 确认浏览器路径是否正确
   - 检查网络连接

4. **内存不足**
   - 降低 `poolSize` 值
   - 关闭其他占用内存的应用程序

5. **账户不够分配**
   - 检查 `accounts.txt` 中的账户数量
   - 减少要运行的任务数量

### 调试模式

如果需要查看详细的执行日志，可以单独运行任务：

```bash
npm start
```

这将运行单个任务并显示详细的调试信息。

## 日志系统

### 日志格式

系统会自动将每个账户的执行结果记录到 `logs.txt` 文件中，格式如下：

```
[时间戳] 账户邮箱  执行结果 (附加信息)
```

**成功示例：**
```
[2024-07-26 15:30:45] xiaw9352@gmail.com  执行成功 (耗时: 45秒)
[2024-07-26 15:31:20] user2@gmail.com  执行成功 (耗时: 38秒) (尝试2次)
```

**失败示例：**
```
[2024-07-26 15:31:32] zhaoj3304@gmail.com  执行失败：账号密码不正确 (尝试3次)
[2024-07-26 15:32:15] user4@gmail.com  执行失败：登录超时 (尝试3次)
```

### 日志内容说明

- **时间戳**: 任务完成的具体时间
- **账户邮箱**: 执行任务使用的账户
- **执行结果**: 成功或失败（失败会显示具体原因）
- **耗时信息**: 成功任务显示执行耗时
- **重试信息**: 显示实际尝试次数（超过1次时显示）

### 日志文件管理

```bash
# 查看完整日志内容
npm run logs

# 实时监控日志（适合在任务运行时查看）
npm run logs:tail

# 清空日志文件
npm run logs:clear

# 直接查看日志文件
cat logs.txt

# 查看最近10条记录
tail -n 10 logs.txt
```

## 文件结构

```
├── src/
│   ├── index.ts          # 主函数（支持账户参数和日志记录）
│   ├── pool.ts           # 进程池管理器（集成日志）
│   ├── accountManager.ts # 账户管理器（新增）
│   ├── config.ts         # 配置管理器（重构）
│   ├── logger.ts         # 日志管理器（新增）
│   ├── googleLogin.ts    # Google登录逻辑
│   ├── browserManager.ts # 浏览器管理器
│   └── ...               # 其他工具模块
├── scripts/
│   ├── setup.ts          # 跨平台设置脚本（新增）
│   ├── logs.ts           # 跨平台日志管理（新增）
│   └── ...               # 其他脚本
├── configs.json          # 系统配置文件
├── accounts.txt          # 账户信息文件
├── logs.txt              # 执行日志文件（自动生成）
├── run-pool.ts           # 启动脚本
├── README-POOL.md        # 本说明文档
├── README-CROSS-PLATFORM.md # 跨平台使用指南（新增）
└── package.json          # 项目配置
```

## 🌍 跨平台支持

本系统现已全面支持：

- **Windows 10/11**: 自动检测 Chrome/Edge 浏览器
- **macOS 10.15+**: 支持 Chrome/Edge/Chromium
- **Linux**: 支持各种发行版的 Chrome/Chromium

### 平台特定说明

#### Windows 用户
- 确保安装了 Google Chrome 或 Microsoft Edge
- 运行 `npm run setup` 自动配置
- 所有命令都支持 PowerShell 和 CMD

#### macOS 用户  
- 支持从 App Store 或官网安装的浏览器
- 自动处理应用程序路径和权限

#### Linux 用户
- 支持 apt、yum、snap 等包管理器安装的浏览器
- 自动检测系统浏览器路径

### 迁移和兼容性

- **无缝迁移**: 现有配置文件自动兼容
- **智能检测**: 自动识别系统环境并优化配置
- **向后兼容**: 保持所有原有功能不变

📖 **完整的跨平台使用指南**: [README-CROSS-PLATFORM.md](./README-CROSS-PLATFORM.md) 