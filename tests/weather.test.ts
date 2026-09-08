import assert from 'node:assert/strict';
import { generateKeyPairSync, verify } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createWeatherToken, validateWeatherSettings } from '../lib/server/weather-auth';
import { fetchWeather, createWeatherCache } from '../lib/server/weather';
import { openDatabase, readAdminContent, readContent, readWeatherSettings, writeContent } from '../lib/server/database';

const pair = generateKeyPairSync('ed25519');
const privateKey = pair.privateKey.export({ format: 'pem', type: 'pkcs8' }).toString().trim();
const config = { apiHost: 'test.xy.qweatherapi.com', developerId: 'Q12345ABCD', projectId: 'PROJECT123', credentialId: 'KEY123', privateKey };
const current = { condition: { text: '少云' }, temperature: { value: 31.71, unit: '°C' }, humidity: 0.69 };
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });

test('JWT 使用 Ed25519 签名以及官方 iss/sub/kid/iat/exp 字段', () => {
  const token = createWeatherToken(config, 1703912400);
  const [header, payload, signature] = token.split('.');
  assert.deepEqual(JSON.parse(Buffer.from(header, 'base64url').toString()), { alg: 'EdDSA', kid: config.credentialId });
  assert.deepEqual(JSON.parse(Buffer.from(payload, 'base64url').toString()), {
    iss: config.developerId, sub: config.projectId, iat: 1703912370, exp: 1703912700,
  });
  assert.equal(verify(null, Buffer.from(`${header}.${payload}`), pair.publicKey, Buffer.from(signature, 'base64url')), true);
});

test('私钥校验拒绝公钥、其他算法、缺少认证字段及非和风主机', () => {
  for (const patch of [
    { privateKey: 'invalid' },
    { privateKey: pair.publicKey.export({ format: 'pem', type: 'spki' }).toString() },
    { privateKey: generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey.export({ format: 'pem', type: 'pkcs8' }).toString() },
    { developerId: '' }, { projectId: '' }, { credentialId: '' },
    { apiHost: 'test.qweatherapi.com.evil.example' },
    { apiHost: 'localhost:3000' }, { apiHost: 'user@abc.qweatherapi.com' },
    { apiHost: 'abc.qweatherapi.com/path' }, { clearPrivateKey: true },
  ]) assert.throws(() => validateWeatherSettings({ ...config, ...patch }, config));
  for (const apiHost of ['abc.qweatherapi.com', 'abc.re.qweatherapi.com', 'abc.xy.qweatherapi.com']) {
    assert.equal(validateWeatherSettings({ ...config, apiHost }, config).apiHost, apiHost);
  }
});

test('私钥持久化但任何内容读取不回显；空值保留、替换、清除与事务回滚', () => {
  const directory = mkdtempSync(join(tmpdir(), 'weather-db-'));
  const path = join(directory, 'home.sqlite');
  let db = openDatabase(path);
  try {
    writeContent(db, { ...readContent(db), weather: config });
    db.close(); db = openDatabase(path);
    const admin = readAdminContent(db);
    assert.equal(admin.weather.hasPrivateKey, true);
    assert.equal('privateKey' in admin.weather, false);
    assert.equal('weather' in readContent(db, true), false);
    assert.equal(JSON.stringify(admin).includes(privateKey), false);
    assert.equal(readWeatherSettings(db).privateKey, privateKey);
    writeContent(db, { ...admin, weather: { ...admin.weather, privateKey: '' } });
    assert.equal(readWeatherSettings(db).privateKey, privateKey);
    const replacement = generateKeyPairSync('ed25519').privateKey.export({ format: 'pem', type: 'pkcs8' }).toString().trim();
    const invalid = { ...admin, weather: { ...config, privateKey: replacement }, services: [admin.services[0], admin.services[0]] };
    assert.throws(() => writeContent(db, invalid));
    assert.equal(readWeatherSettings(db).privateKey, privateKey);
    writeContent(db, { ...admin, weather: { ...config, privateKey: replacement } });
    assert.equal(readWeatherSettings(db).privateKey, replacement);
    writeContent(db, { ...admin, weather: { ...admin.weather, clearPrivateKey: true } });
    assert.equal(readAdminContent(db).weather.hasPrivateKey, false);
    assert.equal(readWeatherSettings(db).privateKey, '');
  } finally { db.close(); rmSync(directory, { recursive: true, force: true }); }
});

