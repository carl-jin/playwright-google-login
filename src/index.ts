/**
 * Google登录自动化主程序
 * 使用Playwright自动化Google账户登录
 */

import { launchBrowserSession } from "./browserManager";
import { performGoogleLogin, AccountInfo } from "./googleLogin";
import { accountManager } from "./accountManager";
import { debugLog } from "./utils";

/**
 * 主函数 - 执行Google登录自动化流程
 * @param sessionId 会话ID，用于标识不同的登录任务
 * @param accountInfo 可选的账户信息，如果不提供则从 accountManager 获取第一个账户
 */
export async function main(sessionId?: string, accountInfo?: AccountInfo): Promise<void> {
  const id = sessionId || `main-${Date.now()}`;
  let loginAccount = accountInfo;
  
  try {
    debugLog(`[${id}] === 开始Google登录自动化流程 ===`);

    // 如果没有提供账户信息，从账户管理器获取第一个账户
    if (!loginAccount) {
      // 加载账户信息（如果还没有加载）
      if (accountManager.getTotalAccountCount() === 0) {
        await accountManager.loadAccounts();
      }
      
      const nextAccount = accountManager.getNextAccount();
      if (!nextAccount) {
        throw new Error('没有可用的账户信息，请检查 accounts.txt 文件');
      }
      loginAccount = nextAccount;
      
      debugLog(`[${id}] 从账户管理器获取账户: ${loginAccount.email}`);
    }

    // 启动浏览器会话
    const browserSession = await launchBrowserSession(loginAccount.email);
    debugLog(`[${id}] 浏览器会话已建立`);

    try {
      // 执行Google登录 - 必须传入账户信息
      await performGoogleLogin(browserSession.page, loginAccount);
      browserSession.page.bringToFront();
    } catch (error) {
      // 清理下浏览器
      browserSession.process.kill();
      browserSession.browser.close();
      throw error;
    }

    debugLog(`[${id}] Google登录流程完成`);
    debugLog(`[${id}] === 自动化流程执行完毕 ===`);
  } catch (error) {
    console.error(`[${id}] 自动化流程执行失败:`, error);
    throw error; // 重新抛出错误，让进程池处理重试
  }
}

// 当直接运行此文件时执行单个任务
if (require.main === module) {
  main().catch(() => process.exit(1));
}
