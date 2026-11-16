/* 생일첩 연차 계산기 (/holidays/{y}/) — 기간을 고르면 주말·공휴일을 빼고 필요한 연차를 센다.
 * 공휴일 목록(window.HOLI = { 'YYYY-MM-DD': 이름 })은 빌드할 때 data/holidays.mjs 로 만든다.
 * count 는 tools/test-holidays.mjs 가 tools/leave.mjs 의 countRange 와 같은 값인지 확인한다. 계산은 브라우저 안에서만. */
(function (root) {
  'use strict';
  var DAY = 864e5;
  var WD = ['일', '월', '화', '수', '목', '금', '토'];
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function parse(s) {
    var p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    if (!p) return null;
    var t = Date.UTC(+p[1], +p[2] - 1, +p[3]);
    var x = new Date(t);
    return x.getUTCMonth() + 1 === +p[2] ? t : null;
  }
  function info(t) { var x = new Date(t); return { y: x.getUTCFullYear(), m: x.getUTCMonth() + 1, d: x.getUTCDate(), w: x.getUTCDay() }; }
  function isoOf(o) { return o.y + '-' + pad(o.m) + '-' + pad(o.d); }

  /* from·to: 'YYYY-MM-DD' (양끝 포함). 주말에 든 공휴일은 주말로 센다 */
  function count(from, to, holi) {
    var a = parse(from), b = parse(to);
    if (a === null || b === null || b < a) return null;
    var r = { total: 0, weekend: 0, holiday: 0, leave: 0, list: [], leaveDays: [] };
    for (var t = a; t <= b; t += DAY) {
      var o = info(t), k = isoOf(o);
      r.total++;
      if (o.w === 0 || o.w === 6) r.weekend++;
      else if (holi[k]) r.holiday++;
      else { r.leave++; r.leaveDays.push(o); }
      if (holi[k]) r.list.push({ o: o, name: holi[k] });
    }
    return r;
  }

  if (typeof module !== 'undefined' && module.exports) { module.exports = { count: count }; return; }
  if (typeof document === 'undefined') return;

  var f = document.getElementById('leave-form');
  if (!f) return;
  var out = document.getElementById('leave-out');
  function fd(o) { return o.m + '/' + o.d + '(' + WD[o.w] + ')'; }
  function fact(label, big, sub, hi) { return '<div class="fact' + (hi ? ' hi' : '') + '"><small>' + label + '</small><b>' + big + '</b><i>' + (sub || '') + '</i></div>'; }
  function show(html) { out.innerHTML = html; out.hidden = false; out.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var from = f.querySelector('[name=from]').value, to = f.querySelector('[name=to]').value;
    var min = f.querySelector('[name=from]').getAttribute('min'), max = f.querySelector('[name=from]').getAttribute('max');
    var r = count(from, to, root.HOLI || {});
    if (!r || from < min || to > max || r.total > 366) { show('<p class="callout">날짜를 다시 확인해 주세요. 마지막 날이 첫날보다 뒤여야 하고, ' + min.slice(0, 4) + '~' + max.slice(0, 4) + '년 안에서 1년 이내로 고를 수 있습니다.</p>'); return; }
    var a = info(parse(from)), b = info(parse(to));
    show('<p class="lead"><b>' + a.y + '년 ' + fd(a) + ' ~ ' + (a.y !== b.y ? b.y + '년 ' : '') + fd(b) + '</b> ' + r.total + '일을 쉬려면 연차 <b>' + r.leave + '일</b>이 필요합니다.' + (r.leave ? ' 연차 하루로 ' + (r.total / r.leave).toFixed(1) + '일을 쉬는 셈입니다.' : ' 연차 없이 쉴 수 있습니다.') + '</p>' +
      '<div class="facts">' + fact('필요한 연차', r.leave + '일', '평일 중 공휴일이 아닌 날', true) + fact('쉬는 날', r.total + '일', '첫날·마지막 날 포함') + fact('주말 · 공휴일', r.weekend + '일 · ' + r.holiday + '일', '공휴일은 평일에 든 것만') + '</div>' +
      (r.leaveDays.length ? '<p class="note">연차 쓸 날: ' + r.leaveDays.map(fd).join(', ') + '</p>' : '') +
      (r.list.length ? '<p class="note">이 기간의 공휴일: ' + r.list.map(function (x) { return fd(x.o) + ' ' + x.name; }).join(', ') + '</p>' : ''));
  });
})(this);
