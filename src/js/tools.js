/* 생일첩 계산기 — 만 나이(/age/), 디데이·100일(/dday/), 학년(/school/). 모든 계산은 브라우저 안에서만. */
(function () {
  'use strict';
  var WD = ['일', '월', '화', '수', '목', '금', '토'];
  var DDI = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'];
  var ZOD = [[1, 20, '물병자리'], [2, 19, '물고기자리'], [3, 21, '양자리'], [4, 20, '황소자리'], [5, 21, '쌍둥이자리'], [6, 22, '게자리'], [7, 23, '사자자리'], [8, 23, '처녀자리'], [9, 23, '천칭자리'], [10, 23, '전갈자리'], [11, 23, '사수자리'], [12, 25, '염소자리']];
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function utc(y, m, d) { return Date.UTC(y, m - 1, d); }
  function fromUtc(t) { var x = new Date(t); return { y: x.getUTCFullYear(), m: x.getUTCMonth() + 1, d: x.getUTCDate(), w: x.getUTCDay() }; }
  function fmt(o) { return o.y + '년 ' + o.m + '월 ' + o.d + '일 (' + WD[o.w] + ')'; }
  function isoOf(o) { return o.y + '-' + pad(o.m) + '-' + pad(o.d); }
  function parseDate(s) { var p = (s || '').split('-').map(Number); if (p.length !== 3 || !p[0] || !p[1] || !p[2]) return null; return fromUtc(utc(p[0], p[1], p[2])); }
  function today() { var n = new Date(); return fromUtc(utc(n.getFullYear(), n.getMonth() + 1, n.getDate())); }
  function daysBetween(a, b) { return Math.round((utc(b.y, b.m, b.d) - utc(a.y, a.m, a.d)) / 864e5); }
  function isLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
  function zodiac(m, d) { var name = '염소자리'; for (var i = 0; i < ZOD.length; i++) if (m > ZOD[i][0] || (m === ZOD[i][0] && d >= ZOD[i][1])) name = ZOD[i][2]; return name; }
  function ddiOf(y, m, d) { var L = window.LNY || {}; var l = L[y]; var ly = (l && (m < l[0] || (m === l[0] && d < l[1]))) ? y - 1 : y; return DDI[((ly - 4) % 12 + 12) % 12]; }
  function num(n) { return n.toLocaleString('ko-KR'); }
  function fact(label, big, sub, hi) { return '<div class="fact' + (hi ? ' hi' : '') + '"><small>' + label + '</small><b>' + big + '</b><i>' + (sub || '') + '</i></div>'; }
  function show(el, html) { el.innerHTML = html; el.hidden = false; el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }

  /* ---------- 만 나이 ---------- */
  var af = document.getElementById('age-form');
  if (af) {
    var ys = af.querySelector('[name=y]'), ms = af.querySelector('[name=m]'), ds = af.querySelector('[name=d]'), base = af.querySelector('[name=base]');
    var T = today();
    for (var y = +ys.getAttribute('data-max'); y >= +ys.getAttribute('data-min'); y--) ys.appendChild(new Option(y + '년', y));
    for (var m = 1; m <= 12; m++) ms.appendChild(new Option(m + '월', m));
    var fillDays = function () { var n = new Date(+ys.value, +ms.value, 0).getDate(); var cur = +ds.value || 1; ds.innerHTML = ''; for (var d = 1; d <= n; d++) ds.appendChild(new Option(d + '일', d)); ds.value = Math.min(cur, n); };
    ys.value = T.y - 30; ms.value = T.m; fillDays(); ds.value = T.d;
    base.value = isoOf(T);
    ys.addEventListener('change', fillDays); ms.addEventListener('change', fillDays);
    af.addEventListener('submit', function (e) {
      e.preventDefault();
      var out = document.getElementById('age-out');
      var b = parseDate(base.value) || T;
      var by = +ys.value, bm = +ms.value, bd = +ds.value;
      var birth = fromUtc(utc(by, bm, bd));
      var days = daysBetween(birth, b);
      if (days < 0) { show(out, '<p class="callout">기준일이 생년월일보다 앞입니다. 기준일을 다시 골라 주세요.</p>'); return; }
      var before = b.m < bm || (b.m === bm && b.d < bd);
      var man = b.y - by - (before ? 1 : 0);
      var nbY = before ? b.y : b.y + 1;
      var nb = fromUtc(utc(nbY, bm, (bm === 2 && bd === 29 && !isLeap(nbY)) ? 28 : bd));
      var dday = daysBetween(b, nb);
      var months = (b.y - by) * 12 + (b.m - bm) - (b.d < bd ? 1 : 0);
      var link = (by >= 1940 && utc(by, bm, bd) <= utc(T.y, T.m, T.d))
        ? '<p class="note"><a href="/' + by + '/' + pad(bm) + '/' + pad(bd) + '/">' + by + '년 ' + bm + '월 ' + bd + '일생 페이지 — 기념일·학번·띠·일주 보기 →</a></p>' : '';
      show(out,
        '<p class="lead"><b>' + by + '년 ' + bm + '월 ' + bd + '일생</b>(' + WD[birth.w] + '요일)은 ' + fmt(b) + ' 기준 <b>만 ' + man + '세</b>입니다.</p>' +
        '<div class="facts">' +
        fact('만 나이', man + '세', '법적 나이', true) +
        fact('연나이', (b.y - by) + '세', b.y + ' − ' + by) +
        fact('세는나이', (b.y - by + 1) + '세', '한국식 나이') +
        fact('태어난 지', num(days) + '일', num(Math.floor(days / 7)) + '주 · ' + num(months) + '개월') +
        fact('다음 생일', dday === 0 ? '오늘!' : 'D-' + dday, fmt(nb)) +
        fact('띠 · 별자리', ddiOf(by, bm, bd) + '띠', zodiac(bm, bd)) +
        '</div>' + link);
    });
  }

  /* ---------- 100일·기념일 ---------- */
  var df = document.getElementById('dday-form');
  if (df) {
    var T2 = today();
    var st = df.querySelector('[name=start]'); st.value = isoOf(T2);
    df.addEventListener('submit', function (e) {
      e.preventDefault();
      var s = parseDate(st.value); if (!s) return;
      var inc = df.querySelector('[name=inclusive]').checked ? 1 : 0;
      var rows = [100, 200, 300, 365, 500, 1000, 1500, 2000, 3000, 5000, 10000].map(function (n) {
        var dt = fromUtc(utc(s.y, s.m, s.d) + (n - inc) * 864e5);
        var diff = daysBetween(T2, dt);
        return '<tr><td><b>' + num(n) + '일</b></td><td>' + fmt(dt) + '</td><td class="note">' + (diff === 0 ? '오늘' : diff > 0 ? 'D-' + num(diff) : num(-diff) + '일 지남') + '</td></tr>';
      });
      var diff0 = daysBetween(s, T2);
      var since = diff0 < 0 ? '시작까지 D-' + num(-diff0) : num(diff0 + inc) + '일째';
      show(document.getElementById('dday-out'), '<p class="lead">' + fmt(s) + '부터 오늘은 <b>' + since + '</b>입니다.</p><div class="tw"><table><thead><tr><th>기념일</th><th>날짜</th><th>오늘 기준</th></tr></thead><tbody>' + rows.join('') + '</tbody></table></div>');
    });
  }

  /* ---------- 목표일 D-day ---------- */
  var tf = document.getElementById('target-form');
  if (tf) {
    var T3 = today();
    tf.addEventListener('submit', function (e) {
      e.preventDefault();
      var t = parseDate(tf.querySelector('[name=target]').value); if (!t) return;
      var diff = daysBetween(T3, t);
      show(document.getElementById('target-out'), '<div class="facts">' +
        fact('D-day', diff === 0 ? 'D-day' : diff > 0 ? 'D-' + num(diff) : 'D+' + num(-diff), fmt(t), true) +
        fact('주로 환산', num(Math.floor(Math.abs(diff) / 7)) + '주 ' + (Math.abs(diff) % 7) + '일', diff >= 0 ? '남음' : '지남') +
        fact('오늘', T3.m + '월 ' + T3.d + '일', fmt(T3)) + '</div>');
    });
  }

  /* ---------- 학년 계산 (data/school.mjs 와 같은 규칙: 출생연도+7년 3월 입학, 2002년생까지 1~2월생은 한 해 먼저) ---------- */
  var sf = document.getElementById('school-form');
  if (sf) {
    var T5 = today();
    var sy5 = sf.querySelector('[name=y]'), sm5 = sf.querySelector('[name=m]');
    for (var y5 = +sy5.getAttribute('data-max'); y5 >= +sy5.getAttribute('data-min'); y5--) sy5.appendChild(new Option(y5 + '년', y5));
    for (var m5 = 1; m5 <= 12; m5++) sm5.appendChild(new Option(m5 + '월', m5));
    sy5.value = T5.y - 10; sm5.value = T5.m;
    var GRADES = [];
    [['초등학교', 6], ['중학교', 3], ['고등학교', 3]].forEach(function (s) { for (var i = 1; i <= s[1]; i++) GRADES.push(s[0] + ' ' + i + '학년'); });
    sf.addEventListener('submit', function (e) {
      e.preventDefault();
      var by = +sy5.value, bm = +sm5.value;
      var early = by <= 2002 && bm <= 2;
      var base = early ? by - 1 : by;
      var elem = base + 7, hsGrad = base + 19, univ = base + 19;
      var syr = T5.m >= 3 ? T5.y : T5.y - 1;
      var k = syr - elem;
      var yeon = T5.y - by;
      var man = yeon <= 0 ? '0' : bm < T5.m ? String(yeon) : bm > T5.m ? String(yeon - 1) : (yeon - 1) + '~' + yeon;
      var now = k < 0 ? '미취학' : k < 12 ? GRADES[k] : k < 16 ? '대학 ' + (k - 11) + '학년' : '졸업';
      var nowSub = k < 0 ? elem + '년 3월 초등학교 입학' : k < 12 ? syr + '년 3월 ~ ' + (syr + 1) + '년 2월' : k < 16 ? '재수·휴학 없이 진학 시' : '고등 졸업 ' + hsGrad + '년 2월';
      var note = early ? ' 1~2월생이라 <b>빠른 ' + pad(by % 100) + '</b>에 해당해 ' + (by - 1) + '년생과 같은 학년입니다.' : (by === 2003 && bm <= 2 ? ' 2003년 1~2월생은 법 기준으로 2003년생과 같은 학년이지만, 2009년에 조기입학했다면 한 해 위(2002년생과 같은 학년)입니다.' : '');
      show(document.getElementById('school-out'),
        '<p class="lead"><b>' + by + '년 ' + bm + '월생</b>은 ' + T5.y + '년 ' + T5.m + '월 기준 <b>' + now + '</b>입니다.' + note + '</p>' +
        '<div class="facts">' +
        fact(syr + '학년도 지금', now, nowSub, true) +
        fact('만 나이', man + '세', '연나이 ' + yeon + ' · 세는나이 ' + (yeon + 1)) +
        fact('초등학교 입학', elem + '년 3월', '졸업 ' + (elem + 6) + '년 2월') +
        fact('고등학교 졸업', hsGrad + '년 2월', '수능 ' + (hsGrad - 1) + '년 11월') +
        fact('대학 입학', univ + '년', pad(univ % 100) + '학번 · 졸업 ' + (univ + 4) + '년') +
        fact('성년 (만 19세)', (by + 19) + '년', '술·담배는 ' + (by + 19) + '년 1월 1일부터') +
        '</div>' +
        '<p class="note"><a href="/school/' + by + '/">' + by + '년생 입학·졸업 연도표와 법적 나이 전체 보기 →</a></p>');
    });
  }

  /* ---------- N일 후·전 ---------- */
  var afm = document.getElementById('after-form');
  if (afm) {
    var T4 = today();
    var bs = afm.querySelector('[name=base]'); bs.value = isoOf(T4);
    afm.addEventListener('submit', function (e) {
      e.preventDefault();
      var b = parseDate(bs.value); var n = parseInt(afm.querySelector('[name=n]').value, 10); if (!b || isNaN(n)) return;
      var dt = fromUtc(utc(b.y, b.m, b.d) + n * 864e5);
      show(document.getElementById('after-out'), '<div class="facts">' +
        fact((n >= 0 ? num(n) + '일 후' : num(-n) + '일 전'), dt.m + '월 ' + dt.d + '일', fmt(dt), true) +
        fact('기준일', b.m + '월 ' + b.d + '일', fmt(b)) +
        fact('주로 환산', num(Math.floor(Math.abs(n) / 7)) + '주 ' + (Math.abs(n) % 7) + '일', '') + '</div>');
    });
  }
})();
