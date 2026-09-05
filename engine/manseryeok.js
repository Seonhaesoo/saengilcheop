/* ============================================================
 * 사주서재 — 만세력 계산 엔진
 * 순수 계산 모듈 (DOM 의존 없음). window.Manseryeok 으로 노출.
 *
 * 방식
 *  - 년주/월주: 태양의 시황경(apparent longitude)을 천문 계산해
 *    절기(節氣) 경계를 직접 판정 (입춘 315° 기준, 월은 30° 간격)
 *  - 일주: 율리우스적일(JDN) 기반 60갑자 순환
 *  - 시주: 시두법 (야자시 방식: 23시 이후 출생은 익일 천간 기준)
 *  - 진태양시: 출생지 경도 보정 (기본 서울 126.978°E)
 *  - 표준시 이력: 1954-03-21 ~ 1961-08-09 UTC+8:30 반영
 *
 * 한계 (UI에서 고지)
 *  - 절기 시각 정밀도 약 ±수 분 (경계 ±2시간 이내 출생은 경고 표시)
 *  - 1948~1960, 1987~1988년 서머타임 미반영 (경고 표시)
 *  - 음력 입력 미지원 (양력 전용)
 * ============================================================ */
(function () {
  'use strict';

  /* ---------- 기초 데이터 ---------- */

  var STEMS = [
    { han: '甲', kor: '갑', el: '목', yang: true },
    { han: '乙', kor: '을', el: '목', yang: false },
    { han: '丙', kor: '병', el: '화', yang: true },
    { han: '丁', kor: '정', el: '화', yang: false },
    { han: '戊', kor: '무', el: '토', yang: true },
    { han: '己', kor: '기', el: '토', yang: false },
    { han: '庚', kor: '경', el: '금', yang: true },
    { han: '辛', kor: '신', el: '금', yang: false },
    { han: '壬', kor: '임', el: '수', yang: true },
    { han: '癸', kor: '계', el: '수', yang: false }
  ];

  var BRANCHES = [
    { han: '子', kor: '자', el: '수' },
    { han: '丑', kor: '축', el: '토' },
    { han: '寅', kor: '인', el: '목' },
    { han: '卯', kor: '묘', el: '목' },
    { han: '辰', kor: '진', el: '토' },
    { han: '巳', kor: '사', el: '화' },
    { han: '午', kor: '오', el: '화' },
    { han: '未', kor: '미', el: '토' },
    { han: '申', kor: '신', el: '금' },
    { han: '酉', kor: '유', el: '금' },
    { han: '戌', kor: '술', el: '토' },
    { han: '亥', kor: '해', el: '수' }
  ];

  /* 지장간 (여기 → 중기 → 본기 순, 마지막이 본기) — 천간 인덱스 */
  var JIJANGGAN = {
    0:  [8, 9],        // 子: 壬 癸
    1:  [9, 7, 5],     // 丑: 癸 辛 己
    2:  [4, 2, 0],     // 寅: 戊 丙 甲
    3:  [0, 1],        // 卯: 甲 乙
    4:  [1, 9, 4],     // 辰: 乙 癸 戊
    5:  [4, 6, 2],     // 巳: 戊 庚 丙
    6:  [2, 5, 3],     // 午: 丙 己 丁
    7:  [3, 1, 5],     // 未: 丁 乙 己
    8:  [4, 8, 6],     // 申: 戊 壬 庚
    9:  [6, 7],        // 酉: 庚 辛
    10: [7, 3, 4],     // 戌: 辛 丁 戊
    11: [4, 0, 8]      // 亥: 戊 甲 壬
  };

  /* 오행 상생: 목→화→토→금→수→목 */
  var GEN_NEXT = { '목': '화', '화': '토', '토': '금', '금': '수', '수': '목' };
  /* 오행 상극: 목→토, 토→수, 수→화, 화→금, 금→목 */
  var CONTROL = { '목': '토', '토': '수', '수': '화', '화': '금', '금': '목' };

  /* 지지 육합: 子丑 寅亥 卯戌 辰酉 巳申 午未 */
  var YUKHAP = { 0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6 };
  /* 지지 충: 子午 丑未 寅申 卯酉 辰戌 巳亥 */
  var CHUNG = { 0: 6, 6: 0, 1: 7, 7: 1, 2: 8, 8: 2, 3: 9, 9: 3, 4: 10, 10: 4, 5: 11, 11: 5 };
  /* 삼합국: 申子辰(수) 亥卯未(목) 寅午戌(화) 巳酉丑(금) */
  var SAMHAP_GROUP = { 8: 0, 0: 0, 4: 0, 11: 1, 3: 1, 7: 1, 2: 2, 6: 2, 10: 2, 5: 3, 9: 3, 1: 3 };

  /* 절(節) 이름 — 월 경계가 되는 12절기, 황경 315°부터 30° 간격 */
  var TERM_NAMES = ['입춘', '경칩', '청명', '입하', '망종', '소서',
                    '입추', '백로', '한로', '입동', '대설', '소한'];

  var SEASONS = {
    '봄':   { branches: [2, 3, 4],  wang: '木旺' },
    '여름': { branches: [5, 6, 7],  wang: '火旺' },
    '가을': { branches: [8, 9, 10], wang: '金旺' },
    '겨울': { branches: [11, 0, 1], wang: '水旺' }
  };

  /* ---------- 달력 유틸 (그레고리력, 정수 연산) ---------- */

  function daysFromCivil(y, m, d) {
    // 1970-01-01 = 0 (Howard Hinnant 알고리즘)
    y -= (m <= 2) ? 1 : 0;
    var era = Math.floor(y / 400);
    var yoe = y - era * 400;
    var doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
    var doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
    return era * 146097 + doe - 719468;
  }

  function civilFromDays(z) {
    z += 719468;
    var era = Math.floor(z / 146097);
    var doe = z - era * 146097;
    var yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
    var y = yoe + era * 400;
    var doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
    var mp = Math.floor((5 * doy + 2) / 153);
    var d = doy - Math.floor((153 * mp + 2) / 5) + 1;
    var m = mp + (mp < 10 ? 3 : -9);
    y += (m <= 2) ? 1 : 0;
    return { y: y, m: m, d: d };
  }

  var JDN_EPOCH = 2440588; // JDN of 1970-01-01

  function isLeap(y) {
    return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  }

  function daysInMonth(y, m) {
    return [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
  }

  /* ---------- 한국 표준시 이력 ---------- */

  function utcOffsetMinutes(y, m, d) {
    var dn = daysFromCivil(y, m, d);
    // 1954-03-21 ~ 1961-08-09: UTC+8:30
    if (dn >= daysFromCivil(1954, 3, 21) && dn <= daysFromCivil(1961, 8, 9)) return 510;
    // 1908-04-01 ~ 1911-12-31: UTC+8:30 (구한말 표준시)
    if (dn >= daysFromCivil(1908, 4, 1) && dn <= daysFromCivil(1911, 12, 31)) return 510;
    return 540; // UTC+9
  }

  /* 서머타임 시행 연도 (미반영 — 경고용) */
  function isDstEraYear(y) {
    return (y >= 1948 && y <= 1951) || (y >= 1955 && y <= 1960) || y === 1987 || y === 1988;
  }

  /* ---------- 천문 계산: 태양 시황경 ---------- */

  var DELTA_T_TABLE = [
    [1900, -3], [1920, 21], [1940, 24], [1950, 29], [1960, 33],
    [1970, 40], [1980, 51], [1990, 57], [2000, 64], [2010, 66],
    [2020, 70], [2030, 74], [2050, 85], [2100, 120]
  ];

  function deltaTSeconds(year) {
    var t = DELTA_T_TABLE;
    if (year <= t[0][0]) return t[0][1];
    if (year >= t[t.length - 1][0]) return t[t.length - 1][1];
    for (var i = 0; i < t.length - 1; i++) {
      if (year >= t[i][0] && year <= t[i + 1][0]) {
        var f = (year - t[i][0]) / (t[i + 1][0] - t[i][0]);
        return t[i][1] + f * (t[i + 1][1] - t[i][1]);
      }
    }
    return 69;
  }

  function rad(deg) { return deg * Math.PI / 180; }

  function norm360(x) { x = x % 360; return x < 0 ? x + 360 : x; }

  /* jdUt: 율리우스일 (UT 기준). 반환: 시황경(도, 0~360) */
  function solarLongitude(jdUt) {
    var year = civilFromDays(Math.floor(jdUt - JDN_EPOCH + 0.5)).y;
    var jdTt = jdUt + deltaTSeconds(year) / 86400;
    var T = (jdTt - 2451545.0) / 36525;
    var L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    var M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
    var Mr = rad(M);
    var C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr)
          + (0.019993 - 0.000101 * T) * Math.sin(2 * Mr)
          + 0.000289 * Math.sin(3 * Mr);
    var trueLon = L0 + C;
    var omega = 125.04 - 1934.136 * T;
    var lambda = trueLon - 0.00569 - 0.00478 * Math.sin(rad(omega));
    return norm360(lambda);
  }

  /* 목표 황경(도)에 도달하는 시각(JD, UT)을 이분법으로 탐색.
     jdLo~jdHi 구간에서 황경이 target을 한 번 지난다고 가정. */
  function findTermJd(targetDeg, jdLo, jdHi) {
    var f = function (jd) {
      var diff = solarLongitude(jd) - targetDeg;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      return diff; // 통과 전 음수 → 통과 후 양수
    };
    var lo = jdLo, hi = jdHi;
    for (var i = 0; i < 60; i++) {
      var mid = (lo + hi) / 2;
      if (f(mid) < 0) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  /* 해당 연도의 입춘(황경 315°) 시각 — JD(UT) */
  function ipchunJd(year) {
    var approx = daysFromCivil(year, 2, 4) + JDN_EPOCH - 0.5; // 2/4 00:00 UT 부근
    return findTermJd(315, approx - 6, approx + 6);
  }

  /* ---------- 간지 유틸 ---------- */

  function dayPillarIndex(jdn) {
    var idx = (jdn + 49) % 60;
    return idx < 0 ? idx + 60 : idx;
  }

  function pillarFromIndex(idx) {
    return { stem: idx % 10, branch: idx % 12 };
  }

  function yearPillarOf(effYear) {
    var s = ((effYear - 4) % 10 + 10) % 10;
    var b = ((effYear - 4) % 12 + 12) % 12;
    return { stem: s, branch: b };
  }

  /* 월두법: 연간(年干)으로 인월(寅月) 천간을 구해 순행 */
  function monthPillarOf(yearStem, monthIdx) {
    var inStem = ((yearStem % 5) * 2 + 2) % 10;
    return { stem: (inStem + monthIdx) % 10, branch: (2 + monthIdx) % 12 };
  }

  /* 시두법: 일간으로 자시(子時) 천간을 구해 순행 */
  function hourStemOf(dayStem, slotIdx) {
    var jaStem = (dayStem % 5) * 2;
    return (jaStem + slotIdx) % 10;
  }

  /* ---------- 십성 ---------- */

  function sipseongOf(dayStemIdx, targetStemIdx) {
    if (targetStemIdx === null || targetStemIdx === undefined) return null;
    var me = STEMS[dayStemIdx], t = STEMS[targetStemIdx];
    var same = (me.yang === t.yang);
    if (t.el === me.el) return same ? '비견' : '겁재';
    if (GEN_NEXT[me.el] === t.el) return same ? '식신' : '상관';
    if (CONTROL[me.el] === t.el) return same ? '편재' : '정재';
    if (CONTROL[t.el] === me.el) return same ? '편관' : '정관';
    if (GEN_NEXT[t.el] === me.el) return same ? '편인' : '정인';
    return null;
  }

  function branchSipseong(dayStemIdx, branchIdx) {
    var hidden = JIJANGGAN[branchIdx];
    var principal = hidden[hidden.length - 1];
    return sipseongOf(dayStemIdx, principal);
  }

  /* ---------- 지지 관계 (오늘의 운세용) ---------- */

  function branchRelation(a, b) {
    if (a === b) return '동일';
    if (YUKHAP[a] === b) return '육합';
    if (CHUNG[a] === b) return '충';
    if (SAMHAP_GROUP[a] === SAMHAP_GROUP[b]) return '삼합';
    return null;
  }

  /* 특정 날짜(현지 자정 경계)의 일진 */
  function dayPillarOf(y, m, d) {
    var idx = dayPillarIndex(daysFromCivil(y, m, d) + JDN_EPOCH);
    return pillarFromIndex(idx);
  }

  /* 오늘의 일진과 명식의 관계 요약 */
  function todayInfo(result, y, m, d) {
    var today = dayPillarOf(y, m, d);
    var meStem = result.pillars.day.stem;
    return {
      pillar: today,
      stemSipseong: sipseongOf(meStem, today.stem),
      branchSipseong: branchSipseong(meStem, today.branch),
      relation: branchRelation(today.branch, result.pillars.day.branch)
    };
  }

  /* ---------- 메인 계산 ---------- */

  /**
   * opts = {
   *   year, month, day        : 양력 생년월일 (숫자)
   *   hour, minute            : 출생 시각 (unknownTime이면 무시)
   *   unknownTime             : true면 시주 생략
   *   gender                  : 'F' | 'M'
   *   applySolarTime          : 진태양시 보정 여부 (기본 true)
   *   longitude               : 출생지 경도 (기본 서울 126.978)
   *   nowYear                 : 현재 연도 (대운 하이라이트용, 기본 시스템)
   * }
   */
  function compute(opts) {
    var y = opts.year, mo = opts.month, d = opts.day;
    var unknownTime = !!opts.unknownTime;
    var hh = unknownTime ? 12 : opts.hour;
    var mi = unknownTime ? 0 : opts.minute;
    var applySolar = opts.applySolarTime !== false;
    var lon = (typeof opts.longitude === 'number') ? opts.longitude : 126.978;
    var nowYear = opts.nowYear || new Date().getFullYear();

    /* --- 시각 보정 --- */
    /* tzOffsetMinutes: 한국 외 출생지용 UTC 오프셋(분) 오버라이드 (영문판 등) */
    var tzOverride = (typeof opts.tzOffsetMinutes === 'number');
    var offsetMin = tzOverride ? opts.tzOffsetMinutes : utcOffsetMinutes(y, mo, d);
    var meridian = offsetMin / 4; // 표준자오선 (도)
    var solarCorrMin = applySolar ? Math.round((lon - meridian) * 4) : 0;

    // 보정 적용한 '명리 시각' (분 단위, 날짜 이월 처리)
    var dn = daysFromCivil(y, mo, d);
    var corrTotal = hh * 60 + mi + solarCorrMin;
    var corrDn = dn + Math.floor(corrTotal / 1440);
    var corrMin = ((corrTotal % 1440) + 1440) % 1440;
    var corrCivil = civilFromDays(corrDn);

    // UT 기준 율리우스일 (절기 판정용 — 표준시 그대로 사용)
    var jdUt = dn + JDN_EPOCH - 0.5 + (hh * 60 + mi - offsetMin) / 1440;

    /* --- 년주 --- */
    var ipchun = ipchunJd(y);
    var effYear = (jdUt < ipchun) ? y - 1 : y;
    var yearP = yearPillarOf(effYear);

    /* --- 월주 (황경으로 직접 판정) --- */
    var lambda = solarLongitude(jdUt);
    var monthIdx = Math.floor(norm360(lambda - 315) / 30); // 0=寅 … 11=丑
    var monthP = monthPillarOf(yearP.stem, monthIdx);

    /* --- 절기 경계 근접 경고 --- */
    var intoDeg = norm360(lambda - 315) % 30;
    var degPerHour = 360 / 365.2422 / 24;
    var hoursFromPrev = intoDeg / degPerHour;
    var hoursToNext = (30 - intoDeg) / degPerHour;
    var jeolipWarning = null;
    if (hoursFromPrev <= 2) {
      jeolipWarning = { term: TERM_NAMES[monthIdx], side: 'after', hours: hoursFromPrev };
    } else if (hoursToNext <= 2) {
      jeolipWarning = { term: TERM_NAMES[(monthIdx + 1) % 12], side: 'before', hours: hoursToNext };
    }

    /* --- 일주 (보정 시각 기준, 자정 경계) --- */
    var dayJdn = corrDn + JDN_EPOCH;
    var dayIdx = dayPillarIndex(dayJdn);
    var dayP = pillarFromIndex(dayIdx);

    /* --- 시주 (야자시: 23시 이후는 익일 일간 기준 자시) --- */
    var hourP = null, slotIdx = null, yajasi = false;
    if (!unknownTime) {
      slotIdx = Math.floor(((corrMin + 60) % 1440) / 120); // 0=子 … 11=亥
      var baseStem = dayP.stem;
      if (corrMin >= 23 * 60) {
        yajasi = true;
        baseStem = pillarFromIndex(dayPillarIndex(dayJdn + 1)).stem;
      }
      hourP = { stem: hourStemOf(baseStem, slotIdx), branch: slotIdx };
    }

    /* --- 오행 분포 --- */
    var chars = [
      { kind: 'stem', idx: yearP.stem }, { kind: 'branch', idx: yearP.branch },
      { kind: 'stem', idx: monthP.stem }, { kind: 'branch', idx: monthP.branch },
      { kind: 'stem', idx: dayP.stem }, { kind: 'branch', idx: dayP.branch }
    ];
    if (hourP) {
      chars.push({ kind: 'stem', idx: hourP.stem }, { kind: 'branch', idx: hourP.branch });
    }
    var elements = { '목': 0, '화': 0, '토': 0, '금': 0, '수': 0 };
    chars.forEach(function (c) {
      var el = (c.kind === 'stem') ? STEMS[c.idx].el : BRANCHES[c.idx].el;
      elements[el]++;
    });

    /* --- 신강약 (간이 판정: 월지 가중 2) --- */
    var meEl = STEMS[dayP.stem].el;
    var support = 0, total = 0;
    function isSupport(el) { return el === meEl || GEN_NEXT[el] === meEl; }
    [{ el: STEMS[yearP.stem].el, w: 1 }, { el: BRANCHES[yearP.branch].el, w: 1 },
     { el: STEMS[monthP.stem].el, w: 1 }, { el: BRANCHES[monthP.branch].el, w: 2 },
     { el: BRANCHES[dayP.branch].el, w: 1.5 }]
      .concat(hourP ? [{ el: STEMS[hourP.stem].el, w: 1 }, { el: BRANCHES[hourP.branch].el, w: 1 }] : [])
      .forEach(function (it) { total += it.w; if (isSupport(it.el)) support += it.w; });
    var ratio = support / total;
    var strengthLabel = ratio >= 0.55 ? '신강' : (ratio <= 0.35 ? '신약' : '중화');

    /* --- 계절 --- */
    var season = null;
    Object.keys(SEASONS).forEach(function (name) {
      if (SEASONS[name].branches.indexOf(monthP.branch) >= 0) {
        season = { name: name, wang: SEASONS[name].wang };
      }
    });

    /* --- 십성 --- */
    var sipseong = {
      yearStem: sipseongOf(dayP.stem, yearP.stem),
      yearBranch: branchSipseong(dayP.stem, yearP.branch),
      monthStem: sipseongOf(dayP.stem, monthP.stem),
      monthBranch: branchSipseong(dayP.stem, monthP.branch),
      hourStem: hourP ? sipseongOf(dayP.stem, hourP.stem) : null,
      hourBranch: hourP ? branchSipseong(dayP.stem, hourP.branch) : null
    };

    /* 십성 집계 (일간 제외 7자 또는 5자) */
    var sipseongCounts = {};
    [sipseong.yearStem, sipseong.yearBranch, sipseong.monthStem, sipseong.monthBranch,
     branchSipseong(dayP.stem, dayP.branch), sipseong.hourStem, sipseong.hourBranch]
      .forEach(function (s) { if (s) sipseongCounts[s] = (sipseongCounts[s] || 0) + 1; });

    /* --- 대운 --- */
    var yangYear = (yearP.stem % 2 === 0);
    var male = (opts.gender === 'M');
    var forward = (yangYear && male) || (!yangYear && !male);

    // 대운수: 다음(순행)/이전(역행) 절입까지의 날수 ÷ 3
    var prevTermJd = jdUt - (intoDeg / degPerHour) / 24;
    var nextTermJd = jdUt + (hoursToNext) / 24;
    // 근사값을 이분법으로 정밀화
    var targetPrev = norm360(315 + monthIdx * 30);
    var targetNext = norm360(315 + (monthIdx + 1) * 30);
    prevTermJd = findTermJd(targetPrev, prevTermJd - 2, prevTermJd + 2);
    nextTermJd = findTermJd(targetNext, nextTermJd - 2, nextTermJd + 2);
    var gapDays = forward ? (nextTermJd - jdUt) : (jdUt - prevTermJd);
    var daeunSu = Math.round(gapDays / 3);
    if (daeunSu < 1) daeunSu = 1;
    if (daeunSu > 10) daeunSu = 10;

    var monthCycleIdx = (function () {
      // 월주의 60갑자 인덱스 (stem, branch에서 역산)
      for (var i = 0; i < 60; i++) {
        if (i % 10 === monthP.stem && i % 12 === monthP.branch) return i;
      }
      return 0;
    })();

    var koreanAge = nowYear - y + 1;
    var daeunList = [];
    for (var k = 1; k <= 8; k++) {
      var idx60 = ((monthCycleIdx + (forward ? k : -k)) % 60 + 60) % 60;
      var p = pillarFromIndex(idx60);
      var startAge = daeunSu + (k - 1) * 10;
      daeunList.push({
        stem: p.stem,
        branch: p.branch,
        startAge: startAge,
        endAge: startAge + 9,
        sipseong: sipseongOf(dayP.stem, p.stem),
        current: (koreanAge >= startAge && koreanAge <= startAge + 9)
      });
    }

    return {
      input: {
        year: y, month: mo, day: d,
        hour: unknownTime ? null : hh, minute: unknownTime ? null : mi,
        unknownTime: unknownTime, gender: opts.gender,
        applySolarTime: applySolar
      },
      time: {
        offsetMinutes: offsetMin,
        solarCorrectionMin: solarCorrMin,
        corrected: { y: corrCivil.y, m: corrCivil.m, d: corrCivil.d, minOfDay: corrMin },
        yajasi: yajasi,
        dstEraWarning: tzOverride ? false : isDstEraYear(y)
      },
      pillars: { year: yearP, month: monthP, day: dayP, hour: hourP },
      effYear: effYear,
      monthIdx: monthIdx,
      solarLongitude: lambda,
      jeolipWarning: jeolipWarning,
      elements: elements,
      totalChars: chars.length,
      strength: { ratio: ratio, label: strengthLabel },
      season: season,
      sipseong: sipseong,
      sipseongCounts: sipseongCounts,
      daeun: { forward: forward, su: daeunSu, list: daeunList, koreanAge: koreanAge }
    };
  }

  /* ---------- 표시 유틸 ---------- */

  function stemInfo(i) { return STEMS[i]; }
  function branchInfo(i) { return BRANCHES[i]; }

  function ganjiName(stemIdx, branchIdx) {
    return {
      han: STEMS[stemIdx].han + BRANCHES[branchIdx].han,
      kor: STEMS[stemIdx].kor + BRANCHES[branchIdx].kor
    };
  }

  var HOUR_SLOT_LABELS = [
    '자시 子時 · 23:00 ~ 01:00', '축시 丑時 · 01:00 ~ 03:00', '인시 寅時 · 03:00 ~ 05:00',
    '묘시 卯時 · 05:00 ~ 07:00', '진시 辰時 · 07:00 ~ 09:00', '사시 巳時 · 09:00 ~ 11:00',
    '오시 午時 · 11:00 ~ 13:00', '미시 未時 · 13:00 ~ 15:00', '신시 申時 · 15:00 ~ 17:00',
    '유시 酉時 · 17:00 ~ 19:00', '술시 戌時 · 19:00 ~ 21:00', '해시 亥時 · 21:00 ~ 23:00'
  ];

  /* ---------- 공개 API ---------- */

  window.Manseryeok = {
    compute: compute,
    STEMS: STEMS,
    BRANCHES: BRANCHES,
    JIJANGGAN: JIJANGGAN,
    HOUR_SLOT_LABELS: HOUR_SLOT_LABELS,
    stemInfo: stemInfo,
    branchInfo: branchInfo,
    ganjiName: ganjiName,
    sipseongOf: sipseongOf,
    branchSipseong: branchSipseong,
    branchRelation: branchRelation,
    dayPillarOf: dayPillarOf,
    todayInfo: todayInfo,
    hourStemOf: hourStemOf,
    elCycle: { gen: GEN_NEXT, control: CONTROL },
    // 테스트용 내부 노출
    _internals: {
      daysFromCivil: daysFromCivil,
      civilFromDays: civilFromDays,
      dayPillarIndex: dayPillarIndex,
      solarLongitude: solarLongitude,
      ipchunJd: ipchunJd,
      findTermJd: findTermJd,
      utcOffsetMinutes: utcOffsetMinutes,
      daysInMonth: daysInMonth,
      isLeap: isLeap,
      JDN_EPOCH: JDN_EPOCH
    }
  };
})();
