"use strict";
/* 공용 코어: 데이터 저장소, 역할(세션), 유틸, UI 빌더, 확인 창, 차트 */
const KEY = "cheonggang-v6-mock", SESSION_KEY = "cheonggang-v6-session"; /* v6: 공통 4수준 척도(운영안 v5) 데이터. 이전 5수준 데이터와 섞지 않는다 */
const labels = ["기초 수행", "기대수준 충족", "변화 기여", "전문성 공유·지원"];
const special = { before: "기초 수행 전", role: "역할 해당 없음", chance: "수행 기회 없음", hold: "확인 보류", none: "수행 계획 없음", later: "미정" };
const numbers = ["1", "2", "3", "4"], MAXLV = 4;
const PHASE_NOTE = "목업 · 시범 단계: 입력과 결과는 인사에 반영되지 않습니다.";
const domains = [...new Set(questions.map(q => q.domain))];
const DOMAIN_COLORS = ["#ec5f8c", "#f08a24", "#14b8a6", "#8b5cf6", "#3b82f6", "#22a35b"];
const domainColor = d => DOMAIN_COLORS[domains.indexOf(d)] || "#3b5bdb";
const STAGES = ["자가진단", "평가", "결과 확인", "성장 면담"];

/* 안내 문구 — 운영 부서 확정 후 이 블록만 고치면 됩니다. */
const NOTICE = {
  title: "이 진단은 이렇게 쓰입니다",
  items: [
    "내 응답은 본인, 관리자가 지정한 평가자, 관리자가 볼 수 있습니다.",
    "최근 1년의 실제 행동을 기준으로 현재 수준과 2년 뒤 목표를 솔직하게 고르세요. 수행 사례는 선택 입력입니다.",
    "수준을 고르면 상담일지 같은 업무 기록에서 확인된 행동기준이 자동으로 함께 표시됩니다. 따로 누르거나 제출할 자료는 없습니다. (현재는 가상 기록이며, 실제로는 학내 시스템 기록과 연동합니다.)",
    "결과가 통보된 뒤 확정 전까지 문항별로 이의제기를 할 수 있습니다.",
    "진단 결과의 인사상 활용 범위는 운영 부서의 안내를 따릅니다. 시범 단계의 결과는 인사에 반영되지 않습니다."
  ]
};
const FAQ = [
  ["현재 수준과 2년 뒤 목표는 어떻게 고르나요?", "최근 1년의 실제 행동을 떠올려 Lv.1~4 행동기준 중 가장 가까운 수준을 고르세요. 수준 카드를 누르면 그 수준의 행동기준 설명이 나타납니다. 목표는 2년 뒤 도달하려는 수준(1~4)이며, 계획이 없거나 정하지 못했다면 ‘수행 계획 없음’·‘미정’을 고를 수 있습니다."],
  ["‘기초 수행 전’, ‘역할 해당 없음’, ‘수행 기회 없음’은 어떻게 다른가요?", "‘기초 수행 전’은 역할과 기회가 있었으나 Lv.1(기초 수행)에 해당하는 행동을 아직 하지 않은 경우입니다. ‘역할 해당 없음’은 내 직무·보직에 이 행동이 포함되지 않는 경우, ‘수행 기회 없음’은 역할은 있으나 최근 1년 안에 그런 상황이 없었던 경우입니다. 세 가지 모두 수준(1~4)이 아니라 상태이며, 평균 계산에서 제외됩니다."],
  ["‘행동기준 확인’ 칸은 무엇인가요?", "상담일지, 결재 이력 같은 업무 기록에서 확인된 행동기준이 자동으로 표시되는 칸입니다. 교원이 따로 버튼을 누르거나 자료를 올릴 필요가 없습니다. 이 화면에서는 가상의 기록을 쓰며, 실제 운영에서는 학내 시스템과 연동합니다. 내가 고른 수준과 비교해 보는 참고 자료입니다."],
  ["제출한 뒤에 수정할 수 있나요?", "제출하면 수정할 수 없습니다. 평가자가 평가를 시작하기 전이면 ‘제출 취소’로 다시 수정할 수 있고, 그 이후에는 관리자에게 재개방을 요청하세요."],
  ["평가 결과에 동의하기 어려우면요?", "결과가 통보된 뒤 확정 전까지 ‘평가 결과’ 화면에서 문항별 이의제기를 할 수 있습니다. 평가자가 재검토한 뒤 결과와 이유를 알려 드립니다."],
  ["‘확인 보류’는 무엇인가요?", "평가자가 근거가 부족해 판단을 보류한 문항입니다. 보완 자료를 제출하면 평가자가 다시 판정합니다. 보류 문항이 남아 있으면 평가를 확정할 수 없습니다."],
  ["평가자는 제 자가진단 점수를 보고 평가하나요?", "아닙니다. 평가자는 평가 중에 교원이 남긴 사례와 기록으로 확인된 행동기준만 보고 판단하며, 통보 후에 자가진단과 대조됩니다."],
  ["입력한 내용은 어디에 저장되나요?", "이 목업은 입력 내용을 이 브라우저에 저장합니다. 다른 기기와 공유되지 않으며, 실제 파일럿에서는 서버에 저장할 계획입니다. 자세한 내용은 도움말의 ‘파일럿 안내’를 참고하세요."],
  ["비밀번호를 잊었거나 로그인이 안 돼요.", "관리자에게 비밀번호 초기화를 요청하세요. 관리자가 임시 비밀번호를 발급하며, 임시 비밀번호로 로그인하면 새 비밀번호를 바로 설정해야 합니다."],
  ["결과를 파일로 저장하려면요?", "자가진단 리포트·평가 결과 화면의 ‘인쇄 / PDF’ 버튼을 사용하세요."]
];

