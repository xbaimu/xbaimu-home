import { connection } from 'next/server';
import Home from '@/components/home';
import { getHomeContent } from '@/lib/server/home-content';
import { version } from '@/package.json';

export const runtime = 'nodejs';

export default async function Page() {
  // 等待运行时请求，避免构建阶段创建或读取部署环境的数据库。
  await connection();
  const content = await getHomeContent();
  return <Home version={`v${version}`} content={content} />;
}
