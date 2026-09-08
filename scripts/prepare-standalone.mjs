import { cpSync, existsSync, rmSync } from 'node:fs';

// Next.js 的文件追踪不自动复制静态资源；使产物可以直接启动。
for (const directory of ['.next/static', 'public']) {
  const destination = `.next/standalone/${directory}`;
  rmSync(destination, { recursive: true, force: true });
  if (existsSync(directory)) cpSync(directory, destination, { recursive: true });
}
