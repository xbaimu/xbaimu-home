import { test, expect } from "@playwright/test";
import { SignJWT } from "jose";
import { createHash } from "node:crypto";

const origin = "http://127.0.0.1:3191";
const key = "TestAdminKey1234";

test("设置页登录、编辑、保存、缓存更新、过期续登与退出", async ({
  page,
  context,
}) => {
  await page.goto("/settings");
  await expect(
    page.getByRole("heading", { name: "打理你的小站" }),
  ).toBeVisible();
  expect((await page.request.get("/api/admin/settings")).status()).toBe(401);
  expect(
    (
      await page.request.put("/api/admin/settings", {
        headers: { Origin: origin },
        data: {},
      })
    ).status(),
  ).toBe(401);
  await page.screenshot({
    path: "test-results/settings-login.png",
    fullPage: true,
  });
  await page.getByLabel("管理密钥").fill("WrongAdminKey123");
  await page.getByRole("button", { name: "进入设置" }).click();
  await expect(page.locator(".settings-error[role=alert]")).toContainText("密钥不正确");
  await page.getByLabel("管理密钥").fill(key);
  await page.getByRole("button", { name: "进入设置" }).click();
  await expect(page.getByRole("heading", { name: "站点信息" })).toBeVisible();
  const cookie = (await context.cookies()).find(
    (item) => item.name === "home_admin_session",
  )!;
  expect(cookie.httpOnly).toBe(true);
  expect(cookie.sameSite).toBe("Strict");
  expect(cookie.value.split(".")).toHaveLength(3);
  expect(await page.evaluate(() => document.cookie)).not.toContain(
    "home_admin_session",
  );

  const initial = await (await page.request.get("/api/admin/settings")).json();
  // 先读取首页缓存，再通过设置页保存，验证缓存确实失效。
  await page.request.get("/");
  await page.getByLabel("站点名称").fill("小站表单验证");
  await page.getByLabel("个性签名").fill("把热爱，写进每一个日常。");
  await page.screenshot({
    path: "test-results/settings-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "保存更改" }).click();
  await expect(page.getByRole("status")).toContainText(
    "已保存，首页内容已更新",
  );
  expect(await (await page.request.get("/")).text()).toContain("小站表单验证");

  await page.getByRole("button", { name: /^服务链接/ }).click();
  await page.getByRole("button", { name: /添加服务/ }).click();
  await page.getByLabel("服务名称", { exact: true }).last().fill("测试链接");
  await page.getByLabel("访问链接").last().fill("https://example.com");
  await page.getByRole("button", { name: "保存更改" }).click();
  await expect(page.getByRole("status")).toContainText("已保存");
  expect(await (await page.request.get("/")).text()).toContain("测试链接");
  await page
    .getByLabel(/在首页显示/)
    .last()
    .uncheck();
  await page.getByRole("button", { name: "保存更改" }).click();
  await expect(page.getByRole("status")).toContainText("已保存");
  expect(await (await page.request.get("/")).text()).not.toContain("测试链接");
  await page
    .getByRole("button", { name: /上移服务/ })
    .last()
    .click();
  await page.getByRole("button", { name: "保存更改" }).click();
  await expect(page.getByRole("status")).toContainText("已保存");
  await page.screenshot({
    path: "test-results/settings-services.png",
    fullPage: true,
  });

  await page.getByRole("button", { name: /^一言寄语/ }).click();
  await page.getByRole("button", { name: /添加寄语/ }).click();
  await page.getByLabel("寄语内容").last().fill("让今天值得被记住。");
  await page.getByLabel("作者 / 出处").last().fill("生活手札");
  await page.getByRole("button", { name: "保存更改" }).click();
  await expect(page.getByRole("status")).toContainText("已保存");
  await page
    .getByRole("button", { name: /删除寄语/ })
    .last()
    .click();
  await page.getByRole("button", { name: "保存更改" }).click();
  await expect(page.getByRole("status")).toContainText("已保存");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: /^站点信息/ }).click();
  await page.screenshot({
    path: "test-results/settings-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByLabel("站点名称").fill("过期后保留的修改");
  await context.clearCookies();
  await page.getByRole("button", { name: "保存更改" }).click();
  await expect(page.locator(".settings-error[role=alert]")).toContainText("修改已保留");
  await page.getByLabel("管理密钥").fill(key);
  await page.getByRole("button", { name: "进入设置" }).click();
  await expect(page.getByLabel("站点名称")).toHaveValue(
    "过期后保留的修改",
  );
  await page.getByRole("button", { name: "保存更改" }).click();
  await expect(page.getByRole("status")).toContainText("已保存");
  expect(
    (
      await page.request.put("/api/admin/settings", {
        headers: { Origin: "https://evil.example.com" },
        data: initial,
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.put("/api/admin/settings", {
        headers: { Origin: origin },
        data: {
          ...initial,
          services: [{ ...initial.services[0], href: "javascript:alert(1)" }],
        },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await page.request.put("/api/admin/settings", {
        headers: { Origin: origin },
        data: initial,
      })
    ).status(),
  ).toBe(200);

  await page.getByRole("button", { name: "退出", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "打理你的小站" }),
  ).toBeVisible();
  expect((await page.request.get("/api/admin/settings")).status()).toBe(401);

  const expired = await new SignJWT({
    keyVersion: createHash("sha256").update(key).digest("hex"),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("admin")
    .setIssuer("xbaimu-home")
    .setAudience("home-settings")
    .setIssuedAt()
    .setExpirationTime("0s")
    .sign(
      new TextEncoder().encode(
        "test-only-signing-secret-with-at-least-32-characters",
      ),
    );
  for (const token of [expired, cookie.value.slice(0, -8) + "invalid!"]) {
    await context.addCookies([
      { name: "home_admin_session", value: token, url: origin },
    ]);
    expect(
      (
        await page.request.put("/api/admin/settings", {
          headers: { Origin: origin },
          data: initial,
        })
      ).status(),
    ).toBe(401);
  }
  await context.clearCookies();
  let limited = false;
  for (let i = 0; i < 11; i++) {
    const response = await page.request.post("/api/admin/login", {
      headers: { Origin: origin },
      data: { key: "wrong" },
    });
    if (response.status() === 429) {
      limited = true;
      break;
    }
  }
  expect(limited).toBe(true);
});
