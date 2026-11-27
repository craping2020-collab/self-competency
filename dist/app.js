"use strict";
/* 라우터 · 셸(메뉴·헤더) · 이벤트 연결 */
/* 메뉴는 4개: 자가진단 / 진단결과 / 도움말 / 운영자기능. 세부 화면은 각 메뉴 안의 탭으로 둔다. */
const OPS = ["home", "progress", "agreement", "members", "rounds", "data", "person"], USER_ROUTES = ["self", "result", "raters", "review"];
const ROUTES = {
  admin: {
    home: ["운영 홈", adminHome], progress: ["진행 현황", progressPage], agreement: ["측정 일치도", agreementPage], members: ["구성원", membersPage], rounds: ["회차 관리", roundsPage], data: ["데이터·기록", dataPage],
    person: ["대상자 상세", personPage], pilot: ["파일럿 안내", pilotPage], faq: ["자주 묻는 질문", faqPage], password: ["비밀번호 변경", pwPage]
  },
  user: {
    self: ["자가진단", selfPage], result: ["진단결과", resultPage], raters: ["평가 대상자", ratersPage, true], review: ["평가하기", reviewPage, true],
    pilot: ["파일럿 안내", pilotPage], faq: ["자주 묻는 질문", faqPage], password: ["비밀번호 변경", pwPage]
  }
};
const NAV4 = [["self", "자가진단", "현재 수준과 목표 입력", "self"], ["result", "진단결과", "결과·이의제기·면담", "result"], ["faq", "도움말", "질문 · 파일럿 안내", "faq"], ["home", "운영자기능", "회차·구성원·진행 현황", "ops"]];
const sectionOf = n => OPS.includes(n) ? "home" : ["result", "raters", "review"].includes(n) ? "result" : ["faq", "pilot"].includes(n) ? "faq" : n;
const route = () => { const [name = "home", arg = ""] = location.hash.replace(/^#\/?/, "").split("/"); return { name: name || "home", arg: decodeURIComponent(arg) }; };
const go = r => { if (location.hash === "#/" + r) { resetUi(); render(); } else location.hash = "#/" + r; };
const ICONS = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  self: "M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1zM8 6H6a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-2M9 14l2 2 4-4",
  result: "M5 21V11M12 21V4M19 21v-8",
  pilot: "M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3",
  faq: "M12 17h.01M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z",
  raters: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM17 11l2 2 4-4",
  ops: "M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1",
  progress: "M3 12h4l3 8 4-16 3 8h4",
  agreement: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
  members: "M17 21v-2a4 4 0 0 0-3-3.87M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M16 3.1a4 4 0 0 1 0 7.8",
  rounds: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  data: "M12 8c4.4 0 8-1.3 8-3s-3.6-3-8-3-8 1.3-8 3 3.6 3 8 3zM4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"
};
const icon = k => `<span class="ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="${ICONS[k] || ICONS.home}"/></svg></span>`;
function resetUi() { ui.dom = 0; ui.report = false; ui.form = false; ui.openQ = null; ui.fresh = null; }
let facultyViewId;
const homeRoute = () => isAdmin() ? "home" : "self";
const viewFaculty = () => userOf(facultyViewId) || store.users.filter(u => { const e = !u.evaluator && entryOf(u.id); return e && !e.record.submitted; }).sort((x, y) => countSelf(recOf(x.id)) - countSelf(recOf(y.id)))[0] || store.users.find(u => !u.evaluator) || store.users[0];

function loginPage() {
  const admin = ui.loginMode === "admin";
  const demo = [];
  if (checkPw(store.admin, "admin1234")) demo.push(`관리자 <code>${esc(store.admin.loginId)}</code> / <code>admin1234</code>`);
  store.users.filter(u => checkPw(u, "demo1234")).slice(0, 4).forEach(u => demo.push(`${esc(u.name)}${u.evaluator ? "(평가자)" : ""} <code>${esc(u.loginId)}</code> / <code>demo1234</code>`));
  return `<div class="entry-wrap narrow"><div class="brand"><span class="mark">청</span><div><b>청강 교원 역량진단</b><small>전임교원 · 운영안 v5</small></div></div>` +
    `<section class="card login-card"><h1>${admin ? "관리자 로그인" : "로그인"}</h1><p class="muted">${admin ? "회차·구성원·평가자 배정과 진행 현황을 관리합니다." : "ID와 비밀번호를 입력하세요. 평가자로 지정된 교수는 같은 계정으로 평가 메뉴도 함께 열립니다."}</p>` +
    `<form data-form="login" data-mode="${admin ? "admin" : "user"}" autocomplete="on"><label class="block">${admin ? "관리자 ID" : "ID (사번)"}<input id="login-id" name="id" autocomplete="username" required maxlength="40"></label><label class="block">비밀번호<input name="pw" type="password" autocomplete="current-password" required maxlength="100"></label><p id="login-msg" class="login-msg" role="alert" hidden></p><div class="actions"><button class="primary wide">로그인</button></div></form>` +
    `<div class="login-alt">${admin ? '<button class="linkish" data-act="login-mode" data-mode="user">← 전임교수 로그인으로</button>' : '<button class="linkish" data-act="login-mode" data-mode="admin">관리자 로그인</button>'}</div></section>` +
    (demo.length ? `<details class="demo-accounts"><summary>체험용 계정 안내</summary><ul>${demo.map(d => `<li>${d}</li>`).join("")}</ul><p class="muted small">비밀번호를 바꾸면 이 안내에서 사라집니다.</p></details>` : "") +
    `<p class="muted small">체험 버전입니다. 계정과 입력 내용은 이 브라우저에만 저장되며 실제 보안 로그인이 아닙니다.</p></div>`;
}

function render() {
  store = loadStore(); session = readSession();
  if (!session && SKIP_LOGIN) {
    const faculty = viewFaculty();
    setSession(faculty ? { role: "user", uid: faculty.id } : { role: "admin" });
  }
  if (session?.role === "user") facultyViewId = session.uid;
  ui.gates = []; ui.count = null;
  const shell = el("shell"), content = el("content");
  const va = el("viewas");
  va.hidden = !(SKIP_LOGIN && session);
  if (!va.hidden) {
    va.innerHTML = `<option value="faculty" ${store.users.length ? "" : "disabled"}>전임교원 보기</option><option value="admin">관리자 보기</option>`;
    va.value = session.role === "admin" ? "admin" : "faculty";
  }
  el("who").hidden = SKIP_LOGIN;
  el("switch").classList.toggle("gone", SKIP_LOGIN);
  if (!session) {
    shell.classList.add("entry"); shell.classList.remove("locked"); closeMenu(true);
    el("nav").innerHTML = ""; el("crumb").textContent = "로그인"; el("who").textContent = ""; el("switch").hidden = true; el("pwbtn").hidden = true; el("menu").hidden = true;
    document.title = "로그인 · 청강 교원 역량진단";
    content.innerHTML = loginPage(); const f = el("login-id"); if (f) f.focus(); return;
  }
  shell.classList.remove("entry"); el("switch").hidden = SKIP_LOGIN; el("pwbtn").hidden = SKIP_LOGIN;
  const kind = session.role === "admin" ? "admin" : "user", u = me();
  el("who").textContent = kind === "admin" ? "관리자" : "전임교원";
  if (account().must && !SKIP_LOGIN) {
    shell.classList.add("locked"); el("menu").hidden = true; el("pwbtn").hidden = true; closeMenu(true);
    el("nav").innerHTML = ""; el("crumb").textContent = "비밀번호 설정"; content.innerHTML = pwPage(); return;
  }
  shell.classList.remove("locked"); el("menu").hidden = false;
  const HOME = kind === "admin" ? "home" : "self";
  let { name, arg } = route();
  if (!location.hash || location.hash === "#" || location.hash === "#/" || (kind === "user" && name === "home" && !SKIP_LOGIN)) name = HOME;
  /* 로그인 보류(목업) 중에는 메뉴를 눌러 교원 ↔ 운영자 보기를 오갈 수 있다 */
  if (SKIP_LOGIN && kind === "admin" && USER_ROUTES.includes(name)) { const f = viewFaculty(); if (f) { setSession({ role: "user", uid: f.id }); return render(); } }
  if (SKIP_LOGIN && kind === "user" && OPS.includes(name)) { setSession({ role: "admin" }); return render(); }
  let def = ROUTES[kind][name];
  if (!def || (SKIP_LOGIN && name === "password") || (def[2] === true && !(u && u.evaluator))) { name = HOME; arg = ""; def = ROUTES[kind][HOME]; if (location.hash && location.hash !== "#/" + HOME) history.replaceState(null, "", "#/" + HOME); }
  const sec = NAV4.find(n => n[0] === sectionOf(name)), active = sec ? sec[0] : "";
  const items = NAV4.filter(([k]) => SKIP_LOGIN || (kind === "admin" ? k !== "self" && k !== "result" : k !== "home"));
  el("who-label").textContent = kind === "admin" ? "관리자 워크스페이스" : "전임교원";
  const crumb = !sec || def[0] === sec[1] ? def[0] : sec[1] + " · " + def[0];
  el("crumb").textContent = crumb;
  el("nav").innerHTML = items.map(([k, label, sub, ic]) => `<button data-go="${k}" class="nav ${k === active ? "active" : ""}" ${k === active ? 'aria-current="page"' : ""}>${icon(ic)}<span class="lbl">${label}${sub ? `<small>${sub}</small>` : ""}</span></button>`).join("");
  document.title = crumb + " · 청강 교원 역량진단";
  content.innerHTML = (kind === "admin" && OPS.includes(name) ? opsTabs(name) : "") + def[1](arg);
  refreshGates();
}

/* ---------- 모바일 메뉴 ---------- */
const mq = window.matchMedia("(max-width: 860px)");
function closeMenu(silent) {
  const side = el("side"); side.classList.remove("open"); el("scrim").hidden = true; el("menu").setAttribute("aria-expanded", "false");
  if (mq.matches) side.setAttribute("inert", ""); else side.removeAttribute("inert");
  if (!silent && mq.matches) el("menu").focus();
}
function openMenu() { const side = el("side"); side.removeAttribute("inert"); side.classList.add("open"); el("scrim").hidden = false; el("menu").setAttribute("aria-expanded", "true"); const b = side.querySelector("button"); if (b) b.focus(); }
mq.addEventListener("change", () => closeMenu(true));
document.addEventListener("keydown", e => { if (e.key === "Escape" && el("side").classList.contains("open")) { e.preventDefault(); closeMenu(); } });
el("menu").addEventListener("click", () => el("side").classList.contains("open") ? closeMenu() : openMenu());
el("scrim").addEventListener("click", () => closeMenu());

/* ---------- 로그인 · 로그아웃 ---------- */
let loginFail = { n: 0, until: 0 };
Object.assign(ACTIONS, {
  "login-mode"(t) { ui.loginMode = t.dataset.mode; render(); },
  logout() { setSession(null); ui.loginMode = "user"; history.replaceState(null, "", location.pathname); resetUi(); render(); window.scrollTo(0, 0); }
});
FORMS.login = (f, v) => {
  const admin = f.dataset.mode === "admin", id = String(v.get("id") || "").trim().toLowerCase(), pw = String(v.get("pw") || "");
  const wait = Math.ceil((loginFail.until - Date.now()) / 1000);
  if (wait > 0) { loginMsg(`로그인 시도가 너무 많습니다. ${wait}초 뒤에 다시 시도하세요.`); return; }
  const acc = admin ? (store.admin.loginId.toLowerCase() === id ? store.admin : null) : store.users.find(u => u.loginId.toLowerCase() === id);
  if (!acc || !checkPw(acc, pw)) {
    loginFail.n++; if (loginFail.n >= 5) { loginFail = { n: 0, until: Date.now() + 30000 }; loginMsg("5회 연속 실패했습니다. 30초 뒤에 다시 시도하세요."); return; }
    loginMsg("ID 또는 비밀번호가 올바르지 않습니다."); return;
  }
  loginFail = { n: 0, until: 0 };
  setSession(admin ? { role: "admin" } : { role: "user", uid: acc.id });
  mutate(() => logAct("로그인"), false);
  location.hash = "#/" + homeRoute(); resetUi(); render();
};
function loginMsg(t) { const m = el("login-msg"); if (m) { m.textContent = t; m.hidden = false; } const p = $pw(); if (p) { p.value = ""; p.focus(); } }
const $pw = () => document.querySelector('#content input[name="pw"]');

/* 비밀번호 변경 (최초 로그인·초기화 직후에는 필수) */
const validPw = p => p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);
function pwPage() {
  const forced = account().must;
  return `<div class="${forced ? "entry-wrap narrow" : ""}">${hero("비밀번호 변경", forced ? "임시 비밀번호로 로그인했습니다. 새 비밀번호를 설정해야 계속할 수 있습니다." : "새 비밀번호를 설정합니다.")}<section class="card"><form data-form="pw"><label class="block">현재 비밀번호<input type="password" name="cur" autocomplete="current-password" required></label><label class="block">새 비밀번호 <span class="muted small">(8자 이상, 영문+숫자)</span><input type="password" name="next" autocomplete="new-password" required></label><label class="block">새 비밀번호 확인<input type="password" name="again" autocomplete="new-password" required></label><div class="actions"><button class="primary">변경</button>${forced ? '<button type="button" class="quiet" data-act="logout">로그아웃</button>' : ""}</div></form></section></div>`;
}
FORMS.pw = (f, v) => {
  const acc = account(), cur = String(v.get("cur")), next = String(v.get("next")), again = String(v.get("again"));
  if (!checkPw(acc, cur)) { say("현재 비밀번호가 맞지 않습니다."); return; }
  if (!validPw(next)) { say("새 비밀번호는 8자 이상이며 영문과 숫자를 모두 포함해야 합니다."); return; }
  if (next !== again) { say("새 비밀번호 확인이 일치하지 않습니다."); return; }
  if (next === cur) { say("현재와 다른 비밀번호를 입력하세요."); return; }
  mutate(() => { const a = account(); a.pw = makePw(next); a.must = false; logAct("비밀번호 변경"); }, false);
  say("비밀번호를 변경했습니다."); go(homeRoute());
};

