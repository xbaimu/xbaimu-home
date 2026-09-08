import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import Database from 'better-sqlite3';
import { openDatabase, readContent, writeContent } from '../lib/server/database';
import { services, quotes } from '../lib/site';

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), 'home-db-'));
  const path = join(directory, 'nested', 'home.sqlite');
  const db = openDatabase(path);
  return { path, db, cleanup: () => { if (db.open) db.close(); rmSync(directory, { recursive: true, force: true }); } };
}

test('初始化三张表、导入种子数据；重开不会覆盖修改或重新填充空列表', () => {
  const f = fixture();
  try {
    assert.equal(f.db.pragma('user_version', { simple: true }), 3);
    assert.equal(f.db.pragma('journal_mode', { simple: true }), 'wal');
    assert.deepEqual(f.db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all(),
      [{ name: 'quotes' }, { name: 'services' }, { name: 'site_settings' }]);
    const content = readContent(f.db);
    assert.equal(content.services.length, services.length);
    assert.equal(content.quotes.length, quotes.length);
    content.site.name = '持久化站点';
    content.site.location = '上海市';
    content.site.areacode = '001234';
    content.services = [];
    content.quotes = [];
    writeContent(f.db, content);
    f.db.close();
    const reopened = openDatabase(f.path);
    try { assert.deepEqual(readContent(reopened), content); } finally { reopened.close(); }
  } finally { f.cleanup(); }
});

test('公开读取按顺序展示并过滤隐藏内容，管理读取保留隐藏项', () => {
  const f = fixture();
  try {
    const content = readContent(f.db);
    content.services[0].enabled = false;
    content.services[1].sort_order = -10;
    content.quotes[0].enabled = false;
    content.quotes[1].sort_order = -10;
    writeContent(f.db, content);
    const visible = readContent(f.db, true);
    assert.equal(visible.services[0].id, content.services[1].id);
    assert.equal(visible.quotes[0].id, content.quotes[1].id);
    assert.equal(visible.services.length, content.services.length - 1);
    assert.equal(visible.quotes.length, content.quotes.length - 1);
    assert.equal(readContent(f.db).services.length, content.services.length);
  } finally { f.cleanup(); }
});

test('写入失败会回滚整个事务，危险链接被拒绝，站点设置只能一行', () => {
  const f = fixture();
  try {
    const original = readContent(f.db);
    const invalid = structuredClone(original);
    invalid.site.name = '不应保存';
    invalid.services.push(invalid.services[0]);
    assert.throws(() => writeContent(f.db, invalid));
    assert.deepEqual(readContent(f.db), original);
    invalid.services = [{ ...original.services[0], href: 'javascript:alert(1)' }];
    assert.throws(() => writeContent(f.db, invalid), /HTTP/);
    assert.deepEqual(readContent(f.db), original);
    assert.throws(() => f.db.prepare("INSERT INTO site_settings (id, name) VALUES (2, 'extra')").run());
  } finally { f.cleanup(); }
});

test('拒绝读取更高版本的数据库', () => {
  const f = fixture();
  try {
    f.db.pragma('user_version = 4');
    f.db.close();
    assert.throws(() => openDatabase(f.path), /高于/);
    const db = new Database(f.path);
    try { assert.equal(db.pragma('user_version', { simple: true }), 4); } finally { db.close(); }
  } finally { f.cleanup(); }
});


test('版本 1 自动迁移图标，保留旧内容；选择图标后重开仍然保留', () => {
  const f = fixture();
  try {
    f.db.exec("ALTER TABLE site_settings DROP COLUMN location; ALTER TABLE site_settings DROP COLUMN areacode; ALTER TABLE services DROP COLUMN icon; PRAGMA user_version = 1;");
    f.db.prepare("UPDATE services SET title = '已修改博客' WHERE id = 'blog'").run();
    f.db.prepare("UPDATE services SET id = 'custom-service' WHERE id = 'cloud'").run();
    f.db.close();
    const migrated = openDatabase(f.path);
    try {
      const content = readContent(migrated);
      const blog = content.services.find((item) => item.id === 'blog')!;
      assert.equal(blog.title, '已修改博客');
      assert.equal(blog.icon, 'blog');
      assert.equal(content.services.find((item) => item.id === 'custom-service')!.icon, 'link');
      assert.equal(content.services.find((item) => item.id === 'hot')!.icon, 'fire');
      blog.icon = 'game';
      writeContent(migrated, content);
    } finally { migrated.close(); }
    const reopened = openDatabase(f.path);
    try { assert.equal(readContent(reopened).services.find((item) => item.id === 'blog')!.icon, 'game'); }
    finally { reopened.close(); }
  } finally { f.cleanup(); }
});

test('版本 2 自动迁移位置设置，保留已有内容并允许清空', () => {
  const f = fixture();
  try {
    const original = readContent(f.db);
    f.db.exec('ALTER TABLE site_settings DROP COLUMN location; ALTER TABLE site_settings DROP COLUMN areacode; PRAGMA user_version = 2;');
    f.db.close();
    const migrated = openDatabase(f.path);
    try {
      assert.equal(migrated.pragma('user_version', { simple: true }), 3);
      assert.deepEqual(readContent(migrated), original);
      const content = readContent(migrated);
      content.site.location = '';
      content.site.areacode = '';
      writeContent(migrated, content);
      assert.deepEqual(readContent(migrated), content);
    } finally { migrated.close(); }
  } finally { f.cleanup(); }
});
