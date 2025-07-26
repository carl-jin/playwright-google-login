/**
 * 工具函数文件
 * 包含通用的工具函数
 */

import { ChildProcess } from "child_process";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * 调试日志输出
 */
export function debugLog(...args: any[]): void {
  console.log(...args);
}

/**
 * 睡眠函数
 * @param second 睡眠秒数
 */
export function sleep(second: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, second * 1000));
}

/**
 * 跨平台关闭进程
 * @param process 要关闭的进程对象
 * @param port 可选的端口号，用于Windows平台强制关闭
 */
export async function killProcess(process: ChildProcess, port?: number): Promise<void> {
  const platform = require('os').platform();
  
  try {
    // 首先尝试优雅地关闭进程
    if (process.pid) {
      if (platform === 'win32') {
        // Windows平台：使用taskkill命令强制关闭进程树
        try {
          await execAsync(`taskkill /F /T /PID ${process.pid}`);
          debugLog(`Windows: 已强制关闭进程 ${process.pid}`);
        } catch (error) {
          debugLog(`Windows: 关闭进程 ${process.pid} 失败:`, error);
          
          // 如果指定了端口，尝试通过端口查找并关闭Chrome进程
          if (port) {
            try {
              await execAsync(`for /f "tokens=5" %a in ('netstat -aon ^| findstr :${port}') do taskkill /F /PID %a`);
              debugLog(`Windows: 已通过端口 ${port} 关闭相关进程`);
            } catch (portError) {
              debugLog(`Windows: 通过端口 ${port} 关闭进程失败:`, portError);
            }
          }
        }
      } else {
        // Unix/Linux/macOS平台：使用kill命令
        try {
          await execAsync(`kill -9 ${process.pid}`);
          debugLog(`Unix: 已强制关闭进程 ${process.pid}`);
        } catch (error) {
          debugLog(`Unix: 关闭进程 ${process.pid} 失败:`, error);
        }
      }
    }
  } catch (error) {
    debugLog(`关闭进程时发生错误:`, error);
  }
}

/**
 * 检查端口是否可用
 * @param port 端口号
 * @param timeout 超时时间（毫秒）
 */
export async function checkPortAvailable(
  port: number,
  timeout = 120000
): Promise<boolean> {
  // 使用轮询方式检查端口是否可用
  const maxAttempts = Math.ceil(timeout / 1000);
  let attempts = 0;

  // 定义检查单次端口可用性的函数
  const checkPort = async (): Promise<boolean> => {
    try {
      // 使用 fetch API 尝试连接到调试端口
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);

      const response = await fetch(`http://127.0.0.1:${port}/json/version`, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 检查响应是否成功
      if (response.status === 200) {
        const data = await response.json();
        // 验证是否包含 WebSocket 调试器 URL
        if (data && data.webSocketDebuggerUrl) {
          return true;
        }
      }
      return false;
    } catch (error) {
      // 忽略错误，表示端口尚未准备好
      return false;
    }
  };

  // 使用 do-while 循环进行轮询
  do {
    // 检查端口
    if (await checkPort()) {
      return true;
    }

    // 增加尝试次数
    attempts++;

    // 如果未达到最大尝试次数，则等待后再次尝试
    if (attempts < maxAttempts) {
      await sleep(1); // 使用已有的 sleep 函数，等待1秒
    }
  } while (attempts < maxAttempts);

  // 超过最大尝试次数，端口未能成功打开
  console.log(`端口 ${port} 在 ${timeout}ms 内未能成功打开`);
  return false;
} 