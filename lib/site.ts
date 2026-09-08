// 模板内容集中配置；服务地址使用示例公共站点，部署前替换为自己的服务。
export const site = {
  name: "imsyy",
  domain: ".top",
  tagline: "静水流深 · 沧笙踏歌",
  email: "contact@imsyy.top",
  registration: "豫ICP备2022018134号-1",
  weather: {
    condition: "晴",
    temperature: 24,
    location: "杭州市 · 西湖区",
    air: "优 28",
  },
};
export const services = [
  {
    id: "blog",
    title: "博客",
    description: "思考与随笔",
    color: "green",
    category: "personal",
    href: "https://blog.imsyy.top",
  },
  {
    id: "cloud",
    title: "网盘",
    description: "私人云存储",
    color: "sky",
    category: "tools",
    href: "https://www.aliyundrive.com",
  },
  {
    id: "music",
    title: "音乐",
    description: "在线随心听",
    color: "rose",
    category: "personal",
    href: "https://music.163.com",
  },
  {
    id: "startpage",
    title: "起始页",
    description: "极简聚合搜",
    color: "teal",
    category: "tools",
    href: "https://www.bing.com",
  },
  {
    id: "bookmarks",
    title: "网址集",
    description: "常用精选站",
    color: "amber",
    category: "tools",
    href: "https://nav.imsyy.top",
  },
  {
    id: "hot",
    title: "今日热榜",
    description: "全网实时榜",
    color: "orange",
    category: "tools",
    href: "https://tophub.today",
  },
] as const;
export const quotes = [
  { text: "山风山风等等我。", author: "山风山风等等我" },
  { text: "纵有疾风起，人生不言弃。", author: "起风了" },
  { text: "给时光以生命，给岁月以文明。", author: "三体" },
  { text: "愿你所行，皆为热爱。", author: "生活手札" },
];
