import { NextRequest } from "next/server";
import {
  authenticated,
  handleError,
  json,
  readJson,
  sameOrigin,
} from "@/lib/server/admin-http";
import { getDatabase, readAdminContent } from "@/lib/server/database";
import { saveHomeContent } from "@/lib/server/home-content";
import { homeContentSchema } from "@/lib/settings-schema";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!(await authenticated(request))) return json({ error: "请先登录" }, 401);
  try {
    return json(readAdminContent(getDatabase()));
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: NextRequest) {
  if (!sameOrigin(request)) return json({ error: "请求来源不受信任" }, 403);
  if (!(await authenticated(request)))
    return json(
      { error: "登录已过期，请重新输入密钥；未保存的内容仍会保留" },
      401,
    );
  try {
    const result = homeContentSchema.safeParse(await readJson(request));
    if (!result.success)
      return json({ error: result.error.issues[0].message }, 400);
    saveHomeContent(result.data);
    return json({ ok: true, content: readAdminContent(getDatabase()) });
  } catch (error) {
    return handleError(error);
  }
}