const el = id => document.getElementById(id);
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const idFor = () => crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2);
const ACTIONS = {}, FORMS = {};
/* 로그인 보류 스위치: true면 로그인 화면 없이 바로 메인 화면으로 들어가고, 헤더에서 보기(관리자/교수)를 바꿀 수 있다.
   로그인을 다시 쓰려면 false로 바꾸면 된다. */
const SKIP_LOGIN = true;
function localDate(d = new Date()) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
const fmtDT = iso => iso ? new Date(iso).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" }) : "—";

/* ---------- 저장소 ---------- */
const fresh = () => ({ answers: {}, reviews: {}, records: {}, appeals: {}, supplements: {}, interview: {}, priorities: [], supports: {}, submitted: false, submittedAt: "", notified: false, final: false });
/* 체험용 비밀번호 처리: 이 앱은 서버가 없어 진짜 보안이 아니다. (실제 운영은 서버 + 학교 계정 연동 필요) */
function cyrb53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) { const ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0");
}
function hashPw(pw, salt) { let h = salt + "|" + pw; for (let i = 0; i < 500; i++) h = cyrb53(h + salt, i); return h; }
function makePw(pw) { const salt = Math.random().toString(36).slice(2, 10); return { salt, hash: hashPw(pw, salt) }; }
const checkPw = (obj, pw) => Boolean(obj && obj.pw && obj.pw.hash === hashPw(pw, obj.pw.salt));
function tempPw() {
  const a = "abcdefghjkmnpqrstuvwxyz23456789", b = new Uint32Array(8); crypto.getRandomValues(b);
  return [...b].map(x => a[x % a.length]).join("").replace(/^(.{3})./, "$1" + "7");
}
/* 기록으로 행동기준 확인(목업): 문항·교원마다 고정된 가상 기록 수준(1~3)을 돌려준다. 실제로는 학내 시스템 기록에서 산출한다. */
const mockRecordLevel = (uid, q) => 1 + ((q.id + [...String(uid)].reduce((h, ch) => h + ch.charCodeAt(0), 0)) % 3);
function pullRecord(rec, uid, q) {
  const lv = mockRecordLevel(uid, q);
  rec.records[q.id] = { level: lv, signals: q.signals.slice(0, lv), at: new Date().toISOString() };
}
function demoRecord(uid, base, count, mode) {
  const rec = fresh(), tw = [0, 1, -1];
  questions.slice(0, count).forEach(q => {
    const cur = Math.max(1, Math.min(MAXLV, base + tw[(q.id + base) % 3]));
    rec.answers[q.id] = { current: String(cur), target: String(Math.min(MAXLV, cur + 1)), evidence: DEMO_EVIDENCE[q.id] || "" };
    if (mode !== "none") pullRecord(rec, uid, q);
  });
  if (count === questions.length) { rec.submitted = true; rec.submittedAt = new Date().toISOString(); rec.priorities = [2, 6]; rec.supports = { 2: "후속 점검 기록 양식 안내", 6: "실습 피드백 사례 공유 기회" }; }
  return rec;
}
const DEMO_EVIDENCE = { 1: "지도학생 6명과 학기별 정기상담 후 다음 행동과 시점을 합의했습니다.", 2: "미이행 학생 1명은 사유를 확인해 과제 범위를 조정하고 재점검했습니다.", 6: "중간 피드백을 반영해 실습 순서를 바꾸고 결과를 기록했습니다.", 9: "결재 업무는 마감 전에 처리하고 제출 이력을 남겼습니다." };
function seed() {
  const users = [
    { id: "u-sample", loginId: "prof01", name: "김교수", school: "방송영상스쿨", evaluator: false },
    { id: "u-p2", loginId: "prof02", name: "박지연", school: "게임스쿨", evaluator: false },
    { id: "u-p3", loginId: "prof03", name: "최도현", school: "게임스쿨", evaluator: false },
    { id: "u-p4", loginId: "prof04", name: "홍길동", school: "방송영상스쿨", evaluator: false },
    { id: "u-rater", loginId: "eval01", name: "이평가", school: "방송영상스쿨", evaluator: true }
  ].map(u => ({ ...u, pw: makePw("demo1234"), must: false }));
  const kim = demoRecord("u-sample", 2, questions.length, "pull");
  /* 평가자 확인: 기록이 있는 문항은 기록으로 확인된 행동기준을 따르고, 일부 문항은 자가진단과 다르게 판단한 것으로 시연 */
  questions.forEach(q => {
    const c = Number(kim.answers[q.id].current), rl = kim.records[q.id] ? kim.records[q.id].level : null;
    const lv = rl !== null ? Math.min(MAXLV, rl + (q.id % 3 === 0 ? 1 : 0)) : (q.id % 4 === 0 ? Math.max(1, c - 1) : c);
    kim.reviews[q.id] = { level: String(lv), reason: lv < c ? "기록에서 점검·재적용 근거가 확인되지 않아 한 수준 낮게 판단했습니다." : lv > c ? "연결된 기록에서 상위 수준의 행동기준이 확인되어 높게 판단했습니다." : "제시한 사례와 연결된 기록으로 확인했습니다." };
  });
  kim.notified = true;
  const people = [
    { uid: "u-sample", rater: "u-rater", record: kim },
    { uid: "u-p2", rater: "u-rater", record: demoRecord("u-p2", 3, questions.length, "pull") },
    { uid: "u-p3", rater: "u-rater", record: demoRecord("u-p3", 2, 6, "pull") },
    { uid: "u-p4", rater: "", record: fresh() },
    { uid: "u-rater", rater: "", record: fresh() }
  ];
  return {
    v: 6, round: "pilot", log: [],
    admin: { loginId: "admin", pw: makePw("admin1234"), must: false },
    users,
    rounds: [{ id: "pilot", name: "2027 전임교원 역량진단 시범 (목업)", close: "2027-06-30", closed: false, people }]
  };
}
function normalize(s) {
  s.log = Array.isArray(s.log) ? s.log : [];
  if (!s.admin || !s.admin.pw) s.admin = { loginId: "admin", pw: makePw("admin1234"), must: false };
  const used = new Set(s.users.map(u => u.loginId).filter(Boolean)); let n = 1;
  s.users.forEach(u => {
    if (!u.loginId) { while (used.has("user" + n)) n++; u.loginId = "user" + n; used.add(u.loginId); }
    if (!u.pw) { u.pw = makePw("demo1234"); u.must = false; }
    u.must = Boolean(u.must);
  });
  s.rounds.forEach(r => {
    r.people = Array.isArray(r.people) ? r.people : [];
    r.people.forEach(p => { p.rater = p.rater || ""; p.record = { ...fresh(), ...p.record, interview: { ...(p.record && p.record.interview) } }; });
  });
  if (!s.rounds.some(r => r.id === s.round)) s.round = s.rounds[0].id;
  return s;
}
let store = null;
function loadStore() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch { return store || seed(); }
  if (raw) { try { const s = JSON.parse(raw); if (s && s.v === 6 && Array.isArray(s.rounds) && s.rounds.length && Array.isArray(s.users)) return normalize(s); } catch { } }
  return store || seed();
}
function saveStore() { try { localStorage.setItem(KEY, JSON.stringify(store)); return true; } catch { return false; } }
store = loadStore();
saveStore();

