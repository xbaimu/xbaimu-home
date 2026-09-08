import 'server-only';
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { site, services, quotes } from '../site';
import type { HomeContent, Quote, Service, SiteSettings } from '../site-types';

const schemaVersion = 3;

// 懒初始化：构建不打开数据库。全局连接也可跨开发环境热更新复用。
const globalDatabase = globalThis as typeof globalThis & {
  homeDatabase?: { path: string; connection: Database.Database };
};

export function databasePath() {
  // 数据文件来自运行时挂载，不应被打包进 standalone。
  return resolve(/* turbopackIgnore: true */ process.env.DATABASE_PATH || 'data/home.sqlite');
}

export function openDatabase(path: string): Database.Database {
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path, { timeout: 5000 });
  try {
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('cache_size = -2048');
    db.transaction(() => {
      const version = db.pragma('user_version', { simple: true }) as number;
      if (version > schemaVersion) {
        throw new Error(`数据库版本 ${version} 高于应用支持的版本 ${schemaVersion}`);
      }
      if (version === 0) {
        db.exec(`
          CREATE TABLE site_settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            name TEXT NOT NULL,
            domain TEXT NOT NULL DEFAULT '',
            tagline TEXT NOT NULL DEFAULT '',
            email TEXT NOT NULL DEFAULT '',
            registration TEXT NOT NULL DEFAULT '',
            location TEXT NOT NULL DEFAULT '',
            areacode TEXT NOT NULL DEFAULT '',
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
          CREATE TABLE services (
            id TEXT PRIMARY KEY NOT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            href TEXT NOT NULL,
            icon TEXT NOT NULL DEFAULT 'link',
            color TEXT NOT NULL DEFAULT 'green',
            category TEXT NOT NULL DEFAULT 'personal'
              CHECK (category IN ('personal', 'tools')),
            sort_order INTEGER NOT NULL DEFAULT 0,
            enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
          CREATE TABLE quotes (
            id INTEGER PRIMARY KEY,
            text TEXT NOT NULL,
            author TEXT NOT NULL DEFAULT '',
            sort_order INTEGER NOT NULL DEFAULT 0,
            enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
        `);
        writeContent(db, {
          site,
          services: services.map((item, index) => ({ ...item, sort_order: index, enabled: true })),
          quotes: quotes.map((item, index) => ({ ...item, id: index + 1, sort_order: index, enabled: true })),
        });
        db.pragma(`user_version = ${schemaVersion}`);
      }
      if (version === 1) {
        db.exec(`ALTER TABLE services ADD COLUMN icon TEXT NOT NULL DEFAULT 'link';
          UPDATE services SET icon = CASE id
            WHEN 'blog' THEN 'blog' WHEN 'cloud' THEN 'cloud' WHEN 'music' THEN 'music'
            WHEN 'startpage' THEN 'compass' WHEN 'bookmarks' THEN 'bookmark'
            WHEN 'hot' THEN 'fire' ELSE 'link' END;`);
        db.pragma(`user_version = ${schemaVersion}`);
      }
      if (version === 1 || version === 2) {
        db.exec(`ALTER TABLE site_settings ADD COLUMN location TEXT NOT NULL DEFAULT '杭州市 · 西湖区';
          ALTER TABLE site_settings ADD COLUMN areacode TEXT NOT NULL DEFAULT '';`);
        db.pragma(`user_version = ${schemaVersion}`);
      }
    }).immediate();
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

export function getDatabase() {
  const path = databasePath();
  if (!globalDatabase.homeDatabase) {
    globalDatabase.homeDatabase = { path, connection: openDatabase(path) };
  }
  if (globalDatabase.homeDatabase.path !== path) {
    throw new Error('修改 DATABASE_PATH 后请重启服务');
  }
  return globalDatabase.homeDatabase.connection;
}

type ServiceRow = Omit<Service, 'enabled'> & { enabled: number };
type QuoteRow = Omit<Quote, 'enabled'> & { enabled: number };

export function readContent(db: Database.Database, publicOnly = false): HomeContent {
  return db.transaction(() => {
    const site = db.prepare(`SELECT name, domain, tagline, email, registration, location, areacode
      FROM site_settings WHERE id = 1`).get() as SiteSettings | undefined;
    if (!site) throw new Error('缺少站点设置');
    const filter = publicOnly ? 'WHERE enabled = 1' : '';
    const services = db.prepare(`SELECT id, title, description, href, icon, color, category,
      sort_order, enabled FROM services ${filter} ORDER BY sort_order, id`).all() as ServiceRow[];
    const quotes = db.prepare(`SELECT id, text, author, sort_order, enabled
      FROM quotes ${filter} ORDER BY sort_order, id`).all() as QuoteRow[];
    return {
      site,
      services: services.map((item) => ({ ...item, enabled: Boolean(item.enabled) })),
      quotes: quotes.map((item) => ({ ...item, enabled: Boolean(item.enabled) })),
    };
  })();
}

// 整体保存，在同一事务内完成；参数绑定避免 SQL 注入。
export function writeContent(db: Database.Database, content: HomeContent) {
  for (const service of content.services) {
    const url = new URL(service.href);
    if (!['https:', 'http:'].includes(url.protocol)) {
      throw new Error('服务链接仅支持 HTTP 和 HTTPS');
    }
  }
  db.transaction(() => {
    db.prepare(`INSERT INTO site_settings (id, name, domain, tagline, email, registration, location, areacode)
      VALUES (1, @name, @domain, @tagline, @email, @registration, @location, @areacode)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, domain = excluded.domain,
      tagline = excluded.tagline, email = excluded.email,
      registration = excluded.registration, location = excluded.location,
      areacode = excluded.areacode, updated_at = CURRENT_TIMESTAMP`).run(content.site);
    db.exec('DELETE FROM services; DELETE FROM quotes;');
    const insertService = db.prepare(`INSERT INTO services
      (id, title, description, href, icon, color, category, sort_order, enabled)
      VALUES (@id, @title, @description, @href, @icon, @color, @category, @sort_order, @enabled)`);
    for (const item of content.services) insertService.run({ ...item, enabled: item.enabled ? 1 : 0 });
    const insertQuote = db.prepare(`INSERT INTO quotes (id, text, author, sort_order, enabled)
      VALUES (@id, @text, @author, @sort_order, @enabled)`);
    for (const item of content.quotes) insertQuote.run({ ...item, enabled: item.enabled ? 1 : 0 });
  })();
}
