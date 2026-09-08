import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

export const sessionCookie = "home_admin_session";
export const sessionSeconds = 12 * 60 * 60;
const issuer = "xbaimu-home";
const audience = "home-settings";

export function authConfigured() {
  return (
    /^[A-Za-z0-9_-]{16}$/.test(process.env.ADMIN_KEY ?? "") &&
    (process.env.ADMIN_JWT_SECRET?.length ?? 0) >= 32
  );
}

function signingKey() {
  if (!authConfigured()) throw new Error("管理密钥尚未配置");
  return new TextEncoder().encode(process.env.ADMIN_JWT_SECRET);
}

export function checkAdminKey(candidate: string) {
  if (!authConfigured()) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(candidate), digest(process.env.ADMIN_KEY!));
}

export async function createSession() {
  // 绑定登录密钥版本：更换任一密钥并重启后，旧会话失效。
  const keyVersion = createHash("sha256")
    .update(process.env.ADMIN_KEY ?? "")
    .digest("hex");
  return new SignJWT({ keyVersion })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject("admin")
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(`${sessionSeconds}s`)
    .sign(signingKey());
}

export async function verifySession(token: string | undefined) {
  if (!token || !authConfigured()) return false;
  try {
    const { payload } = await jwtVerify(token, signingKey(), {
      algorithms: ["HS256"],
      issuer,
      audience,
      subject: "admin",
      requiredClaims: ["exp", "iat", "sub", "keyVersion"],
      maxTokenAge: `${sessionSeconds}s`,
    });
    return (
      payload.keyVersion ===
      createHash("sha256").update(process.env.ADMIN_KEY!).digest("hex")
    );
  } catch {
    return false;
  }
}

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.ADMIN_COOKIE_SECURE !== "false",
    sameSite: "strict" as const,
    path: "/",
    maxAge: sessionSeconds,
  };
}

// 单实例的小型后台使用全局限流，不依赖可伪造的代理 IP 请求头。
const state = globalThis as typeof globalThis & {
  adminLoginWindow?: { starts: number; attempts: number };
};
export function allowLoginAttempt(now = Date.now()) {
  if (
    !state.adminLoginWindow ||
    now - state.adminLoginWindow.starts >= 60_000
  ) {
    state.adminLoginWindow = { starts: now, attempts: 0 };
  }
  return ++state.adminLoginWindow.attempts <= 10;
}
