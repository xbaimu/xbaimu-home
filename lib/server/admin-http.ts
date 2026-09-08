import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { sessionCookie, verifySession } from "./auth";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const url = new URL(request.url);
  const expected = process.env.APP_ORIGIN || `${url.protocol}//${request.headers.get("host") || url.host}`;
  return (
    origin !== null &&
    origin === expected &&
    request.headers.get("sec-fetch-site") !== "cross-site"
  );
}

export async function authenticated(request: NextRequest) {
  return verifySession(request.cookies.get(sessionCookie)?.value);
}

export class RequestError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function readJson(
  request: Request,
  limit = 256 * 1024,
): Promise<unknown> {
  if (
    request.headers.get("content-type")?.split(";")[0].trim() !==
    "application/json"
  ) {
    throw new RequestError("请求必须使用 JSON 格式", 415);
  }
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError("请求内容为空", 400);
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) {
        await reader.cancel();
        throw new RequestError("内容过长，请减少条目或文字", 413);
      }
      chunks.push(value);
    }
    try {
      return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      throw new RequestError("请求内容不是有效 JSON", 400);
    }
  } finally {
    reader.releaseLock();
  }
}

export function handleError(error: unknown) {
  if (error instanceof RequestError)
    return json({ error: error.message }, error.status);
  // 不记录请求体或 Cookie，避免把管理密钥写入日志。
  console.error(
    "Admin request failed:",
    error instanceof Error ? error.name : "UnknownError",
  );
  return json({ error: "操作失败，请稍后重试" }, 500);
}
