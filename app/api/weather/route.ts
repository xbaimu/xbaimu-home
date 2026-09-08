import { getWeather } from '@/lib/server/weather';
import { json } from '@/lib/server/admin-http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return json(await getWeather());
  } catch {
    return json({ status: 'unavailable' });
  }
}