/* 항상 최신 저장본을 읽어 수정한 뒤 저장한다 (여러 탭에서 쓸 때 덮어쓰기 방지). */
function mutate(fn, after = true) {
  store = loadStore();
  const out = fn();
  if (!saveStore()) say("브라우저 저장을 사용할 수 없습니다. 이 탭을 닫으면 입력이 사라집니다.");
  if (after) render();
  return out;
}

/* ---------- 세션(역할) ---------- */
let session = null;
function readSession() {
  let s = null; try { s = JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch { }
  if (s && s.role === "admin") return { role: "admin" };
  if (s && s.role === "user" && store.users.some(u => u.id === s.uid)) return { role: "user", uid: s.uid };
  return null;
}
function setSession(s) { session = s; try { s ? sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)) : sessionStorage.removeItem(SESSION_KEY); } catch { } }
session = readSession();

/* ---------- 조회 도우미 ---------- */
const round = () => store.rounds.find(r => r.id === store.round) || store.rounds[0];
const userOf = id => store.users.find(u => u.id === id);
const nameOf = id => (userOf(id) || {}).name || "미배정";
const entryOf = (uid, r = round()) => r.people.find(p => p.uid === uid);
const recOf = uid => (entryOf(uid) || {}).record || fresh();
const me = () => session && session.role === "user" ? userOf(session.uid) : null;
const isAdmin = () => Boolean(session && session.role === "admin");
const account = () => isAdmin() ? store.admin : me();
const actor = () => isAdmin() ? "관리자" : (me() || {}).name || "?";
const isClosed = r => Boolean(r.closed || (r.close && localDate() > r.close));
function logAct(action, uid) {
  store.log.push({ t: new Date().toISOString(), who: actor(), action, uid: uid || "", target: uid ? nameOf(uid) : "", round: round().name });
  if (store.log.length > 1000) store.log.splice(0, store.log.length - 1000);
}
function dday(s) {
  const d = Math.round((new Date(s + "T00:00:00") - new Date(localDate() + "T00:00:00")) / 864e5);
  return { days: d, text: d === 0 ? "D-day" : d > 0 ? "D-" + d : "D+" + (-d), cls: d < 0 ? "late" : d <= 3 ? "warn" : "" };
}

