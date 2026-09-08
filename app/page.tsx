import Home from '@/components/home';
import { version } from '@/package.json';

// 在构建时静态生成，版本号随本次构建固定。
export const dynamic = 'force-static';

export default function Page() { return <Home version={`v${version}`} />; }
