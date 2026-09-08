import { test, expect } from "@playwright/test";
import { SignJWT } from "jose";
import { createHash, generateKeyPairSync } from "node:crypto";

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
  const weatherPrivateKey = generateKeyPairSync("ed25519").privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  await page.getByLabel("和风天气 API Host").fill("test.xy.qweatherapi.com");
  await page.getByLabel("和风天气开发者 ID").fill("Q12345ABCD");
  await page.getByLabel("和风天气项目 ID").fill("PROJECT123");
  await page.getByLabel("和风天气凭据 ID").fill("CREDENTIAL123");
  await page.getByLabel("和风天气私钥").fill(weatherPrivateKey);
  await context.route("**/api/weather", (route) => route.fulfill({ json: {
    status: "ok", condition: "少云", temperature: "24", humidity: "69", fetchedAt: "2026-09-08T12:00:00Z",
  } }));
  // 先读取首页缓存，再通过设置页保存，验证缓存确实失效。
  await page.request.get("/");
  await page.getByLabel("页面标题 title").fill("我的主页 · 标题验证");
  await page.getByLabel("页面描述 description").fill("记录日常与灵感的个人主页。");
  await page.getByLabel("站点名称").fill("小站表单验证");
  await page.getByLabel("公安备案信息").fill("浙公网安备 33010602000000号");
  await page.getByLabel("位置名称").fill("上海市 · 徐汇区");
  await page.getByLabel("地区 areacode").fill("001234");
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
  await expect(page.getByLabel("和风天气私钥")).toHaveValue("");
  await expect(page.getByText(/已配置私钥。保存后不回显/)).toBeVisible();
  const weatherSettings = await (await page.request.get("/api/admin/settings")).json();
  expect(weatherSettings.weather.hasPrivateKey).toBe(true);
  expect(weatherSettings.weather).not.toHaveProperty("privateKey");
  expect(await (await page.request.get("/settings")).text()).not.toContain("-----BEGIN PRIVATE KEY-----");
  expect(await (await page.request.get("/")).text()).not.toContain("CREDENTIAL123");


  await page.reload();
  await expect(page.getByLabel("页面标题 title")).toHaveValue("我的主页 · 标题验证");
  await expect(page.getByLabel("页面描述 description")).toHaveValue("记录日常与灵感的个人主页。");
  await expect(page.getByLabel("公安备案信息")).toHaveValue("浙公网安备 33010602000000号");
  await expect(page.getByLabel("和风天气私钥")).toHaveValue("");
  await expect(page.getByLabel("位置名称")).toHaveValue("上海市 · 徐汇区");
  await expect(page.getByLabel("地区 areacode")).toHaveValue("001234");
  const locationPage = await context.newPage();
  await locationPage.goto("/");
  await expect(locationPage).toHaveTitle("我的主页 · 标题验证");
  await expect(locationPage.locator('meta[name="description"]')).toHaveAttribute("content", "记录日常与灵感的个人主页。");
  await expect(locationPage.locator(".weather-footer")).toContainText("上海市 · 徐汇区");
  await expect(locationPage.locator(".weather")).toHaveText("少云 24°C");
  await expect(locationPage.locator(".weather-footer")).toContainText("湿度 69%");
  const policeLink = locationPage.getByRole("link", { name: "浙公网安备 33010602000000号" });
  await expect(policeLink).toHaveAttribute("href", "https://beian.mps.gov.cn/#/query/webSearch?code=33010602000000");
  await expect(policeLink.locator("img")).toHaveAttribute("src", "/images/ga_icon.png");
  await locationPage.close();

  await page.getByRole("button", { name: /^服务链接/ }).click();
  await page.getByRole("button", { name: /添加服务/ }).click();
  await page.getByLabel("服务名称", { exact: true }).last().fill("测试链接");
  await page.getByLabel("访问链接").last().fill("https://example.com");
  await page.getByRole("radio", { name: "游戏", exact: true }).last().check();
  await page.getByRole("button", { name: "保存更改" }).click();
  await expect(page.getByRole("status")).toContainText("已保存");
  expect(await (await page.request.get("/")).text()).toContain("测试链接");
  const updated = await (await page.request.get('/api/admin/settings')).json();
  expect(updated.weather.hasPrivateKey).toBe(true);
  expect(updated.weather).not.toHaveProperty('privateKey');
  expect(updated.services.find((item: { title: string }) => item.title === '测试链接').icon).toBe('game');
  await page.reload();
  await page.getByRole('button', { name: /^服务链接/ }).click();
  await expect(page.getByRole('radio', { name: '游戏', exact: true }).last()).toBeChecked();
  const homepage = await context.newPage();
  await homepage.goto('/');
  await expect(homepage.getByRole('link', { name: '测试链接' }).locator('[data-service-icon=game]')).toHaveCount(1);
  await homepage.close();
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
        data: { ...initial, weather: { ...initial.weather, clearPrivateKey: true } },
      })
    ).status(),
  ).toBe(200);
  expect((await (await page.request.get("/api/admin/settings")).json()).weather.hasPrivateKey).toBe(false);

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
