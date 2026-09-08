import { z } from "zod";
import { serviceIconNames } from "./service-icons";

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

export const weatherSettingsSchema = z.object({
  apiHost: shortText(253).refine(
    (value) => value === "" || /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)?\.qweatherapi\.com$/i.test(value),
    "请填写和风天气控制台的 API Host（仅域名，例如 abc.re.qweatherapi.com）",
  ),
  projectId: shortText(100),
  developerId: shortText(100),
  credentialId: shortText(100),
  privateKey: shortText(4096).optional(),
  hasPrivateKey: z.boolean().optional(),
  clearPrivateKey: z.boolean().optional(),
}).strict();

export const homeContentSchema = z
  .object({
    weather: weatherSettingsSchema.optional(),
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
        police_registration: shortText(100),
        location: shortText(100),
        areacode: shortText(64),
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
            icon: z.enum(serviceIconNames, { error: "请选择有效的服务图标" }),
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
