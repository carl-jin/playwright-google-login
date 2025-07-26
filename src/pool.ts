/**
 * 进程池管理器
 * 实现批量运行Google登录任务的功能
 */

import fs from 'fs/promises';
import path from 'path';
import { main } from './index';
import { accountManager } from './accountManager';
import { AccountInfo } from './googleLogin';
import { logger, TaskResult } from './logger';
import { browserSessionManager } from './browserManager';

// 配置接口
interface PoolConfig {
  poolSize: number;
}

// 任务状态枚举
enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// 任务接口
interface Task {
  id: string;
  status: TaskStatus;
  startTime?: Date;
  endTime?: Date;
  error?: string;
  account?: AccountInfo;
}

/**
 * 从 configs.json 加载进程池配置
 */
async function loadPoolConfig(): Promise<PoolConfig> {
  try {
    const configPath = path.join(process.cwd(), 'configs.json');
    const configData = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configData);
    
    if (!config.poolSize || config.poolSize < 1) {
      throw new Error('poolSize 必须是大于0的数字');
    }
    
    return { poolSize: config.poolSize };
  } catch (error) {
    console.error('❌ 加载配置文件失败:', error);
    console.log('使用默认配置: poolSize = 2');
    return { poolSize: 2 };
  }
}

/**
 * 进程池管理器类
 */
class TaskPool {
  private config: PoolConfig;
  private tasks: Task[] = [];
  private runningTasks: Set<string> = new Set();
  private completedTasks: number = 0;
  private failedTasks: number = 0;
  private batchStartTime: number = 0;

  constructor(config: PoolConfig) {
    this.config = config;
  }

  /**
   * 添加任务到队列
   * @param taskCount 要添加的任务数量
   */
  async addTasks(taskCount: number): Promise<void> {
    // 确保账户已加载
    await accountManager.loadAccounts();
    
    const totalAccounts = accountManager.getTotalAccountCount();
    if (totalAccounts === 0) {
      throw new Error('没有可用的账户信息，请检查 accounts.txt 文件');
    }

    console.log(`📊 账户统计: 共有 ${totalAccounts} 个账户可用`);

    for (let i = 1; i <= taskCount; i++) {
      // 获取下一个可用账户
      const account = accountManager.getNextAccount();
      if (!account) {
        console.warn(`⚠️  警告: 第 ${i} 个任务无法分配账户，跳过`);
        continue;
      }

      const task: Task = {
        id: `task-${i}-${Date.now()}`,
        status: TaskStatus.PENDING,
        account: account
      };
      this.tasks.push(task);
      
      // 标记账户为已使用
      accountManager.markAccountAsUsed(account.email);
    }
    
    console.log(`\n📋 已添加 ${this.tasks.length} 个任务到队列`);
    if (this.tasks.length < taskCount) {
      console.log(`⚠️  注意: 只创建了 ${this.tasks.length}/${taskCount} 个任务（账户数量限制）`);
    }

    // 记录批量任务开始
    await logger.logBatchStart(this.tasks.length);
  }

