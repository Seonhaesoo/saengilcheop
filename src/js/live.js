/* 생일첩 — 방문자 오늘 날짜 기준으로 나이·D-day 갱신 + 홈 검색 폼 */
(function () {
  'use strict';
  var WD = ['일', '월', '화', '수', '목', '금', '토'];
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function utc(y, m, d) { return Date.UTC(y, m - 1, d); }
  function fmt(y, m, d) { return y + '년 ' + m + '월 ' + d + '일'; }

  /* 오늘 (사용자 로컬) */
  var now = new Date();
  var ty = now.getFullYear(), tm = now.getMonth() + 1, td = now.getDate();

  var root = document.querySelector('[data-birth]');
  if (root) {
    var p = root.getAttribute('data-birth').split('-').map(Number);
    var by = p[0], bm = p[1], bd = p[2];
    var man = ty - by - ((tm < bm || (tm === bm && td < bd)) ? 1 : 0);
    var days = Math.round((utc(ty, tm, td) - utc(by, bm, bd)) / 864e5);
    /* 다음 생일 (2/29 생은 평년 2/28) */
    function bdayIn(y) {
      var m = bm, d = bd;
      if (m === 2 && d === 29 && !((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0)) d = 28;
      return { y: y, m: m, d: d, t: utc(y, m, d) };
    }
    var nb = bdayIn(ty);
    if (nb.t < utc(ty, tm, td)) nb = bdayIn(ty + 1);
    var dday = Math.round((nb.t - utc(ty, tm, td)) / 864e5);
    var set = function (k, v) {
      var els = document.querySelectorAll('[data-live="' + k + '"]');
      for (var i = 0; i < els.length; i++) els[i].textContent = v;
    };
    set('man', man);
    set('yeon', ty - by);
    set('se', ty - by + 1);
    set('days', days.toLocaleString('ko-KR'));
    set('weeks', Math.floor(days / 7).toLocaleString('ko-KR'));
    set('today', fmt(ty, tm, td));
    set('year', ty);
    set('dday', dday === 0 ? '오늘!' : 'D-' + dday);
    set('ddays', dday === 0 ? '오늘' : dday + '일');
    set('nextb', fmt(nb.y, nb.m, nb.d) + ' (' + WD[new Date(nb.y, nb.m - 1, nb.d).getDay()] + ')');
  }

  /* 홈·검색 폼 */
  var form = document.getElementById('bform');
  if (form) {
    var ys = form.querySelector('[name=y]'), ms = form.querySelector('[name=m]'), ds = form.querySelector('[name=d]');
    var minY = +ys.getAttribute('data-min'), maxY = +ys.getAttribute('data-max');
    for (var y = maxY; y >= minY; y--) ys.appendChild(new Option(y + '년', y));
    for (var m = 1; m <= 12; m++) ms.appendChild(new Option(m + '월', m));
    function fillDays() {
      var yy = +ys.value, mm = +ms.value;
      var n = new Date(yy, mm, 0).getDate();
      var cur = +ds.value || 1;
      ds.innerHTML = '';
      for (var d = 1; d <= n; d++) ds.appendChild(new Option(d + '일', d));
      ds.value = Math.min(cur, n);
    }
    ys.value = Math.min(maxY, Math.max(minY, ty - 30));
    ms.value = tm; fillDays(); ds.value = td;
    ys.addEventListener('change', fillDays);
    ms.addEventListener('change', fillDays);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var base = form.getAttribute('data-base') || '/';
      location.href = base + ys.value + '/' + pad(+ms.value) + '/' + pad(+ds.value) + '/';
    });
  }
})();