/* ---------- 이벤트 ---------- */
document.addEventListener("click", async ev => {
  const t = ev.target.closest("[data-go],[data-act],[data-domain]"); if (!t || t.disabled) return;
  if (el("side").contains(t) && mq.matches) closeMenu(true);
  if (t.dataset.go !== undefined) { go(t.dataset.go); return; }
  if (t.dataset.domain !== undefined) { ui.dom = Number(t.dataset.domain); ui.openQ = null; render(); window.scrollTo(0, 0); return; }
  const fn = ACTIONS[t.dataset.act]; if (fn) await fn(t);
});
document.addEventListener("submit", ev => {
  const f = ev.target.closest("form[data-form]"); if (!f) return;
  ev.preventDefault();
  const fn = FORMS[f.dataset.form]; if (fn) fn(f, new FormData(f));
});
window.addEventListener("hashchange", () => { resetUi(); render(); window.scrollTo(0, 0); const c = el("content"); if (c) c.focus({ preventScroll: true }); });
window.addEventListener("storage", e => {
  if (e.key !== KEY) return;
  const a = document.activeElement;
  if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && el("content").contains(a)) return;
  render();
});

/* 이름 검색: 한글 조합(IME) 중에는 화면을 다시 그리지 않고, 조합이 끝나면 반영한다 */
function applySearch(t) {
  if (t.dataset.q === "progress") ui.filter.q = t.value; else if (t.dataset.q === "assign") ui.assignQ = t.value; else ui.memberQ = t.value;
  const pos = t.selectionStart; render();
  const n = document.querySelector('[data-q="' + t.dataset.q + '"]'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch { } }
}
document.addEventListener("compositionend", ev => { if (ev.target.dataset && ev.target.dataset.q !== undefined) applySearch(ev.target); });

