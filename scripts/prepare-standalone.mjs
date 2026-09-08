import { cpSync, existsSync, readdirSync, rmSync } from 'node:fs';

// Next.js 的文件追踪不自动复制静态资源；使产物可以直接启动。
for (const directory of ['.next/static', 'public']) {
  const destination = `.next/standalone/${directory}`;
  rmSync(destination, { recursive: true, force: true });
  if (existsSync(directory)) cpSync(directory, destination, { recursive: true });
}

// 环境变量由部署环境注入，禁止将本地密钥复制进可分发产物。
for (const name of readdirSync(".next/standalone")) {
  if (name.startsWith(".env")) rmSync(`.next/standalone/${name}`, { force: true });
}
