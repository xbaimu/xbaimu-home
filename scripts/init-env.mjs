import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, chmodSync } from "node:fs";

const path = ".env";
let content = existsSync(path) ? readFileSync(path, "utf8") : "";
const values = {
  ADMIN_KEY: randomBytes(12).toString("base64url"),
  ADMIN_JWT_SECRET: randomBytes(32).toString("base64url"),
  ADMIN_COOKIE_SECURE: "false",
};
for (const [key, value] of Object.entries(values)) {
  if (!new RegExp(`^${key}=.+$`, "m").test(content)) {
    content = content.replace(new RegExp(`^${key}=.*$`, "gm"), "");
    content += `\n${key}=${value}\n`;
  }
}
writeFileSync(path, content.trimStart(), { mode: 0o600 });
chmodSync(path, 0o600);
console.log(
  "管理环境变量已写入 .env；已有非空配置保持不变。请在本地文件中查看 ADMIN_KEY。HTTPS 部署请将 ADMIN_COOKIE_SECURE 改为 true。",
);
