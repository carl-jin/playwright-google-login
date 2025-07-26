/**
 * 工具函数文件
 * 包含通用的工具函数
 */

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