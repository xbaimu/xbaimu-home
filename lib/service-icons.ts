export const serviceIconNames = [
  'link', 'blog', 'cloud', 'music', 'compass', 'bookmark', 'fire', 'code',
  'image', 'video', 'book', 'game', 'tools', 'globe', 'server', 'heart',
] as const;

export type ServiceIconName = typeof serviceIconNames[number];

export const serviceIconLabels: Record<ServiceIconName, string> = {
  link: '链接', blog: '博客', cloud: '网盘', music: '音乐',
  compass: '导航', bookmark: '收藏', fire: '热榜', code: '代码',
  image: '相册', video: '视频', book: '阅读', game: '游戏',
  tools: '工具', globe: '网站', server: '服务器', heart: '喜欢',
};
