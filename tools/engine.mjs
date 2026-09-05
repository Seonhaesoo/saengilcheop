/* 사주첩 브라우저 엔진(engine/*.js)을 Node에서 그대로 쓰기 위한 로더 */
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function loadEngine() {
  const w = {};
  const ctx = { window: w, self: w, globalThis: w, console, Date, Math, JSON };
  vm.createContext(ctx);
  for (const f of ['vendor-korean-lunar', 'manseryeok', 'characters']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT_DIR, 'engine', f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
  }
  const M = w.Manseryeok;
  return { M, I: M._internals, C: w.SajuCharacters, Lunar: new w.KoreanLunarCalendar() };
}

export function kstToday() {
  const t = new Date(Date.now() + 9 * 3600e3);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}
