import { cookieOptions, sessionCookie } from "@/lib/server/auth";
import { json, sameOrigin } from "@/lib/server/admin-http";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "请求来源不受信任" }, 403);
  const response = json({ ok: true });
  response.cookies.set(sessionCookie, "", { ...cookieOptions(), maxAge: 0 });
  return response;
}
