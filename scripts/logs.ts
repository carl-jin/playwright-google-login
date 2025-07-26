#!/usr/bin/env node

/**
 * 跨平台日志管理脚本
 * 替代平台特定的 cat/tail 命令
 */

import fs from 'fs/promises';
import path from 'path';

const LOGS_FILE = path.join(process.cwd(), 'logs.txt');

/**
 * 显示完整日志内容
 */
async function showLogs(): Promise<void> {
  try {
    const content = await fs.readFile(LOGS_FILE, 'utf8');
    if (content.trim()) {
      console.log(content);
    } else {
      console.log('日志文件为空');
    }
  } catch (error) {
    console.log('日志文件不存在或无法读取');
  }
}

/**
 * 实时监控日志（模拟 tail -f）
 */
async function tailLogs(): Promise<void> {
  console.log('🔍 实时监控日志文件 (按 Ctrl+C 退出)');
  console.log('─'.repeat(50));

  let lastSize = 0;
  
  // 检查文件是否存在，如果不存在则创建
  try {
    await fs.access(LOGS_FILE);
  } catch {
    await fs.writeFile(LOGS_FILE, '', 'utf8');
    console.log('📝 日志文件已创建');
  }

  // 首次显示现有内容
  try {
    const stats = await fs.stat(LOGS_FILE);
    if (stats.size > 0) {
      const content = await fs.readFile(LOGS_FILE, 'utf8');
      const lines = content.trim().split('\n');
      // 显示最后10行
      const recentLines = lines.slice(-10);
      if (recentLines.length > 0) {
        console.log('📋 最近的日志记录:');
        recentLines.forEach(line => line.trim() && console.log(line));
        console.log('─'.repeat(50));
      }
    }
    lastSize = stats.size;
  } catch (error) {
    console.log('读取日志文件失败:', error);
  }

  // 开始监控
  const interval = setInterval(async () => {
    try {
      const stats = await fs.stat(LOGS_FILE);
      if (stats.size > lastSize) {
        // 文件有新内容
        const content = await fs.readFile(LOGS_FILE, 'utf8');
        const newContent = content.substring(lastSize);
        const newLines = newContent.split('\n').filter(line => line.trim());
        
        newLines.forEach(line => {
          console.log(line);
        });
        
        lastSize = stats.size;
      }
    } catch (error) {
      // 文件可能被删除或移动，忽略错误
    }
  }, 1000);

  // 处理退出信号
  process.on('SIGINT', () => {
    clearInterval(interval);
    console.log('\n👋 停止监控日志');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    clearInterval(interval);
    process.exit(0);
  });
}

/**
 * 清空日志文件
 */
async function clearLogs(): Promise<void> {
  try {
    await fs.writeFile(LOGS_FILE, '', 'utf8');
    console.log('✅ 日志文件已清空');
  } catch (error) {
    console.error('❌ 清空日志文件失败:', error);
    process.exit(1);
  }
}

/**
 * 显示日志统计信息
 */
async function showStats(): Promise<void> {
  try {
    const content = await fs.readFile(LOGS_FILE, 'utf8');
    const lines = content.trim().split('\n').filter(line => line.trim());
    
    let successCount = 0;
    let failureCount = 0;
    let batchCount = 0;
    
    lines.forEach(line => {
      if (line.includes('执行成功')) successCount++;
      else if (line.includes('执行失败')) failureCount++;
      else if (line.includes('开始批量任务')) batchCount++;
    });
    
    console.log('📊 日志统计信息:');
    console.log(`   📝 总记录数: ${lines.length}`);
    console.log(`   ✅ 成功任务: ${successCount}`);
    console.log(`   ❌ 失败任务: ${failureCount}`);
    console.log(`   🚀 批量任务: ${batchCount}`);
    console.log(`   📍 文件位置: ${LOGS_FILE}`);
    
  } catch (error) {
    console.log('日志文件不存在或无法读取');
  }
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case '--tail':
    case '-f':
      await tailLogs();
      break;
    
    case '--clear':
    case '-c':
      await clearLogs();
      break;
    
    case '--stats':
    case '-s':
      await showStats();
      break;
    
    case '--help':
    case '-h':
      console.log('📝 日志管理工具');
      console.log('');
      console.log('用法:');
      console.log('  npm run logs          显示完整日志');
      console.log('  npm run logs:tail     实时监控日志');
      console.log('  npm run logs:clear    清空日志文件');
      console.log('  esno scripts/logs.ts --stats  显示统计信息');
      break;
    
    default:
      await showLogs();
      break;
  }
}

// 运行主函数
main().catch(console.error); 