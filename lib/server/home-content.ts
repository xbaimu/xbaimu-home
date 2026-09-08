import 'server-only';
import { revalidateTag, unstable_cache } from 'next/cache';
import { databasePath, getDatabase, readContent, writeContent } from './database';
import type { HomeContent } from '../site-types';

const contentTag = 'home-content';

export function getHomeContent() {
  return unstable_cache(
    async () => readContent(getDatabase(), true),
    ['home-content-v1', databasePath()],
    { tags: [contentTag], revalidate: false },
  )();
}

// 由已验证 JWT 的设置接口调用，事务提交后使首页数据缓存立即失效。
export function saveHomeContent(content: HomeContent) {
  writeContent(getDatabase(), content);
  revalidateTag(contentTag, { expire: 0 });
}
