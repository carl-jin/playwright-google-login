/**
 * 账户管理模块
 * 负责读取和管理 accounts.txt 中的账户信息
 */

import fs from 'fs/promises';
import path from 'path';
import { debugLog } from './utils';

// 账户信息接口
export interface AccountInfo {
  email: string;
  password: string;
  twoStepCode: string;
  isTotp: boolean; // 是否是 TOTP 格式的二步验证码
}

/**
 * 账户管理器类
 */
export class AccountManager {
  private accounts: AccountInfo[] = [];
  private usedAccounts: Set<string> = new Set();

  /**
   * 加载账户文件
   */
  async loadAccounts(): Promise<void> {
    try {
      const accountsPath = path.join(process.cwd(), 'accounts.txt');
      const content = await fs.readFile(accountsPath, 'utf8');
      
      this.accounts = this.parseAccounts(content);
      debugLog(`账户管理器：成功加载 ${this.accounts.length} 个账户`);
      
    } catch (error) {
      console.error('❌ 加载账户文件失败:', error);
      throw new Error('无法加载账户文件 accounts.txt');
    }
  }

  /**
   * 解析账户文件内容
   */
  private parseAccounts(content: string): AccountInfo[] {
    const lines = content.split('\n').filter(line => line.trim());
    const accounts: AccountInfo[] = [];

    for (const line of lines) {
      try {
        const parts = line.split('\t').map(part => part.trim());
        
        if (parts.length >= 3) {
          const email = parts[0];
          const password = parts[1];
          const twoStepCode = parts[2];

          // 判断是否是 TOTP 格式（通常是大写字母和数字的组合，长度较长）
          const isTotp = /^[A-Z0-9]{16,}$/.test(twoStepCode.replace(/\s/g, ''));

          accounts.push({
            email,
            password,
            twoStepCode,
            isTotp
          });
        }
      } catch (error) {
        console.warn(`⚠️  解析账户行失败: ${line}`);
      }
    }

    return accounts;
  }

  /**
   * 获取下一个可用账户
   */
  getNextAccount(): AccountInfo | null {
    // 找到第一个未使用的账户
    for (const account of this.accounts) {
      if (!this.usedAccounts.has(account.email)) {
        return account;
      }
    }

    // 如果所有账户都用过了，重置使用记录
    if (this.usedAccounts.size === this.accounts.length) {
      debugLog('账户管理器：所有账户已使用完毕，重置使用记录');
      this.usedAccounts.clear();
      return this.accounts.length > 0 ? this.accounts[0] : null;
    }

    return null;
  }

  /**
   * 标记账户为已使用
   */
  markAccountAsUsed(email: string): void {
    this.usedAccounts.add(email);
  }

  /**
   * 重置账户使用状态
   */
  resetAccountUsage(): void {
    this.usedAccounts.clear();
    debugLog('账户管理器：已重置所有账户使用状态');
  }

  /**
   * 获取账户总数
   */
  getTotalAccountCount(): number {
    return this.accounts.length;
  }

  /**
   * 获取可用账户数量
   */
  getAvailableAccountCount(): number {
    return this.accounts.length - this.usedAccounts.size;
  }

  /**
   * 获取账户使用统计
   */
  getAccountStats(): { total: number; used: number; available: number } {
    return {
      total: this.accounts.length,
      used: this.usedAccounts.size,
      available: this.accounts.length - this.usedAccounts.size
    };
  }
}

// 全局账户管理器实例
export const accountManager = new AccountManager(); 