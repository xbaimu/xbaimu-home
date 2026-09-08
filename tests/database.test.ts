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
    assert.equal(f.db.pragma('user_version', { simple: true }), 1);
    assert.equal(f.db.pragma('journal_mode', { simple: true }), 'wal');
    assert.deepEqual(f.db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all(),
      [{ name: 'quotes' }, { name: 'services' }, { name: 'site_settings' }]);
    const content = readContent(f.db);
    assert.equal(content.services.length, services.length);
    assert.equal(content.quotes.length, quotes.length);
    content.site.name = '持久化站点';
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
    f.db.pragma('user_version = 2');
    f.db.close();
    assert.throws(() => openDatabase(f.path), /高于/);
    const db = new Database(f.path);
    try { assert.equal(db.pragma('user_version', { simple: true }), 2); } finally { db.close(); }
  } finally { f.cleanup(); }
});
