import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash, randomBytes } from "node:crypto";
import { SignJWT } from "jose";
import {
  authConfigured,
  checkAdminKey,
  cookieOptions,
  createSession,
  verifySession,
  allowLoginAttempt,
} from "../lib/server/auth";
import { readJson, sameOrigin } from "../lib/server/admin-http";
import { homeContentSchema } from "../lib/settings-schema";
import { site, services, quotes } from "../lib/site";

process.env.ADMIN_KEY = randomBytes(12).toString("base64url");
process.env.ADMIN_JWT_SECRET = randomBytes(32).toString("base64url");

test("密钥必须配置且精确匹配，JWT 签名与密钥轮换", async () => {
  assert.equal(authConfigured(), true);
  assert.equal(checkAdminKey(process.env.ADMIN_KEY!), true);
  assert.equal(checkAdminKey("incorrect"), false);
  const token = await createSession();
  assert.equal(await verifySession(token), true);
  assert.equal(await verifySession(undefined), false);
  assert.equal(await verifySession(token.slice(0, -8) + "invalid!"), false);
  const original = process.env.ADMIN_KEY!;
  process.env.ADMIN_KEY = randomBytes(12).toString("base64url");
  assert.equal(await verifySession(token), false);
  process.env.ADMIN_KEY = original;
  const secret = process.env.ADMIN_JWT_SECRET!;
  process.env.ADMIN_JWT_SECRET = randomBytes(32).toString("base64url");
  assert.equal(await verifySession(token), false);
  process.env.ADMIN_JWT_SECRET = secret;
  delete process.env.ADMIN_KEY;
  assert.equal(authConfigured(), false);
  assert.equal(await verifySession(token), false);
  process.env.ADMIN_KEY = original;
});

test("拒绝过期、缺少期限、错误受众、错误算法和错误角色的令牌", async () => {
  const key = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET);
  for (const kind of [
    "expired",
    "no-exp",
    "audience",
    "algorithm",
    "subject",
  ]) {
    let jwt = new SignJWT({
      keyVersion: createHash("sha256")
        .update(process.env.ADMIN_KEY!)
        .digest("hex"),
    })
      .setProtectedHeader({ alg: kind === "algorithm" ? "HS384" : "HS256" })
      .setIssuer("xbaimu-home")
      .setSubject(kind === "subject" ? "visitor" : "admin")
      .setAudience(kind === "audience" ? "other" : "home-settings")
      .setIssuedAt();
    if (kind !== "no-exp")
      jwt = jwt.setExpirationTime(kind === "expired" ? "0s" : "12h");
    assert.equal(await verifySession(await jwt.sign(key)), false, kind);
  }
  assert.equal(cookieOptions().httpOnly, true);
  assert.equal(cookieOptions().sameSite, "strict");
  assert.equal(cookieOptions().secure, true);
});

test("跨站或无 Origin 的写请求被拒绝，登录限流有时间窗口", () => {
  const request = (origin?: string) =>
    new Request("https://home.example.com/api/admin/settings", {
      headers: origin ? { origin } : {},
    });
  assert.equal(sameOrigin(request("https://home.example.com")), true);
  assert.equal(sameOrigin(request("https://evil.example.com")), false);
  assert.equal(sameOrigin(request()), false);
  assert.equal(sameOrigin(new Request('http://localhost:3000/api/admin/login', {
    headers: { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000' },
  })), true);
  assert.equal(sameOrigin(new Request('http://localhost:3000/api/admin/login', {
    headers: { host: '127.0.0.1:3000', origin: 'http://evil.example.com' },
  })), false);
  for (let i = 0; i < 10; i++) assert.equal(allowLoginAttempt(1000), true);
  assert.equal(allowLoginAttempt(1000), false);
  assert.equal(allowLoginAttempt(61000), true);
});

test("校验完整设置：非法 URL、重复 ID、布尔值类型和过长输入不能保存", () => {
  const settings = site;
  const content = {
    site: settings,
    services: services.map((item, i) => ({
      ...item,
      sort_order: i,
      enabled: true,
    })),
    quotes: quotes.map((item, i) => ({
      ...item,
      id: i + 1,
      sort_order: i,
      enabled: true,
    })),
  };
  assert.equal(homeContentSchema.safeParse(content).success, true);
  assert.equal(homeContentSchema.safeParse({ ...content, services: [{ ...content.services[0], icon: '__proto__' }] }).success, false);
  for (const href of [
    "javascript:alert(1)",
    "data:text/html,test",
    "https://user:pass@example.com",
  ]) {
    assert.equal(
      homeContentSchema.safeParse({
        ...content,
        services: [{ ...content.services[0], href }],
      }).success,
      false,
    );
  }
  assert.equal(
    homeContentSchema.safeParse({
      ...content,
      services: [content.services[0], content.services[0]],
    }).success,
    false,
  );
  assert.equal(
    homeContentSchema.safeParse({
      ...content,
      services: [{ ...content.services[0], enabled: "false" }],
    }).success,
    false,
  );
  assert.equal(
    homeContentSchema.safeParse({
      ...content,
      site: { ...settings, name: "x".repeat(81) },
    }).success,
    false,
  );
  for (const patch of [{ title: " " }, { title: "x".repeat(201) }, { description: "x".repeat(501) }]) {
    assert.equal(homeContentSchema.safeParse({ ...content, site: { ...settings, ...patch } }).success, false);
  }
  assert.equal(homeContentSchema.safeParse({ ...content, site: { ...settings, description: "" } }).success, true);
  assert.equal(
    homeContentSchema.safeParse({ ...content, services: [], quotes: [] })
      .success,
    true,
  );
});

test("拒绝错误 JSON 与过大的请求体", async () => {
  const request = (body: string) =>
    new Request("https://example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
  await assert.rejects(readJson(request("{")), /有效 JSON/);
  await assert.rejects(readJson(request("x".repeat(20)), 10), /内容过长/);
  assert.deepEqual(await readJson(request('{"key":"value"}')), {
    key: "value",
  });
});