/* ---------- 응답·평가 상태 ---------- */
const display = v => special[v] || (labels[Number(v) - 1] && v ? "Lv." + v : "—");
const answerOf = (rec, q) => rec.answers[q.id] || {};
const doneSelf = (rec, q) => { const a = answerOf(rec, q); return Boolean(a.current && a.target); };
const reviewDone = (rec, q) => { const r = rec.reviews[q.id] || {}; return Boolean(r.level && (r.reason || "").trim()); };
const countSelf = rec => questions.filter(q => doneSelf(rec, q)).length;
const countReview = rec => questions.filter(q => reviewDone(rec, q)).length;
const resultOf = (rec, id) => { const ap = rec.appeals[id], rv = rec.reviews[id] || {}; return ap && ap.resolved ? { level: ap.level, reason: ap.decision } : rv; };
const hasHold = rec => questions.some(q => resultOf(rec, q.id).level === "hold");
const openAppeals = rec => Object.values(rec.appeals).filter(a => !a.resolved).length;
function statusOf(r) {
  if (r.final) return "확정";
  if (openAppeals(r)) return "재검토 중";
  if (r.notified) return hasHold(r) ? "보완 대기" : "통보 완료";
  if (Object.keys(r.reviews).length) return "평가 중";
  return r.submitted ? "제출 완료" : "미제출";
}
const STATUS_ORDER = ["미제출", "제출 완료", "평가 중", "통보 완료", "보완 대기", "재검토 중", "확정"];
const STATUS_COLOR = { "미제출": "#c9d3de", "제출 완료": "#9db7cc", "평가 중": "#6f95b4", "통보 완료": "#345676", "보완 대기": "#d9a05b", "재검토 중": "#b5651d", "확정": "#2f7a63" };

/* 역할(role: user|rater)별 다음 할 일 */
function nextAction(e, role) {
  const r = e.record, closed = isClosed(round()), u = role === "user";
  if (!r.submitted) return u ? (closed ? { label: "응답이 마감되었습니다. 관리자에게 문의하세요." } : { label: `자가진단 작성 (${countSelf(r)}/${questions.length})`, go: "self", btn: "자가진단 하기" }) : { label: "교원 자가진단 제출 대기" };
  if (!e.rater) return { label: "평가자 배정 대기 (관리자)" };
  if (!r.notified) return u ? { label: "평가자가 평가 중입니다" } : { label: `평가 작성 (${countReview(r)}/${questions.length})`, go: "review/" + e.uid, btn: "평가하기" };
  if (!r.final) {
    const open = openAppeals(r), hold = hasHold(r);
    return u ? { label: hold ? "확인 보류 문항의 보완 자료 제출" : "결과 확인 · 이의제기 (확정 전)", go: "result", btn: "결과 보기" }
      : { label: open ? `이의제기 ${open}건 재검토` : hold ? "보류 문항 재판정" : "평가 확정 처리", go: "review/" + e.uid, btn: open ? "재검토하기" : "확정하기" };
  }
  if (!r.interview.saved) return u ? { label: "성장 면담 기록 대기", go: "result", btn: "결과 보기" } : { label: "성장 면담 기록 작성", go: "review/" + e.uid, btn: "면담 기록" };
  return { label: "완료" };
}