/* 입력 자동 저장 (모든 쓰기는 권한·상태를 다시 확인한다) */
document.addEventListener("input", ev => {
  const t = ev.target, d = t.dataset, isSelect = t.tagName === "SELECT";
  if (d.q !== undefined) { if (!ev.isComposing) applySearch(t); return; }
  const val = t.type === "checkbox" ? t.checked : t.value;
  let handled = false, rerender = isSelect || t.type === "radio";
  if (d.a !== undefined) {
    handled = true; ui.openQ = Number(d.a);
    if (t.type === "radio") ui.fresh = { q: Number(d.a), f: d.f };
    mutate(() => {
      const e = session && session.role === "user" ? entryOf(session.uid) : null;
      if (!e || e.record.submitted || isClosed(round())) return;
      const a = e.record.answers[d.a] = e.record.answers[d.a] || {};
      a[d.f] = val;
      const qq = questions.find(x => x.id === Number(d.a)); if (qq && !e.record.records[qq.id]) pullRecord(e.record, e.uid, qq);
    }, false);
  } else if (d.rv !== undefined) {
    handled = true;
    mutate(() => { const e = asRater(d.uid); if (!e || !e.record.submitted || e.record.notified) return; const r = e.record.reviews[d.rv] = e.record.reviews[d.rv] || {}; r[d.f] = val; }, false);
  } else if (d.iv !== undefined) {
    handled = true; rerender = false;
    mutate(() => { const e = asRater(d.uid); if (!e || !e.record.notified) return; e.record.interview[d.iv] = val; e.record.interview.saved = false; }, false);
  } else if (d.support !== undefined) {
    handled = true; rerender = false;
    mutate(() => { const e = session && session.role === "user" ? entryOf(session.uid) : null; if (e) { e.record.supports = e.record.supports || {}; e.record.supports[d.support] = val; } }, false);
    const mk = document.querySelector(`[data-saved="${d.support}"]`);
    if (mk) { mk.textContent = "✓ 저장됨"; mk.classList.add("on"); clearTimeout(mk._t); mk._t = setTimeout(() => mk.classList.remove("on"), 1600); }
  } else if (d.priority !== undefined) {
    handled = true; rerender = false;
    const id = Number(d.priority);
    const res = mutate(() => {
      const e = session && session.role === "user" ? entryOf(session.uid) : null; if (!e) return "";
      const p = e.record.priorities;
      if (t.checked && p.length >= 2 && !p.includes(id)) return "limit";
      e.record.priorities = t.checked ? [...new Set([...p, id])] : p.filter(x => x !== id); return "ok";
    }, false);
    if (res === "limit") { t.checked = false; say("두 개까지 선택할 수 있습니다."); }
    else {
      const si = document.querySelector(`[data-support="${id}"]`);
      if (si) { si.disabled = !t.checked; si.placeholder = t.checked ? "예: 연수, 자료, 동료 멘토링" : "개발 우선을 체크하면 입력"; if (t.checked) si.focus(); }
    }
  }
  if (!handled) return;
  if (rerender) {
    render();
    const sel = t.type === "radio" ? `input[data-a="${d.a}"][data-f="${d.f}"][value="${t.value}"]` : d.a !== undefined ? `select[data-a="${d.a}"][data-f="${d.f}"]` : `select[data-rv="${d.rv}"][data-f="${d.f}"]`;
    const n = document.querySelector(sel); if (n) n.focus({ preventScroll: true });
  } else refreshGates();
});