  /**
   * 执行单个任务
   * @param task 要执行的任务
   */
  private async executeTask(task: Task): Promise<void> {
    this.runningTasks.add(task.id);
    task.status = TaskStatus.RUNNING;
    task.startTime = new Date();

    const accountInfo = task.account ? ` - ${task.account.email}` : '';
    console.log(`🚀 [${task.id}] 开始执行任务${accountInfo}`);

    try {
      await main(task.id, task.account);
      
      // 任务成功完成
      task.status = TaskStatus.COMPLETED;
      task.endTime = new Date();
      this.completedTasks++;
      
      const duration = task.endTime.getTime() - task.startTime!.getTime();
      console.log(`✅ [${task.id}] 任务完成 (耗时: ${Math.round(duration / 1000)}秒)${accountInfo}`);
      
      // 记录成功日志
      if (task.account) {
        await logger.logTaskResult({
          email: task.account.email,
          success: true,
          duration: duration,
          attempts: 1,
          timestamp: task.endTime
        });
        
        // 删除该账号的profile文件夹
        await this.removeAccountProfileFolder(task.account.email);
      }
      
    } catch (error) {
      // 任务执行失败
      task.error = error instanceof Error ? error.message : String(error);
      task.status = TaskStatus.FAILED;
      task.endTime = new Date();
      this.failedTasks++;
      
      console.log(`❌ [${task.id}] 任务失败: ${task.error}`);
      
      // 记录失败日志
      if (task.account) {
        await logger.logTaskResult({
          email: task.account.email,
          success: false,
          error: task.error,
          attempts: 1,
          timestamp: task.endTime || new Date()
        });
        
        // 删除该账号的profile文件夹
        await this.removeAccountProfileFolder(task.account.email);
      }
    } finally {
      this.runningTasks.delete(task.id);
    }
  }

  /**
   * 删除profiles文件夹
   */
  private async removeProfilesFolder(): Promise<void> {
    const profilesPath = path.join(process.cwd(), 'profiles');
    
    try {
      await fs.access(profilesPath);
      // 文件夹存在，尝试删除
      await fs.rm(profilesPath, { recursive: true, force: true });
      console.log('🗑️  已删除 ./profiles 文件夹');
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // 文件夹不存在，无需删除
        console.log('📁 ./profiles 文件夹不存在，无需删除');
      } else {
        // 其他错误
        console.warn(`⚠️  删除 ./profiles 文件夹时出现错误: ${error.message}`);
      }
    }
  }

  /**
   * 删除特定账号的profile文件夹
   * @param email 账号邮箱
   */
  private async removeAccountProfileFolder(email: string): Promise<void> {
    // 根据browserManager.ts中的generateProfilePath逻辑生成文件夹名
    const emailFolderName = email.replaceAll("@", "_").replaceAll(".", "_").trim();
    const accountProfilePath = path.join(process.cwd(), 'profiles', emailFolderName);
    
    try {
      await fs.access(accountProfilePath);
      // 文件夹存在，尝试删除
      await fs.rm(accountProfilePath, { recursive: true, force: true });
      console.log(`🗑️  已删除账号 ${email} 的 profile 文件夹`);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // 文件夹不存在，无需删除
        console.log(`📁 账号 ${email} 的 profile 文件夹不存在，无需删除`);
      } else {
        // 其他错误，记录警告但不中断流程
        console.warn(`⚠️  删除账号 ${email} 的 profile 文件夹时出现错误: ${error.message}`);
      }
    }
  }

  /**
   * 运行进程池
   */
  async run(): Promise<void> {
    // 执行前先删除profiles文件夹
    await this.removeProfilesFolder();
    
    console.log(`🔄 启动进程池 (并发数: ${this.config.poolSize})`);
    console.log(`📊 总任务数: ${this.tasks.length}`);
    console.log(`📝 日志文件: ${logger.getLogFilePath()}`);
    console.log('─'.repeat(80));

    this.batchStartTime = Date.now();

    while (this.tasks.length > 0 || this.runningTasks.size > 0) {
      // 启动新任务（在并发限制内）
      while (this.runningTasks.size < this.config.poolSize && this.tasks.length > 0) {
        const task = this.tasks.shift()!;
        
        // 不等待任务完成，立即启动下一个
        this.executeTask(task).catch(() => {
          // 错误已在 executeTask 中处理
        });
      }

      // 等待一段时间再检查状态
      await this.sleep(1000);

      // 输出当前状态
      this.printStatus();
    }

    const endTime = Date.now();
    const totalTime = endTime - this.batchStartTime;

    console.log('\n' + '='.repeat(80));
    console.log('📈 执行结果汇总:');
    console.log(`   ✅ 成功: ${this.completedTasks} 个任务`);
    console.log(`   ❌ 失败: ${this.failedTasks} 个任务`);
    console.log(`   ⏱️  总耗时: ${Math.round(totalTime / 1000)} 秒`);
    if (this.completedTasks + this.failedTasks > 0) {
      console.log(`   🏃 平均每任务: ${Math.round(totalTime / (this.completedTasks + this.failedTasks))} 秒`);
    }
    
    // 显示账户使用统计
    const accountStats = accountManager.getAccountStats();
    console.log(`   👥 账户统计: ${accountStats.used}/${accountStats.total} 已使用`);
    console.log(`   📝 日志文件: ${logger.getLogFilePath()}`);
    console.log('='.repeat(80));

    // 记录批量任务结束
    await logger.logBatchEnd({
      totalTasks: this.completedTasks + this.failedTasks,
      successCount: this.completedTasks,
      failedCount: this.failedTasks,
      totalDuration: totalTime
    });

    // 显示最近的日志条目
    console.log('\n📋 最近执行记录:');
    const recentLogs = await logger.getRecentLogs(5);
    if (recentLogs.length > 0) {
      recentLogs.forEach(log => console.log(`   ${log}`));
    } else {
      console.log('   (暂无记录)');
    }
  }

  /**
   * 输出当前状态
   */
  private printStatus(): void {
    const total = this.completedTasks + this.failedTasks;
    const running = this.runningTasks.size;
    const pending = this.tasks.length;
    
    if (running > 0 || pending > 0) {
      process.stdout.write(`\r📊 进度: ${total} 完成 | ${running} 运行中 | ${pending} 等待中`);
    }
  }

  /**
   * 延迟函数
   * @param ms 延迟毫秒数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 设置信号处理
 */
