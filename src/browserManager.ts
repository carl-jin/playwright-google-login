/**
 * 浏览器管理模块
 * 负责浏览器的启动、连接和配置
 */

import getPort from "get-port";
import path from "path";
import { exec, ChildProcess } from "child_process";
import { chromium, Browser, Page } from "@playwright/test";
import fs from "fs/promises";
import { debugLog, checkPortAvailable } from "./utils";

/**
 * 浏览器启动结果接口
 */
export interface BrowserSession {
  browser: Browser;
  page: Page;
  port: number;
  profilePath: string;
  process: ChildProcess;
}

/**
 * 从 configs.json 加载配置
 */
async function loadConfigs(): Promise<any> {
  try {
    const configPath = path.join(process.cwd(), "configs.json");
    const configData = await fs.readFile(configPath, "utf8");
    return JSON.parse(configData);
  } catch (error) {
    // 返回默认配置
    return {
      browser: {
        executablePath:
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        windowSize: "1080,720",
        language: "en-US",
      },
      timeouts: {
        portCheck: 120000,
        browserConnect: 10000,
      },
    };
  }
}

/**
 * 启动并连接到Chrome浏览器
 * @returns BrowserSession 浏览器会话对象
 */
export async function launchBrowserSession(
  email: string
): Promise<BrowserSession> {
  const configs = await loadConfigs();
  const port = await getPort();
  const profilePath = generateProfilePath(email);

  debugLog(`准备启动浏览器，端口: ${port} 邮箱: ${email}`);

  // 启动浏览器进程
  const browserProcess = launchBrowserProcess(port, profilePath, configs, email);

  // 等待浏览器启动完成
  await waitForBrowserReady(port, configs);

  // 连接到浏览器
  const browser = await connectToBrowser(port, configs);

  // 获取页面
  const page = await getPage(browser);

  return {
    browser,
    page,
    port,
    profilePath,
    process: browserProcess,
  };
}

/**
 * 生成随机的配置文件路径
 */
function generateProfilePath(email: string): string {
  return path.join(
    __dirname,
    "../",
    "profiles",
    `${email.replaceAll("@", "_").replaceAll(".", "_").trim()}`,
    `profile-${Math.random().toString(36).substring(2, 15)}`
  );
}

/**
 * 启动浏览器进程
 * @param port 调试端口
 * @param profilePath 配置文件路径
 * @param configs 配置对象
 * @param email 邮箱地址
 */
function launchBrowserProcess(
  port: number,
  profilePath: string,
  configs: any,
  email: string
): ChildProcess {
  // 计算窗口位置，避免重叠
  const windowPosition = calculateWindowPosition(port, email);
  
  const launchArgs = [
    `--user-data-dir="${path.dirname(profilePath)}"`,
    `--profile-directory="${path.basename(profilePath)}"`,
    `--remote-debugging-port=${port}`,
    `--no-first-run`,
    `--width=1080`,
    `--height=720`,
    `--window-position=${windowPosition.x},${windowPosition.y}`,
    `--window-name=${path.basename(profilePath)}`,
    `--no-default-browser-check`,
    `--disable-extensions-file-access-check`,
    `--disable-save-password-bubble`,
    `--disable-prompt-on-repost`,
    `--window-size=${configs.browser?.windowSize || "1080,720"}`,
    `--lang=${configs.browser?.language || "en-US"}`,
  ];

  const executablePath =
    configs.browser?.executablePath ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const command = [`"${executablePath}"`, ...launchArgs].join(" ");

  const browserProcess = exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`执行命令时出错: ${error.message}`);
      return;
    }
    if (stderr) {
      debugLog(`命令stderr输出: ${stderr}`);
    }
    if (stdout) {
      debugLog(`命令stdout输出: ${stdout}`);
    }
  });

  return browserProcess;
}

/**
 * 计算窗口位置，避免重叠
 * @param port 调试端口
 * @param email 邮箱地址，用于增加位置分散度
 */
function calculateWindowPosition(port: number, email?: string): { x: number; y: number } {
  // 结合端口号和邮箱创建更好的哈希值
  let hash = port;
  if (email) {
    // 使用邮箱字符串创建哈希值
    for (let i = 0; i < email.length; i++) {
      hash = ((hash << 5) - hash + email.charCodeAt(i)) & 0xffffffff;
    }
  }
  
  // 使用哈希值的不同部分来计算 x 和 y 偏移
  const xOffset = Math.abs(hash) % 8; // 0-7 的偏移范围
  const yOffset = Math.abs(hash >> 8) % 6; // 0-5 的偏移范围，y方向偏移少一些
  
  // 设置基础位置和更大的偏移量
  const baseX = 50;
  const baseY = 50;
  const xOffsetStep = 150; // 每个窗口 x 方向偏移150像素
  const yOffsetStep = 120; // 每个窗口 y 方向偏移120像素
  
  const x = baseX + (xOffset * xOffsetStep);
  const y = baseY + (yOffset * yOffsetStep);
  
  // 确保窗口不会超出屏幕范围（假设屏幕宽度至少1920，高度至少1080）
  const maxX = 1920 - 1080 - 50; // 屏幕宽度 - 窗口宽度 - 边距
  const maxY = 1080 - 720 - 100;  // 屏幕高度 - 窗口高度 - 边距
  
  return {
    x: Math.min(x, maxX),
    y: Math.min(y, maxY)
  };
}

/**
 * 等待浏览器准备就绪
 * @param port 调试端口
 * @param configs 配置对象
 */
async function waitForBrowserReady(port: number, configs: any): Promise<void> {
  try {
    const timeout = configs.timeouts?.portCheck || 120000;
    const isPortAvailable = await checkPortAvailable(port, timeout);
    if (!isPortAvailable) {
      throw new Error(`浏览器启动超时 端口 ${port} 未能成功打开`);
    }

    debugLog(`浏览器启动成功 端口 ${port}`);
  } catch (error) {
    console.error(error.message);
    throw error;
  }
}

/**
 * 连接到远程浏览器
 * @param port 调试端口
 * @param configs 配置对象
 */
async function connectToBrowser(port: number, configs: any): Promise<Browser> {
  debugLog(`连接到远程浏览器: http://127.0.0.1:${port}`);

  const timeout = configs.timeouts?.browserConnect || 10000;
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, {
    timeout: timeout,
  });

  return browser;
}

/**
 * 获取浏览器页面
 * @param browser 浏览器实例
 */
async function getPage(browser: Browser): Promise<Page> {
  // 使用已有的上下文
  const context = browser.contexts()[0];
  // 创建新页面
  const page = await context.newPage();

  return page;
}
