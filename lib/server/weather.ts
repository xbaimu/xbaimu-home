import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { WeatherResult, WeatherSettings } from "../site-types";
import { weatherSettingsSchema } from "../settings-schema";
import { getDatabase, readWeatherSettings } from "./database";
import { createWeatherToken } from "./weather-auth";

const currentSchema = z.object({
  condition: z.object({ text: z.string().min(1).max(100) }),
  temperature: z.object({ value: z.number().finite(), unit: z.literal("°C") }),
  humidity: z.number().min(0).max(1),
});
const coordinate = /^-?\d+(?:\.\d+)?$/;
function coordinates(lon: string, lat: string) {
  if (
    !coordinate.test(lon) ||
    !coordinate.test(lat) ||
    Math.abs(Number(lon)) > 180 ||
    Math.abs(Number(lat)) > 90
  ) {
    throw new Error("Invalid coordinates");
  }
  return { lon: Number(lon), lat: Number(lat) };
}

export async function fetchWeather(
  config: WeatherSettings,
  location: string,
  request: typeof fetch = fetch,
): Promise<WeatherResult> {
  if (
    !location ||
    !config.apiHost ||
    !config.developerId ||
    !config.projectId ||
    !config.credentialId ||
    !config.privateKey
  ) {
    return { status: "unconfigured" };
  }
  try {
    // Host 限定为和风天气域名，禁止跟随重定向，避免向其他主机发送 JWT。
    weatherSettingsSchema.parse(config);
    const token = createWeatherToken(config);
    const signal = AbortSignal.timeout(8000);
    const get = async (path: string) => {
      const response = await request(`https://${config.apiHost}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        redirect: "error",
        signal,
      });
      if (!response.ok) throw new Error("Weather request failed");
      return response.json();
    };
    let point: { lon: number; lat: number };
    if (location.includes(",")) {
      const parts = location.split(",").map((part) => part.trim());
      if (parts.length !== 2) throw new Error("Invalid coordinates");
      point = coordinates(parts[0], parts[1]);
    } else {
      const geo = z
        .object({
          code: z.literal("200"),
          location: z
            .array(z.object({ lon: z.string(), lat: z.string() }))
            .min(1),
        })
        .parse(
          await get(
            `/geo/v2/city/lookup?${new URLSearchParams({ location, lang: "zh", number: "1" })}`,
          ),
        );
      point = coordinates(geo.location[0].lon, geo.location[0].lat);
    }
    const current = currentSchema.parse(
      await get(`/weather/v1/current/${point.lat}/${point.lon}?lang=zh`),
    );
    console.log("currentcurrentcurrentcurrent", current);

    return {
      status: "ok",
      condition: current.condition.text,
      temperature: String(Math.round(current.temperature.value)),
      humidity: String(Math.round(current.humidity * 100)),
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    // 不向浏览器或日志暴露上游响应、JWT 或私钥。
    return { status: "unavailable" };
  }
}

// 单实例共享缓存，并发请求复用同一个 Promise；凭据或城市修改后立即换用新缓存。
export function createWeatherCache(
  request: typeof fetch = fetch,
  now = Date.now,
) {
  let cached:
    | { key: string; expires: number; promise: Promise<WeatherResult> }
    | undefined;
  return (config: WeatherSettings, location: string) => {
    const key = createHash("sha256")
      .update(JSON.stringify([config, location]))
      .digest("hex");
    if (cached?.key === key && now() < cached.expires) return cached.promise;
    const entry = {
      key,
      expires: Infinity,
      promise: Promise.resolve<WeatherResult>({ status: "unavailable" }),
    };
    entry.promise = fetchWeather(config, location, request).then((result) => {
      entry.expires = now() + (result.status === "ok" ? 600_000 : 60_000);
      return result;
    });
    cached = entry;
    return entry.promise;
  };
}

const cachedWeather = createWeatherCache();
export function getWeather() {
  const db = getDatabase();
  const settings = db.transaction(() => ({
    config: readWeatherSettings(db),
    location: (
      db.prepare("SELECT areacode FROM site_settings WHERE id = 1").get() as {
        areacode: string;
      }
    ).areacode,
  }))();
  return cachedWeather(settings.config, settings.location);
}
