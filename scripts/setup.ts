#!/usr/bin/env node

/**
 * 跨平台设置脚本
 * 自动检测系统环境并配置浏览器路径
 */

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * 检测操作系统类型
 */
function getOS(): 'windows' | 'macos' | 'linux' | 'unknown' {
  const platform = process.platform;
  
  switch (platform) {
    case 'win32':
      return 'windows';
    case 'darwin':
      return 'macos';
    case 'linux':
      return 'linux';
    default:
      return 'unknown';
  }
}

/**
 * 获取默认浏览器路径
 */
async function getDefaultBrowserPaths(): Promise<string[]> {
  const os = getOS();
  
  switch (os) {
    case 'windows':
      return [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Users\\%USERNAME%\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
      ];
    
    case 'macos':
      return [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
        '/Applications/Chromium.app/Contents/MacOS/Chromium'
      ];
    
    case 'linux':
      return [
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/snap/bin/chromium',
        '/usr/bin/microsoft-edge'
      ];
    
    default:
      return [];
  }
}

/**
 * 检查文件是否存在
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * 查找可用的浏览器
 */
async function findAvailableBrowser(): Promise<string | null> {
  const defaultPaths = await getDefaultBrowserPaths();
  
  for (const browserPath of defaultPaths) {
    if (await fileExists(browserPath)) {
      return browserPath;
    }
  }
  
  // 尝试在 PATH 中查找
  const os = getOS();
  const commands = os === 'windows' 
    ? ['chrome.exe', 'msedge.exe'] 
    : ['google-chrome', 'chromium', 'microsoft-edge'];
  
  for (const command of commands) {
    try {
      const whichCommand = os === 'windows' ? 'where' : 'which';
      const { stdout } = await execAsync(`${whichCommand} ${command}`);
      const path = stdout.trim().split('\n')[0];
      if (path && await fileExists(path)) {
        return path;
      }
    } catch {
      // 命令未找到，继续尝试下一个
    }
  }
  
  return null;
}

/**
 * 生成默认配置
 */
function generateDefaultConfig(browserPath: string): any {
  const os = getOS();
  
  return {
    poolSize: 2,
    browser: {
      executablePath: browserPath,
      windowSize: "1080,720",
      language: "en-US"
    },
    timeouts: {
      portCheck: 120000,
      browserConnect: 10000
    },
    platform: {
      os: os,
      autoDetected: true,
      detectionTime: new Date().toISOString()
    }
  };
}

/**
 * 主设置函数
 */
async function setup(): Promise<void> {
  console.log('🔧 Google登录自动化系统设置向导');
  console.log('='.repeat(50));
  
  const os = getOS();
  console.log(`🖥️  检测到操作系统: ${os}`);
  
  // 检查配置文件是否存在
  const configPath = path.join(process.cwd(), 'configs.json');
  const configExists = await fileExists(configPath);
  
  if (configExists) {
    console.log('📁 发现现有配置文件');
    try {
      const existingConfig = JSON.parse(await fs.readFile(configPath, 'utf8'));
      console.log(`🌐 当前浏览器路径: ${existingConfig.browser?.executablePath || '未设置'}`);
      
      // 验证现有浏览器路径是否有效
      if (existingConfig.browser?.executablePath) {
        const pathValid = await fileExists(existingConfig.browser.executablePath);
        if (pathValid) {
          console.log('✅ 现有浏览器路径有效，无需重新配置');
          console.log('\n💡 如果需要重新配置，请删除 configs.json 后重新运行此命令');
          return;
        } else {
          console.log('⚠️  现有浏览器路径无效，开始重新配置...');
        }
      }
    } catch (error) {
      console.log('⚠️  配置文件格式错误，开始重新配置...');
    }
  }
  
  // 查找浏览器
  console.log('🔍 正在搜索可用的浏览器...');
  const browserPath = await findAvailableBrowser();
  
  if (!browserPath) {
    console.log('❌ 未找到支持的浏览器！');
    console.log('\n请手动安装以下浏览器之一:');
    console.log('  • Google Chrome');
    console.log('  • Microsoft Edge');
    console.log('  • Chromium');
    console.log('\n安装完成后请重新运行: npm run setup');
    process.exit(1);
  }
  
  console.log(`✅ 找到浏览器: ${browserPath}`);
  
  // 生成配置
  const config = generateDefaultConfig(browserPath);
  
  // 写入配置文件
  try {
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
    console.log('📝 配置文件已生成');
  } catch (error) {
    console.error('❌ 写入配置文件失败:', error);
    process.exit(1);
  }
  
  // 检查账户文件
  const accountsPath = path.join(process.cwd(), 'accounts.txt');
  const accountsExists = await fileExists(accountsPath);
  
  if (!accountsExists) {
    console.log('\n📋 创建示例账户文件...');
    const sampleAccounts = `# Google账户配置文件
# 格式：邮箱	密码	二步验证码/TOTP密钥
# 请替换为您的真实账户信息

# 示例（请删除此行并添加真实账户）:
# user@gmail.com	password123	QEJA633DACRGZM25AD6PHHHYB3MWHACW
# user2@gmail.com	password456	u5pg omhv bx23 stji 7wrw jesx l4ja lfz7
`;
    
    try {
      await fs.writeFile(accountsPath, sampleAccounts, 'utf8');
      console.log('📁 已创建 accounts.txt 示例文件');
    } catch (error) {
      console.error('❌ 创建账户文件失败:', error);
    }
  }
  
  // 创建日志文件
  const logsPath = path.join(process.cwd(), 'logs.txt');
  const logsExists = await fileExists(logsPath);
  
  if (!logsExists) {
    try {
      await fs.writeFile(logsPath, '', 'utf8');
      console.log('📝 已创建日志文件');
    } catch (error) {
      console.error('❌ 创建日志文件失败:', error);
    }
  }
  
  console.log('\n🎉 设置完成！');
  console.log('\n📋 接下来的步骤:');
  console.log('  1. 编辑 accounts.txt 文件，添加您的Google账户信息');
  console.log('  2. 运行测试: npm start');
  console.log('  3. 运行批量任务: npm run pool');
  console.log('\n💡 更多信息请查看 README-POOL.md');
}

/**
 * 显示系统信息
 */
async function showSystemInfo(): Promise<void> {
  console.log('🖥️  系统信息:');
  console.log(`   操作系统: ${getOS()}`);
  console.log(`   Node.js版本: ${process.version}`);
  console.log(`   平台: ${process.platform}`);
  console.log(`   架构: ${process.arch}`);
  
  const browserPath = await findAvailableBrowser();
  console.log(`   浏览器: ${browserPath || '未找到'}`);
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case '--info':
    case '-i':
      await showSystemInfo();
      break;
    
    case '--help':
    case '-h':
      console.log('🔧 设置向导工具');
      console.log('');
      console.log('用法:');
      console.log('  npm run setup         自动配置系统');
      console.log('  esno scripts/setup.ts --info    显示系统信息');
      break;
    
    default:
      await setup();
      break;
  }
}

// 运行主函数
main().catch(console.error); 