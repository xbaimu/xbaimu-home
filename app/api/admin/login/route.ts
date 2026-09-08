import {
  authConfigured,
  allowLoginAttempt,
  checkAdminKey,
  cookieOptions,
  createSession,
  sessionCookie,
} from "@/lib/server/auth";
import {
  handleError,
  json,
  readJson,
  sameOrigin,
} from "@/lib/server/admin-http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOrigin(request))
    return json({ error: "请求来源不受信任，请从本站设置页登录" }, 403);
  if (!authConfigured())
    return json({ error: "管理密钥尚未配置，请先完成环境变量配置" }, 503);
  if (!allowLoginAttempt()) {
    const response = json({ error: "尝试次数过多，请一分钟后再试" }, 429);
    response.headers.set("Retry-After", "60");
    return response;
  }
  try {
    const body = await readJson(request, 1024);
    if (
      !body ||
      typeof body !== "object" ||
      !("key" in body) ||
      typeof body.key !== "string" ||
      body.key.length !== 16 ||
      !checkAdminKey(body.key)
    ) {
      return json({ error: "密钥不正确，请检查后重试" }, 401);
    }
    const response = json({ ok: true });
    response.cookies.set(sessionCookie, await createSession(), cookieOptions());
    return response;
  } catch (error) {
    return handleError(error);
  }
}