/* 관리자 변경 입력 */
document.addEventListener("change", async ev => {
  const t = ev.target, d = t.dataset;
  if (t.id === "viewas" || t.id === "faculty-view") {
    const faculty = t.id === "faculty-view" ? userOf(t.value) : viewFaculty();
    setSession(t.id === "viewas" && t.value === "admin" || !faculty ? { role: "admin" } : { role: "user", uid: faculty.id });
    location.hash = "#/" + homeRoute(); resetUi(); render(); window.scrollTo(0, 0); return;
  }
  if (d.upload !== undefined && t.type === "file") {
    const id = Number(d.upload), picked = [...t.files].map(f => ({ name: f.name, size: f.size }));
    if (picked.length) {
      mutate(() => { const e = session && session.role === "user" ? entryOf(session.uid) : null; if (!e || e.record.submitted || isClosed(round())) return; const an = e.record.answers[id] = e.record.answers[id] || {}; an.files = [...(an.files || []), ...picked]; });
      ui.openQ = id; render(); say(`${picked.length}개 파일을 추가했습니다. 자동 저장되었습니다.`);
    }
    t.value = ""; return;
  }
  /* 판정 이유를 다 쓰고 입력창을 벗어나면 다음 문항 카드를 연다 (입력 중에는 화면을 다시 그리지 않는다) */
  if (d.rv !== undefined && t.tagName === "TEXTAREA") {
    const want = visibleQuestions(q => reviewDone(recOf(d.uid), q)).length;
    if (want !== document.querySelectorAll("#content article.card").length) render();
    return;
  }
  if (d.asg !== undefined && isAdmin()) {
    if (t.checked) (ui.assignSel = ui.assignSel || new Set()).add(d.asg); else if (ui.assignSel) ui.assignSel.delete(d.asg);
    const b = document.querySelector('[data-act="assign-save"]'); if (b) b.textContent = "저장 (" + ui.assignSel.size + "명)";
    return;
  }
  if (d.filter) { ui.filter[d.filter] = t.value; render(); const n = document.querySelector(`[data-filter="${d.filter}"]`); if (n) n.focus(); return; }
  if (d.assign !== undefined && isAdmin()) {
    const uid = d.assign, rater = t.value;
    const ok = mutate(() => { const e = entryOf(uid); if (!e || e.record.notified || rater === uid) return false; if (rater && !(userOf(rater) || {}).evaluator) return false; e.rater = rater; logAct(rater ? `평가자 배정: ${nameOf(rater)}` : "평가자 배정 해제", uid); return true; });
    if (!ok) say("평가자를 바꿀 수 없는 상태입니다."); return;
  }
  if (d.evaluator !== undefined && isAdmin()) {
    const id = d.evaluator, on = t.checked;
    const used = store.rounds.reduce((n, r) => n + r.people.filter(p => p.rater === id).length, 0);
    if (!on && used) { t.checked = true; say(`담당 교수 ${used}명이 배정되어 있어 평가자 권한을 해제할 수 없습니다. 먼저 ‘담당 교수 지정’에서 해제하거나 평가자를 바꾸세요.`); return; }
    mutate(() => { const u = userOf(id); if (u) { u.evaluator = on; logAct(`평가자 권한 ${on ? "부여" : "해제"}: ${u.name}`); } }); return;
  }
  if (d.enroll !== undefined && isAdmin()) {
    const id = d.enroll;
    if (t.checked) { mutate(() => { if (!entryOf(id)) { round().people.push({ uid: id, rater: "", record: fresh() }); logAct("회차 대상자 등록", id); } }); return; }
    const e = entryOf(id), started = e && (Object.keys(e.record.answers).length || e.record.submitted);
    if (started) { const a = await ask({ title: `${nameOf(id)} 교수를 이번 회차에서 제외할까요?`, body: "작성된 응답·평가 기록이 삭제됩니다.", ok: "제외", danger: true }); if (!a) { t.checked = true; return; } }
    mutate(() => { logAct("회차에서 제외", id); round().people = round().people.filter(p => p.uid !== id); }); return;
  }
  if (d.userField !== undefined && isAdmin()) {
    const v = t.value.trim(); if (!v) { render(); say("값을 비울 수 없습니다."); return; }
    mutate(() => { const u = userOf(d.id); if (u) { u[d.userField] = v; logAct(`구성원 정보 수정: ${u.name}`); } }, false); return;
  }
  if (t.id === "bulk-file" && t.files[0]) { const rd = new FileReader(); rd.onload = () => { el("bulk-text").value = String(rd.result || ""); say("파일 내용을 불러왔습니다. ‘일괄 등록’을 누르세요."); }; rd.readAsText(t.files[0], "utf-8"); return; }
  if (t.id === "import-file" && t.files[0] && isAdmin()) {
    const file = t.files[0]; t.value = "";
    let data; try { data = JSON.parse(await file.text()); } catch { say("올바른 백업 파일이 아닙니다."); return; }
    if (!data || data.v !== 6 || !Array.isArray(data.users) || !Array.isArray(data.rounds) || !data.rounds.length) { say("이 목업의 백업 파일 형식(v6, 4수준 척도)이 아닙니다. 이전 5수준 백업은 가져올 수 없습니다."); return; }
    const a = await ask({ title: "백업 파일로 교체할까요?", body: `현재 데이터가 파일 내용(구성원 ${data.users.length}명, 회차 ${data.rounds.length}개)으로 교체됩니다.`, ok: "가져오기", danger: true });
    if (!a) return;
    mutate(() => { store = normalize(data); logAct("백업 파일 가져오기"); }); say("백업 파일을 가져왔습니다.");
  }
});

render();
