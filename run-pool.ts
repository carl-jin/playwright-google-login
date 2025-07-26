#!/usr/bin/env npx ts-node

/**
 * 进程池启动脚本
 * 用于快速启动Google登录批量自动化任务
 */

import { runPool } from './src/pool';

async function main() {
  // 从命令行参数获取任务数量
  const args = process.argv.slice(2);
  let taskCount = 5; // 默认5个任务

  if (args.length > 0) {
    const parsed = parseInt(args[0]);
    if (isNaN(parsed) || parsed < 1) {
      console.error('❌ 错误: 任务数量必须是大于0的整数');
      console.log('\n使用方法:');
      console.log('  npx ts-node run-pool.ts [任务数量]');
      console.log('\n例子:');
      console.log('  npx ts-node run-pool.ts 3    # 运行3个任务');
      console.log('  npx ts-node run-pool.ts      # 运行5个任务（默认）');
      process.exit(1);
    }
    taskCount = parsed;
  }

  console.log('🎯 Google登录批量自动化系统');
  console.log(`📝 准备运行 ${taskCount} 个登录任务`);
  console.log('='.repeat(50));

  try {
    await runPool(taskCount);
  } catch (error) {
    console.error('💥 运行失败:', error);
    process.exit(1);
  }
}

// 运行主函数
main(); 