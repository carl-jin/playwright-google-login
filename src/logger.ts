/**
 * 日志管理模块
 * 负责记录账号执行结果到 logs.txt 文件
 */

import fs from 'fs/promises';
import path from 'path';
import { debugLog } from './utils';

/**
 * 任务执行结果接口
 */
export interface TaskResult {
  email: string;
  success: boolean;
  error?: string;
  duration?: number;
  attempts: number;
  timestamp: Date;
}

/**
 * 日志管理器类
 */
class Logger {
  private logFilePath: string;

  constructor() {
    this.logFilePath = path.join(process.cwd(), 'logs.txt');
  }

  /**
   * 记录任务执行结果
   * @param result 任务执行结果
   */
  async logTaskResult(result: TaskResult): Promise<void> {
    try {
      const timestamp = this.formatTimestamp(result.timestamp);
      const durationInfo = result.duration ? ` (耗时: ${Math.round(result.duration / 1000)}秒)` : '';
      const attemptsInfo = result.attempts > 1 ? ` (尝试${result.attempts}次)` : '';
      
      let logEntry: string;
      
      if (result.success) {
        logEntry = `${result.email}  执行成功${durationInfo}${attemptsInfo}`;
      } else {
        const errorMessage = result.error || '未知错误';
        logEntry = `${result.email}  执行失败：${errorMessage}${attemptsInfo}`;
      }

      // 添加时间戳
      const fullLogEntry = `[${timestamp}] ${logEntry}\n`;

      // 追加到日志文件
      await fs.appendFile(this.logFilePath, fullLogEntry, 'utf8');
      
      debugLog(`日志已记录: ${logEntry.trim()}`);
      
    } catch (error) {
      console.error('❌ 写入日志文件失败:', error);
    }
  }

  /**
   * 记录批量任务开始
   * @param taskCount 任务数量
   */
  async logBatchStart(taskCount: number): Promise<void> {
    try {
      const timestamp = this.formatTimestamp(new Date());
      const logEntry = `\n=== [${timestamp}] 开始批量任务 (${taskCount}个任务) ===\n`;
      
      await fs.appendFile(this.logFilePath, logEntry, 'utf8');
      debugLog(`批量任务开始日志已记录`);
      
    } catch (error) {
      console.error('❌ 写入批量开始日志失败:', error);
    }
  }

  /**
   * 记录批量任务结束
   * @param summary 任务摘要统计
   */
  async logBatchEnd(summary: { 
    totalTasks: number; 
    successCount: number; 
    failedCount: number; 
    totalDuration: number; 
  }): Promise<void> {
    try {
      const timestamp = this.formatTimestamp(new Date());
      const logEntry = `=== [${timestamp}] 批量任务完成 - 成功:${summary.successCount} 失败:${summary.failedCount} 总耗时:${Math.round(summary.totalDuration / 1000)}秒 ===\n\n`;
      
      await fs.appendFile(this.logFilePath, logEntry, 'utf8');
      debugLog(`批量任务结束日志已记录`);
      
    } catch (error) {
      console.error('❌ 写入批量结束日志失败:', error);
    }
  }

  /**
   * 清空日志文件
   */
  async clearLogs(): Promise<void> {
    try {
      await fs.writeFile(this.logFilePath, '', 'utf8');
      debugLog('日志文件已清空');
    } catch (error) {
      console.error('❌ 清空日志文件失败:', error);
    }
  }

  /**
   * 获取日志文件路径
   */
  getLogFilePath(): string {
    return this.logFilePath;
  }

  /**
   * 格式化时间戳
   * @param date 日期对象
   */
  private formatTimestamp(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * 读取最近的日志条目
   * @param lineCount 要读取的行数，默认10行
   */
  async getRecentLogs(lineCount: number = 10): Promise<string[]> {
    try {
      const content = await fs.readFile(this.logFilePath, 'utf8');
      const lines = content.trim().split('\n').filter(line => line.trim());
      return lines.slice(-lineCount);
    } catch (error) {
      debugLog('读取日志文件失败或文件不存在');
      return [];
    }
  }

  /**
   * 检查日志文件是否存在
   */
  async logFileExists(): Promise<boolean> {
    try {
      await fs.access(this.logFilePath);
      return true;
    } catch {
      return false;
    }
  }
}

// 全局日志管理器实例
export const logger = new Logger(); 