/* ---------- 영역별 평균 ---------- */
function levelOf(rec, q, which) {
  const a = rec.answers[q.id] || {};
  const v = which === "current" ? a.current : which === "target" ? a.target : resultOf(rec, q.id).level;
  return numbers.includes(v) ? Number(v) : null;
}
function domainAvg(rec, d, which) {
  const v = questions.filter(q => q.domain === d).map(q => levelOf(rec, q, which)).filter(x => x !== null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}
const fmt = v => v === null || v === undefined ? "—" : (Math.round(v * 10) / 10).toFixed(1);

/* ---------- UI 빌더 ---------- */
function say(s) { const t = el("toast"); if (!t) return; t.textContent = s; clearTimeout(say.t); say.t = setTimeout(() => { t.textContent = ""; }, 3600); }
function options(values, value) { return '<option value="">선택</option>' + values.map(v => `<option value="${v}"${v === value ? " selected" : ""}>${esc(display(v))}</option>`).join(""); }
const select = (label, values, value, data, disabled = false) => `<label>${label}<select ${data}${disabled ? " disabled" : ""}>${options(values, value)}</select></label>`;
const field = (label, value, data, disabled = false) => `<label class="block">${label}<textarea ${data}${disabled ? " disabled" : ""}>${esc(value)}</textarea></label>`;
function hero(title, detail, metric, total) {
  const pct = total ? Math.round(metric / total * 100) : 0;
  return `<section class="hero"><div><h1>${title}</h1><p>${detail || ""}</p></div>${total ? `<div class="count"><div class="ring" id="count-ring" style="--p:${pct}"><b id="count-n">${metric} / ${total}</b></div><span>완료<br>문항</span></div>` : ""}</section>`;
}
function table(head, rows) {
  const body = rows.map(r => `<tr>${r.map((v, i) => `<td data-label="${esc(String(head[i]).replace(/<[^>]*>/g, ""))}">${v}</td>`).join("")}</tr>`).join("");
  return `<div class="scroll"><table class="report-table stack"><thead><tr>${head.map(v => `<th scope="col">${v}</th>`).join("")}</tr></thead><tbody>${body || `<tr><td colspan="${head.length}" class="muted">표시할 내용이 없습니다.</td></tr>`}</tbody></table></div>`;
}
const pill = (t, cls = "") => `<span class="pill ${cls}">${esc(t)}</span>`;
const statusPill = s => pill(s, s === "확정" ? "ok" : s === "미제출" ? "" : s === "보완 대기" || s === "재검토 중" ? "warn" : "info");
const kpi = (n, t, sub = "") => `<div class="kpi"><div class="n">${n}</div><div class="t">${t}</div>${sub ? `<div class="s">${sub}</div>` : ""}</div>`;
const banner = (t, cls = "") => `<div class="banner ${cls}" role="status">${t}</div>`;
function stacked(parts) {
  const total = parts.reduce((a, p) => a + p.n, 0) || 1;
  return `<div class="stack-bar" role="img" aria-label="${esc(parts.map(p => p.label + " " + p.n + "명").join(", "))}">${parts.filter(p => p.n).map(p => `<i style="width:${p.n / total * 100}%;background:${p.color}"></i>`).join("")}</div><ul class="legend">${parts.map(p => `<li><span class="sw" style="background:${p.color}"></span>${esc(p.label)} <b>${p.n}</b></li>`).join("")}</ul>`;
}

/* 레이더 차트 (1~5 평균, 영역별) */
function radar(series) {
  const cx = 190, cy = 160, R = 105, n = domains.length;
  const pt = (i, v) => { const a = (-90 + i * 360 / n) * Math.PI / 180, r = R * v / MAXLV; return [(cx + r * Math.cos(a)).toFixed(1), (cy + r * Math.sin(a)).toFixed(1)]; };
  let g = "";
  for (let k = 1; k <= MAXLV; k++) g += `<polygon points="${domains.map((_, i) => pt(i, k).join(",")).join(" ")}" fill="none" stroke="#dfe6ed"/>`;
  g += domains.map((_, i) => { const p = pt(i, MAXLV); return `<line x1="${cx}" y1="${cy}" x2="${p[0]}" y2="${p[1]}" stroke="#e5eaf0"/>`; }).join("");
  g += numbers.map(Number).map(k => { const p = pt(0, k); return `<text x="${+p[0] + 4}" y="${+p[1] + 3}" font-size="9" fill="#596b7d">${k}</text>`; }).join("");
  series.forEach(s => {
    g += `<polygon points="${s.vals.map((v, i) => pt(i, v || 0).join(",")).join(" ")}" fill="${s.color}" fill-opacity=".07" stroke="${s.color}" stroke-width="2" ${s.dash ? `stroke-dasharray="${s.dash}"` : ""}/>`;
    g += s.vals.map((v, i) => v === null ? "" : `<circle cx="${pt(i, v)[0]}" cy="${pt(i, v)[1]}" r="3.5" fill="${s.color}"/>`).join("");
  });
  g += domains.map((d, i) => { const p = pt(i, MAXLV + 1.1); const x = +p[0]; return `<text x="${x}" y="${+p[1] + 4}" text-anchor="${x < cx - 6 ? "end" : x > cx + 6 ? "start" : "middle"}" font-size="12" font-weight="700" fill="#263447">${esc(d)}</text>`; }).join("");
  const alt = "영역별 평균 수준(1~4): " + domains.map((d, i) => d + " " + series.map(s => s.name + " " + fmt(s.vals[i])).join(", ")).join(" / ");
  return `<svg class="radar" viewBox="0 0 380 320" role="img" aria-label="${esc(alt)}">${g}</svg><ul class="legend">${series.map(s => `<li><svg width="26" height="10" aria-hidden="true"><line x1="0" y1="5" x2="26" y2="5" stroke="${s.color}" stroke-width="2.5" ${s.dash ? `stroke-dasharray="${s.dash}"` : ""}/></svg>${esc(s.name)}</li>`).join("")}</ul>`;
}

/* ---------- 확인 창 ---------- */
function ask({ title, body = "", ok = "확인", danger = false, input = "", cancel = true }) {
  return new Promise(resolve => {
    const d = el("dlg");
    if (typeof d.showModal !== "function") {
      if (input) { const v = prompt(title + "\n" + input); resolve(v && v.trim() ? { value: v.trim() } : null); } else resolve(confirm(title + (body ? "\n" + body : "")) ? { value: "" } : null);
      return;
    }
    d.innerHTML = `<form method="dialog"><h2>${esc(title)}</h2>${body ? `<p>${esc(body)}</p>` : ""}${input ? `<label class="block">${esc(input)}<textarea name="v" required rows="3"></textarea></label>` : ""}<div class="actions">${cancel ? '<button type="submit" value="cancel" class="quiet" formnovalidate>취소</button>' : ""}<button type="submit" value="ok" class="${danger ? "danger" : "primary"}">${esc(ok)}</button></div></form>`;
    d.returnValue = "";
    const done = () => { d.removeEventListener("close", done); resolve(d.returnValue === "ok" ? { value: ((d.querySelector("textarea") || {}).value || "").trim() } : null); };
    d.addEventListener("close", done);
    d.showModal();
    (d.querySelector("textarea") || d.querySelector(".primary,.danger")).focus();
  });
}

/* ---------- 파일 내려받기 ---------- */
function download(name, text, mime) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: mime || "text/plain;charset=utf-8" }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const csvCell = v => '"' + String(v ?? "").replace(/"/g, '""') + '"';

/* ---------- 화면 상태 ---------- */
const ui = { dom: 0, report: false, form: false, gates: [], count: null, filter: { status: "", school: "" }, logLimit: 50 };
function refreshGates() {
  ui.gates.forEach(g => document.querySelectorAll(g.sel).forEach(b => { b.disabled = !g.ok(); }));
  if (ui.count) {
    const n = ui.count(), t = questions.length, a = el("count-n"), p = el("count-p"), rg = el("count-ring"), ab = el("ab-n");
    if (a) a.textContent = n + " / " + t; if (p) p.value = n; if (ab) ab.textContent = n + "/" + t + " 완료";
    if (rg) rg.style.setProperty("--p", Math.round(n / t * 100));
  }
}
