import { z } from "zod";

const shortText = (max: number) => z.string().trim().max(max);
const title = shortText(80).min(1, "请填写名称");
const httpUrl = shortText(2048).refine((value) => {
  try {
    const url = new URL(value);
    return (
      ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}, "请填写有效的 HTTP 或 HTTPS 链接");
const order = z.number().int().min(0).max(1000);

export const homeContentSchema = z
  .object({
    site: z
      .object({
        name: title,
        domain: shortText(100),
        tagline: shortText(200),
        email: z.union([
          z.literal(""),
          z.string().trim().email("邮箱格式不正确").max(254),
        ]),
        registration: shortText(100),
      })
      .strict(),
    services: z
      .array(
        z
          .object({
            id: z
              .string()
              .regex(
                /^[a-zA-Z0-9_-]{1,64}$/,
                "服务标识只能包含字母、数字、短横线和下划线",
              )
              .refine(
                (value) =>
                  !["__proto__", "constructor", "prototype"].includes(value),
                "请更换服务标识",
              ),
            title,
            description: shortText(200),
            href: httpUrl,
            color: z.enum(["green", "sky", "rose", "teal", "amber", "orange"]),
            category: z.enum(["personal", "tools"]),
            sort_order: order,
            enabled: z.boolean(),
          })
          .strict(),
      )
      .max(50, "最多添加 50 个服务"),
    quotes: z
      .array(
        z
          .object({
            id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
            text: shortText(1000).min(1, "请填写寄语"),
            author: shortText(100),
            sort_order: order,
            enabled: z.boolean(),
          })
          .strict(),
      )
      .max(100, "最多添加 100 条寄语"),
  })
  .strict()
  .superRefine((data, context) => {
    for (const key of ["services", "quotes"] as const) {
      if (new Set(data[key].map((item) => item.id)).size !== data[key].length) {
        context.addIssue({
          code: "custom",
          path: [key],
          message: "列表中存在重复标识",
        });
      }
    }
  });
