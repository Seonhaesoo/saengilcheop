/* 생일첩 날짜 계산기 — 전역일(/army/), 연애 기념일(/couple/), 결혼기념일(/wedding/), 수능 D-day(/suneung/)
 * 위쪽 K 는 순수 계산(브라우저와 빌드가 같이 쓴다 — tools/calc.mjs 가 require 로 불러 예시 표를 만든다),
 * 아래쪽은 화면. 모든 계산은 브라우저 안에서만 이뤄진다. */
(function (root) {
  'use strict';
  var DAY = 864e5;
  var WD = ['일', '월', '화', '수', '목', '금', '토'];
  var K = {};
  K.WD = WD;
  K.utc = function (o) { return Date.UTC(o.y, o.m - 1, o.d); };
  K.from = function (t) { var x = new Date(t); return { y: x.getUTCFullYear(), m: x.getUTCMonth() + 1, d: x.getUTCDate(), w: x.getUTCDay() }; };
  K.date = function (y, m, d) { return K.from(Date.UTC(y, m - 1, d)); };
  K.isLeap = function (y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; };
  K.dim = function (y, m) { return [31, K.isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]; };
  K.addDays = function (o, n) { return K.from(K.utc(o) + n * DAY); };
  K.diff = function (a, b) { return Math.round((K.utc(b) - K.utc(a)) / DAY); };   /* b − a (일) */
  /* N주년 — 같은 월일. 2월 29일은 평년에 2월 28일 */
  K.addYears = function (o, n) { var y = o.y + n; return K.date(y, o.m, (o.m === 2 && o.d === 29 && !K.isLeap(y)) ? 28 : o.d); };
  /* 시작일부터 N개월 기간이 끝나는 날(만료일) — 민법 제160조 방식:
   * N개월 뒤 같은 날의 하루 전. 그 달에 같은 날이 없으면 그 달 말일 */
  K.termEnd = function (o, months) {
    var idx = o.y * 12 + (o.m - 1) + months;
    var y = Math.floor(idx / 12), m = idx % 12 + 1;
    if (o.d > K.dim(y, m)) return K.date(y, m, K.dim(y, m));
    return K.addDays(K.date(y, m, o.d), -1);
  };

  /* 복무기간(개월) — 병무청 병역이행안내 '복무기간' 표 (2026-11 확인) */
  K.SERVICES = [
    { id: 'army', name: '육군', months: 18, end: '전역일' },
    { id: 'marine', name: '해병대', months: 18, end: '전역일' },
    { id: 'navy', name: '해군', months: 20, end: '전역일' },
    { id: 'air', name: '공군', months: 21, end: '전역일' },
    { id: 'sanggeun', name: '상근예비역', months: 18, end: '전역일' },
    { id: 'social', name: '사회복무요원', months: 21, end: '소집해제일' },
    { id: 'alt', name: '대체복무요원', months: 36, end: '소집해제일' }
  ];
  /* 복무 계산: 전체 = 입대일~전역일(양쪽 포함), 한 날 = 입대일~오늘(오늘 포함), 남은 날 = 전역일 − 오늘 */
  K.service = function (start, months, today) {
    var end = K.termEnd(start, months);
    var total = K.diff(start, end) + 1;
    var served = Math.max(0, Math.min(total, K.diff(start, today) + 1));
    var left = K.diff(today, end);
    return {
      end: end, total: total, served: served, left: left,
      pct: Math.floor(served / total * 1000) / 10,
      state: K.diff(start, today) < 0 ? 'before' : left < 0 ? 'done' : 'serving',
      half: K.addDays(start, Math.ceil(total / 2) - 1),
      d100: K.addDays(end, -100)
    };
  };

  /* 연애 기념일 — inclusive: 사귄 날을 1일로 셈(100일 = 사귄 날 + 99일) */
  K.COUPLE_DAYS = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1500, 2000, 2500, 3000, 4000, 5000];
  K.COUPLE_YEARS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  K.couple = function (start, inclusive, today) {
    var inc = inclusive ? 1 : 0, rows = [];
    K.COUPLE_DAYS.forEach(function (n) { rows.push({ label: n.toLocaleString('ko-KR') + '일', kind: 'day', n: n, date: K.addDays(start, n - inc) }); });
    K.COUPLE_YEARS.forEach(function (n) { rows.push({ label: n + '주년', kind: 'year', n: n, date: K.addYears(start, n) }); });
    rows.forEach(function (r) { r.left = K.diff(today, r.date); });
    rows.sort(function (a, b) { return K.utc(a.date) - K.utc(b.date) || (a.kind === 'year' ? 1 : -1); });
    var passed = K.diff(start, today);
    return { rows: rows, passed: passed, count: passed + inc, next: rows.filter(function (r) { return r.left >= 0; })[0] || null };
  };

  /* 결혼기념일 이름 — 표준국어대사전(국립국어원) 뜻풀이의 주년. 자료마다 다르다 */
  K.WEDDING_NAMES = { 1: '지혼식', 5: '목혼식', 10: '석혼식', 15: '동혼식', 20: '도혼식', 25: '은혼식', 30: '진주혼식', 35: '산호혼식', 40: '모직혼식', 45: '견혼식', 50: '금혼식', 60: '금강혼식 · 회혼' };
  K.wedding = function (start, today) {
    var passed = K.diff(start, today);
    var years = today.y - start.y;
    if (years > 0 && K.diff(K.addYears(start, years), today) < 0) years--;
    if (passed < 0) years = 0;
    var nextN = passed < 0 ? 0 : (K.diff(K.addYears(start, years), today) === 0 ? years : years + 1);
    var set = {};
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60].forEach(function (n) { set[n] = 1; });
    [nextN, nextN + 1, nextN + 2].forEach(function (n) { if (n >= 1) set[n] = 1; });
    var rows = Object.keys(set).map(Number).sort(function (a, b) { return a - b; }).map(function (n) {
      var dt = K.addYears(start, n);
      return { n: n, date: dt, name: K.WEDDING_NAMES[n] || '', left: K.diff(today, dt) };
    });
    var next = nextN >= 1 ? { n: nextN, date: K.addYears(start, nextN) } : { n: 0, date: start };
    next.left = K.diff(today, next.date);
    next.name = K.WEDDING_NAMES[next.n] || '';
    return { passed: passed, years: years, next: next, rows: rows };
  };

  K.fmt = function (o) { return o.y + '년 ' + o.m + '월 ' + o.d + '일'; };
  K.fmtW = function (o) { return K.fmt(o) + ' (' + WD[o.w] + ')'; };
  K.dday = function (left) { return left === 0 ? 'D-day' : left > 0 ? 'D-' + left.toLocaleString('ko-KR') : 'D+' + (-left).toLocaleString('ko-KR'); };

  if (typeof module !== 'undefined' && module.exports) { module.exports = K; return; }
  root.SaengilCalc = K;
  if (typeof document === 'undefined') return;

  /* ---------- 화면 ---------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function num(n) { return n.toLocaleString('ko-KR'); }
  function isoOf(o) { return o.y + '-' + pad(o.m) + '-' + pad(o.d); }
  function today() { var n = new Date(); return K.date(n.getFullYear(), n.getMonth() + 1, n.getDate()); }
  function parse(s) {
    var p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    if (!p) return null;
    var y = +p[1], m = +p[2], d = +p[3];
    if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > K.dim(y, m)) return null;
    return K.date(y, m, d);
  }
  function fact(label, big, sub, hi) { return '<div class="fact' + (hi ? ' hi' : '') + '"><small>' + label + '</small><b>' + big + '</b><i>' + (sub || '') + '</i></div>'; }
  function show(el, html) { el.innerHTML = html; el.hidden = false; el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  function bad(el) { show(el, '<p class="callout">날짜를 다시 확인해 주세요. 1900년부터 2100년까지 계산할 수 있습니다.</p>'); }
  function leftTxt(left) { return left === 0 ? '<b>오늘</b>' : left > 0 ? 'D-' + num(left) : num(-left) + '일 지남'; }
  function wdCls(w) { return w === 0 ? 'sun' : w === 6 ? 'sat' : ''; }
  function setup(id, fn) {
    var f = document.getElementById(id);
    if (!f) return;
    var T = today();
    var first = f.querySelector('input[type=date]');
    if (first && !first.value) first.value = isoOf(T);
    f.addEventListener('submit', function (e) { e.preventDefault(); fn(f, today()); });
  }

  /* 전역일 */
  setup('army-form', function (f, T) {
    var out = document.getElementById('army-out');
    var s = parse(f.querySelector('[name=start]').value);
    if (!s) return bad(out);
    var sv = K.SERVICES.filter(function (x) { return x.id === f.querySelector('[name=type]').value; })[0] || K.SERVICES[0];
    var r = K.service(s, sv.months, T);
    var inW = sv.end === '소집해제일' ? '소집' : '입대';
    var lead = r.state === 'before'
      ? inW + '까지 <b>D-' + num(K.diff(T, s)) + '</b>, ' + sv.end + '까지는 ' + num(r.left) + '일 남았습니다.'
      : r.state === 'done' ? sv.end + '이 <b>' + num(-r.left) + '일</b> 지났습니다. 고생하셨습니다.'
        : r.left === 0 ? '<b>오늘이 ' + sv.end + '</b>입니다. 고생하셨습니다.'
          : sv.end + '까지 <b>' + num(r.left) + '일</b> 남았고, 복무율은 <b>' + r.pct.toFixed(1) + '%</b>입니다.';
    show(out,
      '<p class="lead"><b>' + K.fmt(s) + '</b> ' + sv.name + ' ' + inW + ' → ' + sv.end + '은 <b>' + K.fmtW(r.end) + '</b>입니다. ' + lead + '</p>' +
      '<div class="bar" role="img" aria-label="복무율 ' + r.pct.toFixed(1) + '%"><span style="width:' + r.pct + '%"></span></div>' +
      '<div class="facts">' +
      fact(sv.end, r.end.m + '월 ' + r.end.d + '일', r.end.y + '년 · ' + WD[r.end.w] + '요일', true) +
      fact('남은 날', r.state === 'done' ? '0일' : K.dday(r.left), r.state === 'before' ? inW + ' 전' : r.state === 'done' ? '복무 끝' : '오늘 빼고 셈') +
      fact('복무율', r.pct.toFixed(1) + '%', num(r.served) + '일 / ' + num(r.total) + '일') +
      fact('복무기간', sv.months + '개월', '모두 ' + num(r.total) + '일') +
      fact('절반 지나는 날', r.half.m + '월 ' + r.half.d + '일', r.half.y + '년 · ' + leftTxt(K.diff(T, r.half)).replace(/<\/?b>/g, '')) +
      fact('100일 남는 날', r.d100.m + '월 ' + r.d100.d + '일', r.d100.y + '년 · ' + leftTxt(K.diff(T, r.d100)).replace(/<\/?b>/g, '')) +
      '</div><p class="note">휴가·징계·복무 조정은 넣지 않은 계산입니다. 정확한 날짜는 소속 부대나 병무청에서 확인하세요.</p>');
  });

  /* 연애 기념일 */
  setup('couple-form', function (f, T) {
    var out = document.getElementById('couple-out');
    var s = parse(f.querySelector('[name=start]').value);
    if (!s) return bad(out);
    var inc = f.querySelector('[name=inclusive]').checked;
    var r = K.couple(s, inc, T);
    var lead = r.passed < 0 ? '까지 <b>D-' + num(-r.passed) + '</b>입니다.' : '부터 오늘은 <b>' + num(r.count) + '일째</b>입니다.';
    var nx = r.next ? fact('다음 기념일', r.next.label, K.fmtW(r.next.date) + ' · ' + K.dday(r.next.left), true) : '';
    show(out,
      '<p class="lead"><b>' + K.fmtW(s) + '</b>' + lead + ' <span class="note">(' + (inc ? '사귄 날을 1일로 셈' : '사귄 다음 날을 1일로 셈') + ')</span></p>' +
      '<div class="facts">' + nx + fact('오늘', r.passed < 0 ? 'D-' + num(-r.passed) : num(r.count) + '일', K.fmtW(T)) + fact('사귄 날', s.m + '월 ' + s.d + '일', s.y + '년 · ' + WD[s.w] + '요일') + '</div>' +
      '<div class="tw"><table><thead><tr><th>기념일</th><th>날짜</th><th>요일</th><th>오늘 기준</th></tr></thead><tbody>' +
      r.rows.map(function (x) { return '<tr' + (r.next === x ? ' class="sub"' : '') + '><td><b>' + x.label + '</b></td><td>' + K.fmt(x.date) + '</td><td class="' + wdCls(x.date.w) + '">' + WD[x.date.w] + '</td><td class="note">' + leftTxt(x.left) + '</td></tr>'; }).join('') +
      '</tbody></table></div>');
  });

  /* 결혼기념일 */
  setup('wedding-form', function (f, T) {
    var out = document.getElementById('wedding-out');
    var s = parse(f.querySelector('[name=start]').value);
    if (!s) return bad(out);
    var r = K.wedding(s, T);
    var lead = r.passed < 0 ? '결혼식까지 <b>D-' + num(-r.passed) + '</b>입니다.'
      : r.passed === 0 ? '<b>오늘이 결혼식 날</b>입니다. 축하합니다.'
      : r.next.left === 0 && r.next.n >= 1 ? '오늘이 <b>결혼 ' + r.next.n + '주년</b>입니다. 축하합니다.'
        : '결혼한 지 <b>' + num(r.passed) + '일</b>(만 ' + r.years + '년)이 지났습니다.';
    show(out,
      '<p class="lead"><b>' + K.fmtW(s) + '</b> 결혼 → ' + lead + '</p>' +
      '<div class="facts">' +
      fact(r.next.n >= 1 ? '다음 기념일 · ' + r.next.n + '주년' : '결혼식', K.dday(r.next.left), K.fmtW(r.next.date) + (r.next.name ? ' · ' + r.next.name : ''), true) +
      fact('지금까지', r.passed < 0 ? '-' : num(r.passed) + '일', r.passed < 0 ? '결혼 전' : '결혼한 날을 1일로 세면 ' + num(r.passed + 1) + '일째') +
      fact('지난 기념일', r.passed < 0 ? '-' : r.years + '번', r.passed < 0 ? '' : num(Math.floor(r.passed / 7)) + '주') +
      '</div>' +
      '<div class="tw"><table><thead><tr><th>기념일</th><th>날짜</th><th>요일</th><th>이름</th><th>오늘 기준</th></tr></thead><tbody>' +
      r.rows.map(function (x) { return '<tr' + (x.n === r.next.n ? ' class="sub"' : '') + '><td><b>' + x.n + '주년</b></td><td>' + K.fmt(x.date) + '</td><td class="' + wdCls(x.date.w) + '">' + WD[x.date.w] + '</td><td>' + x.name + '</td><td class="note">' + leftTxt(x.left) + '</td></tr>'; }).join('') +
      '</tbody></table></div>');
  });

  /* 수능 D-day — 시험일은 한국 시각 기준. 페이지에 박아 둔 날짜(data-date)로 D-day·남은 시간을 다시 계산 */
  var su = document.querySelectorAll('[data-suneung]');
  if (su.length) {
    var KST = 9 * 3600e3;
    var tick = function () {
      var now = Date.now();
      var kt = K.from(now + KST);
      for (var i = 0; i < su.length; i++) {
        var p = su[i].getAttribute('data-suneung').split('-').map(Number);
        var dt = K.date(p[0], p[1], p[2]);
        var left = K.diff(kt, dt);
        var dd = su[i].querySelector('[data-k=dday]'), cd = su[i].querySelector('[data-k=count]');
        if (dd) dd.textContent = left < 0 ? '끝남' : K.dday(left);
        if (cd) {
          var ms = K.utc(dt) - KST - now;
          if (ms <= 0) cd.textContent = left === 0 ? '오늘이 시험일입니다' : '시험이 끝났습니다';
          else { var s = Math.floor(ms / 1000); cd.textContent = Math.floor(s / 86400) + '일 ' + pad(Math.floor(s % 86400 / 3600)) + '시간 ' + pad(Math.floor(s % 3600 / 60)) + '분 ' + pad(s % 60) + '초'; }
        }
      }
    };
    tick();
    setInterval(tick, 1000);
  }
})(this);