test('版本 4 升级新增天气配置，保留已有站点内容', () => {
  const directory = mkdtempSync(join(tmpdir(), 'weather-migration-'));
  const path = join(directory, 'home.sqlite');
  let db = openDatabase(path);
  try {
    const content = readContent(db); content.site.name = '旧站点'; writeContent(db, content);
    db.exec('DROP TABLE weather_settings; ALTER TABLE site_settings DROP COLUMN title; ALTER TABLE site_settings DROP COLUMN description; PRAGMA user_version = 4;');
    db.close(); db = openDatabase(path);
    assert.equal(db.pragma('user_version', { simple: true }), 6);
    assert.deepEqual(readContent(db), content);
    assert.equal(readAdminContent(db).weather.hasPrivateKey, false);
  } finally { db.close(); rmSync(directory, { recursive: true, force: true }); }
});

test('城市编码解析为经纬度后查询实时天气，JWT 只出现在请求头', async () => {
  const urls: string[] = [];
  const request: typeof fetch = async (input, init) => {
    urls.push(String(input));
    assert.match((init?.headers as Record<string, string>).Authorization, /^Bearer /);
    assert.equal(init?.redirect, 'error');
    assert.equal(init?.cache, 'no-store');
    assert.ok(init?.signal);
    return urls.length === 1
      ? reply({ code: '200', location: [{ lat: '30.28', lon: '120.15' }] }) : reply(current);
  };
  const result = await fetchWeather(config, '001234', request);
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  assert.equal(result.temperature, '32'); assert.equal(result.humidity, '69');
  assert.match(urls[0], /location=001234/);
  assert.equal(urls[1], 'https://test.xy.qweatherapi.com/weather/v1/current/30.28/120.15?lang=zh');
  for (const secret of [privateKey, config.apiHost, config.projectId, config.credentialId, config.developerId]) {
    assert.equal(JSON.stringify(result).includes(secret), false);
  }
});

test('直接经纬度跳过城市查询；未配置、上游错误和格式异常安全降级', async () => {
  let calls = 0;
  const request: typeof fetch = async () => { calls++; return reply(current); };
  assert.equal((await fetchWeather(config, '120.15,30.28', request)).status, 'ok');
  assert.equal(calls, 1);
  assert.equal((await fetchWeather({ ...config, privateKey: '' }, '001234', request)).status, 'unconfigured');
  assert.equal((await fetchWeather(config, '', request)).status, 'unconfigured');
  assert.equal((await fetchWeather(config, '200,91', request)).status, 'unavailable');
  assert.equal(calls, 1);
  for (const response of [reply({}, 401), reply({}, 429), reply({}, 500), reply({}), reply({ ...current, humidity: 70 }), reply({ code: '404', location: [] })]) {
    assert.deepEqual(await fetchWeather(config, '120.15,30.28', async () => response), { status: 'unavailable' });
  }
  assert.deepEqual(await fetchWeather(config, '001234', async () => reply({ code: '404' })), { status: 'unavailable' });
  assert.deepEqual(await fetchWeather(config, '001234', async () => { throw new Error(privateKey); }), { status: 'unavailable' });
});

test('缓存合并并发，十分钟过期，城市或凭据变化立即更新，失败一分钟重试', async () => {
  let calls = 0; let time = 0; let fail = false;
  const cached = createWeatherCache(async () => { calls++; return reply(fail ? {} : current); }, () => time);
  const first = cached(config, '120,30');
  assert.equal(cached(config, '120,30'), first);
  await first; assert.equal(calls, 1);
  time = 599999; await cached(config, '120,30'); assert.equal(calls, 1);
  time = 600000; await cached(config, '120,30'); assert.equal(calls, 2);
  await cached(config, '121,30'); assert.equal(calls, 3);
  await cached({ ...config, credentialId: 'NEW' }, '121,30'); assert.equal(calls, 4);
  fail = true;
  await cached(config, '120,30'); assert.equal(calls, 5);
  time += 59999; await cached(config, '120,30'); assert.equal(calls, 5);
  time += 1; await cached(config, '120,30'); assert.equal(calls, 6);
});