function setupSignalHandlers(): void {
  const cleanup = async (signal: string) => {
    console.log(`\n🛑 收到信号 ${signal}，开始清理...`);
    
    try {
      // 关闭所有浏览器会话
      await browserSessionManager.closeAllSessions();
      console.log('✅ 所有浏览器已关闭');
    } catch (error) {
      console.error('❌ 清理浏览器时发生错误:', error);
    }
    
    console.log('👋 程序退出');
    process.exit(0);
  };

  // 处理 Ctrl+C (SIGINT)
  process.on('SIGINT', () => cleanup('SIGINT'));
  
  // 处理 SIGTERM
  process.on('SIGTERM', () => cleanup('SIGTERM'));
  
  // 处理未捕获的异常
  process.on('uncaughtException', (error) => {
    console.error('💥 未捕获的异常:', error);
    cleanup('uncaughtException');
  });
  
  // 处理未处理的Promise拒绝
  process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 未处理的Promise拒绝:', reason);
    cleanup('unhandledRejection');
  });
}

/**
 * 主启动函数
 * @param taskCount 要执行的任务数量，默认为5
 */
export async function runPool(taskCount: number = 5): Promise<void> {
  try {
    console.log('🎯 Google登录批量自动化系统');
    console.log('='.repeat(50));

    // 设置信号处理
    setupSignalHandlers();

    // 加载配置
    const config = await loadPoolConfig();
    console.log(`⚙️  进程池大小: ${config.poolSize}`);

    // 创建进程池
    const pool = new TaskPool(config);
    
    // 添加任务
    await pool.addTasks(taskCount);
    
    // 运行进程池
    await pool.run();
    
  } catch (error) {
    console.error('💥 进程池执行失败:', error);
    process.exit(1);
  }
}

// 当直接运行此文件时启动进程池
if (require.main === module) {
  // 从命令行参数获取任务数量
  const taskCount = process.argv[2] ? parseInt(process.argv[2]) : 5;
  
  if (isNaN(taskCount) || taskCount < 1) {
    console.error('❌ 任务数量必须是大于0的数字');
    console.log('用法: npm run pool [任务数量]');
    process.exit(1);
  }
  
  runPool(taskCount);
} 