import 'server-only';
import { createPrivateKey, sign } from 'node:crypto';
import type { WeatherSettings } from '../site-types';
import { weatherSettingsSchema } from '../settings-schema';
import { RequestError } from './admin-http';

export function validateWeatherSettings(input: WeatherSettings, stored: WeatherSettings) {
  const result = weatherSettingsSchema.safeParse(input);
  if (!result.success) throw new RequestError(result.error.issues[0].message, 400);
  const value = result.data;
  if (value.clearPrivateKey && value.privateKey) {
    throw new RequestError('请勿同时填写新私钥和选择清除私钥', 400);
  }
  const privateKey = value.clearPrivateKey ? '' : value.privateKey || stored.privateKey || '';
  if (privateKey) {
    try {
      if (!privateKey.startsWith('-----BEGIN PRIVATE KEY-----') ||
          createPrivateKey(privateKey).asymmetricKeyType !== 'ed25519') throw new Error();
    } catch {
      throw new RequestError('请填写有效的 Ed25519 PEM 私钥，包含 BEGIN / END PRIVATE KEY 行', 400);
    }
    if (!value.developerId || !value.apiHost || !value.projectId || !value.credentialId) {
      throw new RequestError('使用私钥时，请同时填写 API Host、开发者 ID、项目 ID 和凭据 ID', 400);
    }
  }
  return { developerId: value.developerId, apiHost: value.apiHost, projectId: value.projectId, credentialId: value.credentialId, privateKey };
}

export function createWeatherToken(config: WeatherSettings, now = Math.floor(Date.now() / 1000)) {
  const header = Buffer.from(JSON.stringify({ alg: 'EdDSA', kid: config.credentialId })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ iss: config.developerId, sub: config.projectId, iat: now - 30, exp: now + 300 })).toString('base64url');
  const input = `${header}.${payload}`;
  return `${input}.${sign(null, Buffer.from(input), createPrivateKey(config.privateKey!)).toString('base64url')}`;
}
