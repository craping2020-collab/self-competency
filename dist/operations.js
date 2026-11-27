"use strict";
/* 관리자 화면: 운영 홈 · 회차 · 구성원 · 진행 현황 · 대상자 상세 · 데이터·기록 */
const matchQ = (q, u) => !q || (String(u.name) + " " + String(u.loginId) + " " + String(u.school)).toLowerCase().includes(String(q).trim().toLowerCase());
const evaluators = () => store.users.filter(u => u.evaluator);

function domainBars(rows) {
  const sub = rows.filter(p => p.record.submitted).map(p => p.record), ev = rows.filter(p => p.record.notified).map(p => p.record);
  const avg = (recs, d, w) => { const v = recs.map(r => domainAvg(r, d, w)).filter(x => x !== null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const bar = (v, c) => `<span class="bar-track"><i style="width:${v === null ? 0 : v / MAXLV * 100}%;background:${c}"></i></span><b>${fmt(v)}</b>`;
  return `<div class="domain-bars">${domains.map(d => `<div class="db-row"><span class="db-name">${esc(d)}</span><div>${bar(avg(sub, d, "current"), "#345676")}</div><div>${bar(avg(ev, d, "eval"), "#b5651d")}</div></div>`).join("")}</div><ul class="legend"><li><span class="sw" style="background:#345676"></span>자가진단 평균 (제출 ${sub.length}명)</li><li><span class="sw" style="background:#b5651d"></span>평가 확인 평균 (통보 ${ev.length}명)</li></ul>`;
}

function adminHome() {
  const r = round(), rows = r.people, n = rows.length, closed = isClosed(r), dd = r.close ? dday(r.close) : null;
  const c = f => rows.filter(p => f(p.record)).length;
  const sub = c(x => x.submitted), nt = c(x => x.notified), fin = c(x => x.final);
  const unassigned = rows.filter(p => !p.rater).length, waiting = rows.filter(p => p.record.submitted && p.rater && !p.record.notified).length;
  const appeals = rows.reduce((a, p) => a + openAppeals(p.record), 0), holds = rows.filter(p => p.record.notified && !p.record.final && hasHold(p.record)).length;
  const notSub = rows.filter(p => !p.record.submitted).length;
  const alerts = [
    unassigned && [`평가자 미배정 ${unassigned}명`, "미배정"], notSub && closed && [`마감이 지났는데 미제출 ${notSub}명`, "미제출", "late"],
    notSub && !closed && dd && dd.days <= 3 && [`마감 ${dd.text} · 미제출 ${notSub}명`, "미제출", "warn"],
    waiting && [`평가 작성 대기 ${waiting}명`, "제출 완료"], appeals && [`이의제기 재검토 대기 ${appeals}건`, "재검토 중"], holds && [`확인 보류 문항이 남은 교원 ${holds}명`, "보완 대기"]
  ].filter(Boolean);
  const statusParts = STATUS_ORDER.map(s => ({ label: s, n: rows.filter(p => statusOf(p.record) === s).length, color: STATUS_COLOR[s] }));
  return hero("운영 홈", `${esc(r.name)} ${closed ? pill("응답 마감", "late") : dd ? pill("응답 마감 " + dd.text, dd.cls) : ""}`) +
    `<div class="kpis">${kpi(n, "대상자")}${kpi(`${sub}<small>/${n}</small>`, "자가진단 제출", n ? Math.round(sub / n * 100) + "%" : "")}${kpi(nt, "결과 통보")}${kpi(fin, "평가 확정")}</div>` +
    `<section class="card ${alerts.length ? "current-card" : ""}"><h2>처리가 필요한 일</h2>${alerts.length ? `<ul class="alerts">${alerts.map(a => `<li class="${a[2] || ""}"><span>${esc(a[0])}</span><button class="quiet small" data-act="filter-go" data-status="${esc(a[1])}">보기</button></li>`).join("")}</ul>` : '<p class="muted">지금 처리할 일이 없습니다.</p>'}</section>` +
    `<section class="card"><h2>진행 상태 분포</h2>${n ? stacked(statusParts) : '<p class="muted">대상자를 등록하면 진행 상태가 표시됩니다.</p>'}<div class="actions"><button class="primary" data-go="progress">진행 현황</button><button class="quiet" data-go="members">구성원 관리</button></div></section>` +
    `<section class="card"><h2>역량별 평균 (Lv.1~4)</h2>${domainBars(rows)}</section>`;
}

/* ---------- 회차 ---------- */
function roundsPage() {
  const r = round(), closed = isClosed(r);
  const list = store.rounds.map(x => [esc(x.name) + (x.id === r.id ? " " + pill("현재", "info") : ""), esc(x.close || "—"), isClosed(x) ? pill("마감", "late") : pill("진행 중", "ok"), x.people.length + "명", x.id === r.id ? "" : `<button class="quiet small" data-act="pick-round" data-id="${x.id}">이 회차 열기</button>`]);
  return hero("회차 관리", "회차를 만들고 응답 마감을 관리합니다. 마감되면 교원은 자가진단을 입력·제출할 수 없습니다.") +
    `<section class="card"><h2>회차 목록</h2>${table(["회차", "응답 마감일", "상태", "대상자", ""], list)}</section>` +
    `<section class="card"><h2>현재 회차 설정</h2><form data-form="round-edit"><div class="fields"><label>회차 이름<input name="name" required maxlength="80" value="${esc(r.name)}"></label><label>응답 마감일<input type="date" name="close" value="${esc(r.close)}"></label></div><p class="muted">${r.closed ? "수동으로 마감된 상태입니다." : r.close && closed ? "마감일이 지나 자동 마감된 상태입니다. 마감일을 늦추면 다시 열립니다." : "마감일 다음 날부터 자동으로 마감됩니다."}</p><div class="actions"><button class="primary">저장</button><button type="button" class="${r.closed ? "primary" : "quiet"}" data-act="toggle-close">${r.closed ? "마감 해제" : "지금 마감"}</button></div></form></section>` +
    `<section class="card"><h2>새 회차 개설</h2><form data-form="add-round"><div class="fields"><label>회차 이름<input name="name" required maxlength="80"></label><label>응답 마감일<input type="date" name="close"></label></div><label class="check"><input type="checkbox" name="copy" checked> 현재 회차의 대상자와 평가자 배정을 복사 (응답 내용은 비어 있는 상태로 시작)</label><div class="actions"><button class="primary">회차 개설</button></div></form></section>`;
}

/* ---------- 구성원 ---------- */
function membersPage() {
  const r = round(), enrolled = new Set(r.people.map(p => p.uid));
  const shown = store.users.filter(u => matchQ(ui.memberQ, u));
  const rows = shown.map(u => [
    `<input aria-label="${esc(u.name)} 이름" data-user-field="name" data-id="${u.id}" value="${esc(u.name)}" maxlength="80">`,
    `<span class="id-code">${esc(u.loginId)}</span>${u.must ? ' <span class="pill warn">초기 비밀번호</span>' : ""}`,
    `<input aria-label="${esc(u.name)} 스쿨" data-user-field="school" data-id="${u.id}" value="${esc(u.school)}" maxlength="80">`,
    `<label class="check"><input type="checkbox" data-evaluator="${u.id}" ${u.evaluator ? "checked" : ""}> 평가자</label>${u.evaluator ? `<br><button class="quiet small" data-act="assign-open" data-id="${u.id}">담당 교수 지정 (${r.people.filter(p => p.rater === u.id).length}명)</button>` : ""}`,
    `<label class="check"><input type="checkbox" data-enroll="${u.id}" ${enrolled.has(u.id) ? "checked" : ""}> 이번 회차</label>`,
    `<button class="quiet small" data-act="reset-pw" data-id="${u.id}">비밀번호 초기화</button> <button class="danger small" data-act="delete-user" data-id="${u.id}">삭제</button>`
  ]);
  return hero("구성원", "전임교수를 등록하고, 평가자 권한을 줍니다. 평가자로 지정된 교수는 평가를 받는 화면과 평가하는 화면을 모두 봅니다. 평가자의 ‘담당 교수 지정’ 버튼으로 그 평가자가 평가할 교수를 한꺼번에 정할 수 있습니다.") +
    assignPanel() +
    `<section class="card"><h2>교수 등록</h2><form data-form="add-user"><div class="fields"><label>이름<input name="name" required maxlength="80"></label><label>소속 스쿨<input name="school" required maxlength="80"></label><label>ID (사번) <span class="muted small">비우면 자동 생성</span><input name="loginId" maxlength="40" pattern="[A-Za-z0-9._-]*" title="영문, 숫자, . _ - 만 사용"></label></div><label class="check"><input type="checkbox" name="evaluator"> 평가자 권한 부여</label> <label class="check"><input type="checkbox" name="enroll" checked> 현재 회차 대상자로 등록</label><div class="actions"><button class="primary">등록</button></div></form>` +
    `<details class="scale"><summary>여러 명 한 번에 등록 (CSV·붙여넣기)</summary><form data-form="bulk"><p class="muted small">한 줄에 한 명: <code>이름, 스쿨, 평가자 여부(Y/N, 생략 가능), ID(생략 가능)</code>. 엑셀에서 복사해 붙여 넣어도 됩니다. 이름과 스쿨이 같은 교수는 건너뜁니다.</p><textarea id="bulk-text" name="text" rows="6" placeholder="김교수, 방송영상스쿨, N, 20240101&#10;이교수, 게임스쿨, Y" required></textarea><label class="block">또는 파일 선택 (.csv, .txt)<input type="file" id="bulk-file" accept=".csv,.txt,text/csv,text/plain"></label><label class="check"><input type="checkbox" name="enroll" checked> 현재 회차 대상자로 등록</label><div class="actions"><button class="primary">일괄 등록</button></div></form></details></section>` +
    `<section class="card"><h2>구성원 목록 <span class="pill">${store.users.length}명 · 평가자 ${evaluators().length}명</span></h2><div class="filters"><label class="grow">이름·ID 검색<input type="search" data-q="members" value="${esc(ui.memberQ || "")}" placeholder="이름 또는 ID" autocomplete="off"></label>${ui.memberQ ? `<span class="muted small">${shown.length}명 표시</span>` : ""}</div>${table(["이름", "ID", "스쿨", "권한", "회차", "관리"], rows)}</section>`;
}
/* 평가자 기준 담당 교수 지정: 평가자 한 명에게 여러 교수를 한 번에 배정한다 */
function assignPanel() {
  const ev = userOf(ui.assignFor);
  if (!ev || !ev.evaluator) { ui.assignFor = null; return ""; }
  const r = round(), q = ui.assignQ || "", sel = ui.assignSel || (ui.assignSel = new Set());
  const list = r.people.filter(p => p.uid !== ev.id), shown = list.filter(p => matchQ(q, userOf(p.uid) || {}));
  const rows = shown.map(p => {
    const u = userOf(p.uid) || {}, locked = p.record.notified, other = p.rater && p.rater !== ev.id ? nameOf(p.rater) : "";
    return [`<label class="check"><input type="checkbox" data-asg="${p.uid}" ${sel.has(p.uid) ? "checked" : ""} ${locked ? "disabled" : ""}> ${esc(u.name)}</label>`, esc(u.school), statusPill(statusOf(p.record)),
      locked ? "통보 후라 변경할 수 없음" : other ? `현재 평가자 ${esc(other)} → 체크하면 이 평가자로 변경` : p.rater === ev.id ? "현재 담당" : "미배정"];
  });
  return `<section class="card current-card"><h2>${esc(ev.name)} 평가자의 담당 교수 지정</h2><p class="muted small">이번 회차(${esc(r.name)}) 대상자 중 ${esc(ev.name)} 선생님이 평가할 교수를 체크하세요. 본인은 목록에 나오지 않고, 체크를 해제하면 미배정으로 돌아갑니다.</p>` +
    (list.length ? `<div class="filters"><label class="grow">이름·ID·스쿨 검색<input type="search" data-q="assign" value="${esc(q)}" placeholder="이름, ID 또는 스쿨" autocomplete="off"></label><button class="quiet small" data-act="assign-all">검색 결과 모두 선택</button><button class="quiet small" data-act="assign-none">검색 결과 모두 해제</button></div>${table(["교수", "스쿨", "상태", "현재"], rows)}` : '<p class="muted">이번 회차 대상자가 없습니다. 아래 구성원 목록에서 ‘이번 회차’를 체크해 대상자로 등록하세요.</p>') +
    `<div class="actions"><button class="primary" data-act="assign-save" ${list.length ? "" : "disabled"}>저장 (${sel.size}명)</button><button class="quiet" data-act="assign-cancel">닫기</button></div></section>`;
}
function parseBulk(text) {
  return text.split(/\r?\n/).map(l => l.split(/[,\t]/).map(s => s.trim().replace(/^"|"$/g, ""))).filter(c => c[0] && c[1]).map(c => ({ name: c[0].slice(0, 80), school: c[1].slice(0, 80), evaluator: /^(y|yes|예|o|1|평가자)$/i.test(c[2] || ""), loginId: (c[3] || "").replace(/[^A-Za-z0-9._-]/g, "").slice(0, 40) }));
}
/* 계정 생성: 임시 비밀번호는 만든 직후 한 번만 보여 준다. 첫 로그인 때 변경해야 한다. */
function newLoginId() { let id; do { id = "t" + String(Math.floor(Math.random() * 90000) + 10000); } while (store.users.some(u => u.loginId.toLowerCase() === id)); return id; }
function addUsers(list, enroll) {
  let skipped = 0, idTaken = 0; const creds = [];
  list.forEach(x => {
    if (store.users.some(u => u.name === x.name && u.school === x.school)) { skipped++; return; }
    if (x.loginId && (store.users.some(u => u.loginId.toLowerCase() === x.loginId.toLowerCase()) || x.loginId.toLowerCase() === store.admin.loginId.toLowerCase())) { idTaken++; return; }
    const pw = tempPw(), u = { id: idFor(), loginId: x.loginId || newLoginId(), name: x.name, school: x.school, evaluator: Boolean(x.evaluator), pw: makePw(pw), must: true };
    store.users.push(u); creds.push({ name: u.name, loginId: u.loginId, pw, id: u.id });
    if (enroll) round().people.push({ uid: u.id, rater: "", record: fresh() });
  });
  return { added: creds.length, skipped, idTaken, creds };
}
async function showCreds(creds, title) {
  const text = creds.map(c => c.name + "  ·  ID " + c.loginId + "  ·  임시 비밀번호 " + c.pw).join("\n");
  try { await navigator.clipboard.writeText(creds.map(c => [c.name, c.loginId, c.pw].join("\t")).join("\n")); } catch { }
  await ask({ title, body: text + "\n\n이 창을 닫으면 임시 비밀번호를 다시 볼 수 없습니다. (목록은 클립보드에 복사를 시도했습니다.) 교수는 첫 로그인 때 새 비밀번호를 설정합니다.", ok: "확인했습니다", cancel: false });
}

/* ---------- 진행 현황 ---------- */
function progressPage() {
  const r = round(), f = ui.filter, schools = [...new Set(r.people.map(p => (userOf(p.uid) || {}).school))].filter(Boolean);
  const list = r.people.filter(p => {
    const u = userOf(p.uid) || {};
    return (!f.school || u.school === f.school) && (!f.status || (f.status === "미배정" ? !p.rater : statusOf(p.record) === f.status)) && matchQ(f.q, u);
  });
  const rows = list.map(p => {
    const u = userOf(p.uid) || {}, rec = p.record;
    const sel = `<select aria-label="${esc(u.name)} 평가자 배정" data-assign="${p.uid}" ${rec.notified ? "disabled" : ""}><option value="">미배정</option>${evaluators().filter(x => x.id !== p.uid).map(x => `<option value="${x.id}"${x.id === p.rater ? " selected" : ""}>${esc(x.name)}</option>`).join("")}</select>`;
    return [`<b>${esc(u.name)}</b>`, esc(u.school), sel, statusPill(statusOf(rec)), `${countSelf(rec)}/${questions.length} · ${countReview(rec)}/${questions.length}`, esc(rec.submittedAt ? fmtDT(rec.submittedAt) : "—"), `<button class="quiet small" data-go="person/${p.uid}">상세</button>`];
  });
  const sch = [...new Set(r.people.map(p => (userOf(p.uid) || {}).school))].filter(Boolean).map(s => {
    const g = r.people.filter(p => (userOf(p.uid) || {}).school === s), ev = g.filter(p => p.record.notified).map(p => p.record);
    return [esc(s), g.length + "명", ev.length + "명", ...domains.map(d => { const v = ev.map(x => domainAvg(x, d, "eval")).filter(x => x !== null); return v.length ? fmt(v.reduce((a, b) => a + b, 0) / v.length) : "—"; })];
  });
  const anyFilter = f.status || f.school || f.q;
  return hero("진행 현황", `${esc(r.name)} · 대상자 ${r.people.length}명${isClosed(r) ? " · 응답 마감" : ""}`) +
    `<section class="card"><div class="filters"><label class="grow">이름·ID 검색<input type="search" data-q="progress" value="${esc(f.q || "")}" placeholder="이름 또는 ID" autocomplete="off"></label><label>상태<select data-filter="status"><option value="">전체</option>${["미배정", ...STATUS_ORDER].map(s => `<option value="${s}"${f.status === s ? " selected" : ""}>${s === "미배정" ? "평가자 미배정" : s}</option>`).join("")}</select></label><label>스쿨<select data-filter="school"><option value="">전체</option>${schools.map(s => `<option value="${esc(s)}"${f.school === s ? " selected" : ""}>${esc(s)}</option>`).join("")}</select></label>${anyFilter ? '<button class="quiet small" data-act="clear-filter">필터 해제</button>' : ""}<button class="quiet small" data-act="copy-missing">미제출자 명단 복사</button></div>` +
    `<p class="muted small" aria-live="polite">${list.length}명 표시 (전체 ${r.people.length}명)</p><p class="muted small">진행 열: 자가진단 작성 · 평가 작성 (문항 수). 평가자는 통보 전까지만 바꿀 수 있고, 본인은 본인의 평가자가 될 수 없습니다. 여러 명을 한꺼번에 배정하려면 <button class="linkish" data-go="members">구성원 → 평가자의 ‘담당 교수 지정’</button>을 이용하세요.</p>${table(["교수", "스쿨", "평가자", "상태", "진행", "제출일", ""], rows)}</section>` +
    `<section class="card"><h2>스쿨별 평가 집계</h2><p class="muted small">결과가 통보된 교수의 ‘평가 확인’ 평균(Lv.1~4)입니다. 재검토 판정을 반영합니다.</p>${table(["스쿨", "대상", "통보", ...domains.map(esc)], sch)}</section>`;
}

/* ---------- 대상자 상세 (열람 + 재개방) ---------- */
const REOPEN = [
  { key: "final", when: r => r.final, label: "확정 해제", run: r => { r.final = false; } },
  { key: "notified", when: r => r.notified && !r.final, label: "평가 재개방 (통보 취소)", run: r => { r.notified = false; } },
  { key: "submitted", when: r => r.submitted && !r.notified, label: "제출 취소 (자가진단 재개방)", run: r => { r.submitted = false; r.submittedAt = ""; } }
];
function personPage(uid) {
  const e = entryOf(uid), u = userOf(uid);
  if (!e || !u) return hero("대상자 상세", "이번 회차 대상자가 아닙니다.") + '<button class="primary" data-go="progress">진행 현황으로</button>';
  const rec = e.record, ro = REOPEN.filter(x => x.when(rec)), history = store.log.filter(l => l.uid === uid && l.round === round().name).slice(-30).reverse();
  const appeals = Object.entries(rec.appeals).map(([id, a]) => [id, esc(a.reason), a.resolved ? pill("재검토 완료 · " + display(a.level), "ok") : pill("대기", "warn"), esc(a.decision || "")]);
  return hero(`${esc(u.name)} <small class="muted">${esc(u.school)}</small>`, `${statusPill(statusOf(rec))} · 평가자 ${esc(nameOf(e.rater))}`) +
    `<div class="actions"><button class="quiet" data-go="progress">← 진행 현황</button></div>` +
    `<section class="card"><h2>진행 단계</h2>${stepper(rec)}<p class="muted">제출일 ${fmtDT(rec.submittedAt)} · 자가진단 ${countSelf(rec)}/${questions.length} · 평가 ${countReview(rec)}/${questions.length}</p></section>` +
    `<section class="card"><h2>관리 작업</h2><div class="actions">${ro.map(x => `<button class="quiet" data-act="reopen" data-key="${x.key}" data-uid="${uid}">${x.label}</button>`).join("") || '<span class="muted">되돌릴 단계가 없습니다.</span>'}<button class="danger" data-act="remove-entry" data-uid="${uid}">이번 회차에서 제외</button></div><p class="muted small">재개방은 사유가 기록에 남습니다. 응답이 마감된 회차에서 제출을 취소했다면 마감일을 먼저 조정하세요.</p></section>` +
    reportCard(e, "admin") + (appeals.length ? `<section class="card"><h2>이의제기</h2>${table(["문항", "요청 사유", "상태", "재검토 이유"], appeals)}</section>` : "") +
    (rec.interview.saved ? `<section class="card"><h2>성장 면담기록</h2><p><b>다음 행동</b> · ${esc(rec.interview.action)}</p><p><b>필요한 지원과 담당자</b> · ${esc(rec.interview.support)}</p><p class="muted">면담일 ${esc(rec.interview.date)} · 점검일 ${esc(rec.interview.check)}</p></section>` : "") +
    `<section class="card"><h2>처리 기록</h2>${table(["시각", "수행자", "작업"], history.map(l => [fmtDT(l.t), esc(l.who), esc(l.action)]))}</section>`;
}

/* ---------- 측정 일치도 (목업) ---------- */
function agreementStats(rows) {
  const pairs = { se: [], re: [], sr: [] }, by = {};
  domains.forEach(d => { by[d] = { se: [], re: [] }; });
  rows.forEach(p => questions.forEach(q => {
    const rec = p.record, s = levelOf(rec, q, "current"), e = rec.notified ? levelOf(rec, q, "eval") : null, r = rec.records[q.id] ? rec.records[q.id].level : null;
    if (s !== null && e !== null) { pairs.se.push([s, e]); by[q.domain].se.push([s, e]); }
    if (r !== null && e !== null) { pairs.re.push([r, e]); by[q.domain].re.push([r, e]); }
    if (s !== null && r !== null) pairs.sr.push([s, r]);
  }));
  const stat = a => ({ n: a.length, exact: a.length ? a.filter(x => x[0] === x[1]).length / a.length : null, near: a.length ? a.filter(x => Math.abs(x[0] - x[1]) <= 1).length / a.length : null, bias: a.length ? a.reduce((t, x) => t + (x[0] - x[1]), 0) / a.length : null });
  return { se: stat(pairs.se), re: stat(pairs.re), sr: stat(pairs.sr), by };
}
const pct = v => v === null ? "—" : Math.round(v * 100) + "%";
function agreementPage() {
  const rows = round().people, A = agreementStats(rows);
  const card1 = (t, st, note) => `<div class="kpi"><div class="n">${pct(st.exact)}</div><div class="t">${t}</div><div class="s">±1단계 이내 ${pct(st.near)} · 비교 ${st.n}건</div><div class="muted small">${note}</div></div>`;
  const dRows = domains.map(d => { const x = A.by[d]; const e = a => a.length ? pct(a.filter(v => v[0] === v[1]).length / a.length) + ` (${a.length})` : "—"; return [esc(d), e(x.se), e(x.re)]; });
  return hero("측정 일치도 (목업)", "같은 문항에 대해 교원 자가진단, 기록으로 확인한 행동기준, 평가자 확인이 얼마나 같은 수준을 가리키는지 봅니다.") +
    banner("목업입니다. 시연 데이터로 계산한 값이며, 실제 파일럿에서는 이 화면으로 평가자 조율 세션(같은 사례를 여러 평가자가 판정)의 일치도와 기록 필드 보완 필요 문항을 확인합니다.", "info") +
    `<div class="kpis">${card1("자가진단 ↔ 평가자 확인", A.se, A.se.bias === null ? "" : `평균 차이(자기−평가) ${A.se.bias.toFixed(2)}`)}${card1("행동기준 확인 ↔ 평가자 확인", A.re, "기록으로 확인한 행동기준이 평가와 얼마나 같은가")}${card1("자가진단 ↔ 행동기준 확인", A.sr, "자가진단과 기록의 차이")}</div>` +
    `<section class="card"><h2>역량별 완전 일치율</h2>${table(["역량", "자가진단 ↔ 평가자 (건수)", "행동기준 확인 ↔ 평가자 (건수)"], dRows)}<p class="muted small">숫자 수준(1~4)으로 판정된 응답만 비교합니다. 역할 해당 없음·수행 기회 없음·기초 수행 전·확인 보류는 제외합니다. 일치율이 낮은 역량은 문항 문장이나 기록 필드를 보완할 후보입니다.</p></section>`;
}

/* 운영자기능 하위 탭 */
const OPS_TABS = [["home", "운영 홈"], ["progress", "진행 현황"], ["agreement", "측정 일치도"], ["members", "구성원"], ["rounds", "회차 관리"], ["data", "데이터·기록"]];
const opsTabs = n => tabsBar(OPS_TABS, n === "person" ? "progress" : n);

/* ---------- 데이터·기록 ---------- */
function dataPage() {
  const log = store.log.slice().reverse(), shown = log.slice(0, ui.logLimit);
  return hero("데이터·기록", "백업·복원과 결과 내보내기, 처리 기록을 관리합니다.") +
    `<section class="card"><h2>백업 · 복원</h2>${banner("이 체험 버전은 데이터를 이 브라우저에만 저장합니다. 다른 기기로 옮기거나 안전하게 보관하려면 백업 파일을 내보내세요.", "info")}<div class="actions"><button class="primary" data-act="export-json">백업 파일 내보내기 (JSON)</button><button class="quiet" data-act="pick-import">백업 파일 가져오기</button><input type="file" id="import-file" accept=".json,application/json" hidden></div><p class="muted small">가져오면 현재 데이터가 파일 내용으로 교체됩니다.</p></section>` +
    `<section class="card"><h2>결과 내보내기</h2><p class="muted">현재 회차의 문항별 결과를 엑셀에서 열 수 있는 CSV로 내려받습니다.</p><div class="actions"><button class="quiet" data-act="export-csv">결과 CSV 내보내기</button></div></section>` +
    `<section class="card"><h2>체험 데이터</h2><div class="actions"><button class="quiet" data-act="sample">예시 교수 추가 (제출·행동기준 확인 상태)</button><button class="danger" data-act="reset">시연 데이터로 초기화</button></div></section>` +
    `<section class="card"><h2>처리 기록 <span class="pill">${log.length}건</span></h2>${table(["시각", "수행자", "작업", "대상", "회차"], shown.map(l => [fmtDT(l.t), esc(l.who), esc(l.action), esc(l.target || "—"), esc(l.round)]))}${log.length > shown.length ? '<div class="actions"><button class="quiet" data-act="more-log">더 보기</button></div>' : ""}</section>`;
}

/* ---------- 관리자 동작 ---------- */
const needAdmin = () => isAdmin();
Object.assign(ACTIONS, {
  "filter-go"(t) { ui.filter = { status: t.dataset.status, school: "" }; go("progress"); },
  "clear-filter"() { ui.filter = { status: "", school: "" }; render(); },
  async "copy-missing"() {
    const names = round().people.filter(p => !p.record.submitted).map(p => nameOf(p.uid));
    if (!names.length) { say("미제출자가 없습니다."); return; }
    try { await navigator.clipboard.writeText(names.join(", ")); say(`미제출자 ${names.length}명의 명단을 복사했습니다.`); }
    catch { await ask({ title: `미제출자 ${names.length}명`, body: names.join(", "), ok: "닫기" }); }
  },
  "pick-round"(t) { if (needAdmin()) { mutate(() => { if (store.rounds.some(r => r.id === t.dataset.id)) store.round = t.dataset.id; }); ui.filter = { status: "", school: "" }; } },
  async "toggle-close"() {
    const r0 = round(), to = !r0.closed;
    const a = await ask({ title: to ? "지금 마감할까요?" : "마감을 해제할까요?", body: to ? "교원은 더 이상 자가진단을 입력·제출할 수 없습니다." : "교원이 다시 입력·제출할 수 있습니다. (마감일이 지났다면 마감일도 함께 조정하세요.)", ok: to ? "마감" : "해제" });
    if (a) mutate(() => { round().closed = to; logAct(to ? "회차 수동 마감" : "회차 마감 해제"); });
  },
  "assign-open"(t) {
    const id = t.dataset.id; ui.assignFor = id; ui.assignQ = "";
    ui.assignSel = new Set(round().people.filter(p => p.rater === id).map(p => p.uid));
    render(); window.scrollTo(0, 0);
  },
  "assign-cancel"() { ui.assignFor = null; render(); },
  "assign-all"() { round().people.filter(p => p.uid !== ui.assignFor && !p.record.notified && matchQ(ui.assignQ, userOf(p.uid) || {})).forEach(p => ui.assignSel.add(p.uid)); render(); },
  "assign-none"() { round().people.filter(p => !p.record.notified && matchQ(ui.assignQ, userOf(p.uid) || {})).forEach(p => ui.assignSel.delete(p.uid)); render(); },
  "assign-save"() {
    const evId = ui.assignFor, sel = ui.assignSel || new Set();
    const n = mutate(() => {
      const ev = userOf(evId); if (!ev || !ev.evaluator) return -1; let changed = 0;
      round().people.forEach(p => {
        if (p.uid === evId || p.record.notified) return;
        if (sel.has(p.uid) && p.rater !== evId) { p.rater = evId; logAct(`평가자 배정: ${ev.name}`, p.uid); changed++; }
        else if (!sel.has(p.uid) && p.rater === evId) { p.rater = ""; logAct(`평가자 배정 해제: ${ev.name}`, p.uid); changed++; }
      });
      return changed;
    }, false);
    ui.assignFor = null; render();
    say(n < 0 ? "평가자 권한이 없는 구성원입니다." : n ? `담당 교수 배정을 저장했습니다. (변경 ${n}명)` : "변경된 내용이 없습니다.");
  },
  async "delete-user"(t) {
    const u = userOf(t.dataset.id); if (!u) return;
    const a = await ask({ title: `${u.name} 교수를 삭제할까요?`, body: "모든 회차의 응답·평가 기록이 함께 삭제되며 되돌릴 수 없습니다. 먼저 백업을 권장합니다.", ok: "삭제", danger: true });
    if (!a) return;
    mutate(() => { logAct(`구성원 삭제: ${u.name}`); store.users = store.users.filter(x => x.id !== u.id); store.rounds.forEach(r => { r.people = r.people.filter(p => p.uid !== u.id); r.people.forEach(p => { if (p.rater === u.id) p.rater = ""; }); }); });
    say("삭제했습니다.");
  },
  async "reset-pw"(t) {
    const u = userOf(t.dataset.id); if (!u) return;
    const a = await ask({ title: `${u.name} 교수의 비밀번호를 초기화할까요?`, body: "임시 비밀번호가 새로 발급되고, 기존 비밀번호는 쓸 수 없습니다.", ok: "초기화" }); if (!a) return;
    const pw = tempPw();
    mutate(() => { const x = userOf(u.id); if (x) { x.pw = makePw(pw); x.must = true; logAct("비밀번호 초기화", x.id); } });
    await showCreds([{ name: u.name, loginId: u.loginId, pw }], "임시 비밀번호가 발급되었습니다");
  },
  async reopen(t) {
    const op = REOPEN.find(x => x.key === t.dataset.key), uid = t.dataset.uid; if (!op) return;
    const a = await ask({ title: op.label, body: "되돌리는 사유를 입력하세요. 사유는 처리 기록에 남습니다.", input: "사유", ok: "실행" });
    if (!a) return; if (!a.value) { say("사유를 입력하세요."); return; }
    mutate(() => { const e = entryOf(uid); if (e && op.when(e.record)) { op.run(e.record); logAct(`${op.label} — ${a.value}`, uid); } });
  },
  async "remove-entry"(t) {
    const uid = t.dataset.uid, a = await ask({ title: `${nameOf(uid)} 교수를 이번 회차에서 제외할까요?`, body: "이 회차의 응답·평가 기록이 삭제됩니다. (구성원 목록에는 남습니다.)", ok: "제외", danger: true });
    if (!a) return;
    mutate(() => { logAct("회차에서 제외", uid); round().people = round().people.filter(p => p.uid !== uid); }, false); go("progress");
  },
  "export-json"() { download(`청강역량진단_백업_${localDate()}.json`, JSON.stringify(store, null, 1), "application/json"); mutate(() => logAct("백업 파일 내보내기"), false); say("백업 파일을 내려받았습니다."); },
  "pick-import"() { el("import-file").click(); },
  "export-csv"() {
    const head = ["교수", "스쿨", "평가자", "상태", "문항", "역량", "문항 내용", "자가진단 현재", "목표", "평가 확인(최초)", "최종 판정", "판정 사유", "수행 사례"];
    const lines = [head.map(csvCell).join(",")];
    round().people.forEach(p => { const u = userOf(p.uid) || {}; questions.forEach(q => { const a = answerOf(p.record, q), rv = p.record.reviews[q.id] || {}, res = resultOf(p.record, q.id); lines.push([u.name, u.school, nameOf(p.rater), statusOf(p.record), q.id, q.domain, q.title, display(a.current), display(a.target), p.record.notified ? display(rv.level) : "", p.record.notified ? display(res.level) : "", p.record.notified ? res.reason : "", a.evidence].map(csvCell).join(",")); }); });
    download(`청강역량진단_결과_${localDate()}.csv`, "﻿" + lines.join("\r\n"), "text/csv;charset=utf-8");
    mutate(() => logAct("결과 CSV 내보내기"), false); say("결과 CSV를 내려받았습니다.");
  },
  sample() {
    mutate(() => {
      let ev = store.users.find(u => u.evaluator);
      if (!ev) { ev = { id: idFor(), loginId: "eval" + (store.users.length + 1), name: "예시 평가자", school: "예시 스쿨", evaluator: true, pw: makePw("demo1234"), must: false }; store.users.push(ev); }
      const n = store.users.filter(u => /^예시 교수/.test(u.name)).length + 1; let k = n; while (store.users.some(x => x.loginId === "demo" + k)) k++;
      const u = { id: idFor(), loginId: "demo" + k, name: "예시 교수 " + n, school: "예시 스쿨", evaluator: false, pw: makePw("demo1234"), must: false };
      store.users.push(u);
      round().people.push({ uid: u.id, rater: ev.id, record: demoRecord(u.id, 2 + (n % 2), questions.length, "pull") }); logAct("예시 교수 추가", u.id);
    }); say("예시 교수를 추가했습니다. (자가진단 제출·행동기준 확인 상태 / ID demo숫자, 비밀번호 demo1234)");
  },
  async reset() {
    const a = await ask({ title: "시연 데이터로 초기화할까요?", body: "구성원, 회차, 응답, 평가, 처리 기록이 모두 삭제되고 목업의 처음 시연 데이터로 돌아갑니다. 되돌릴 수 없으니 먼저 백업하세요.", ok: "초기화", danger: true });
    if (!a) return;
    store = seed(); saveStore(); setSession(null); location.hash = ""; render(); say("초기화했습니다.");
  },
  "more-log"() { ui.logLimit += 100; render(); }
});
Object.assign(FORMS, {
  "add-user"(f, v) {
    const name = String(v.get("name") || "").trim(), school = String(v.get("school") || "").trim();
    if (!name || !school) { say("이름과 스쿨을 입력하세요."); return; }
    const loginId = String(v.get("loginId") || "").trim();
    const res = mutate(() => { const r = addUsers([{ name, school, evaluator: v.get("evaluator") === "on", loginId }], v.get("enroll") === "on"); if (r.added) logAct(`구성원 등록: ${name}`); return r; });
    if (res.added) { if (v.get("evaluator") === "on") { ui.assignFor = res.creds[0].id; ui.assignQ = ""; ui.assignSel = new Set(); render(); window.scrollTo(0, 0); } showCreds(res.creds, "계정이 생성되었습니다" + (v.get("evaluator") === "on" ? " (이어서 담당 교수를 지정할 수 있습니다)" : "")); } else say(res.idTaken ? "이미 사용 중인 ID입니다." : "이미 같은 이름·스쿨의 교수가 있습니다.");
  },
  bulk(f, v) {
    const list = parseBulk(String(v.get("text") || ""));
    if (!list.length) { say("‘이름, 스쿨’ 형식의 줄이 없습니다."); return; }
    const res = mutate(() => { const r = addUsers(list, v.get("enroll") === "on"); logAct(`일괄 등록 ${r.added}명`); return r; });
    say(`${res.added}명을 등록했습니다.${res.skipped ? ` (이름·스쿨 중복 ${res.skipped}명 제외)` : ""}${res.idTaken ? ` (ID 중복 ${res.idTaken}명 제외)` : ""}`);
    if (res.added) showCreds(res.creds, `계정 ${res.added}개가 생성되었습니다`);
  },
  "add-round"(f, v) {
    const name = String(v.get("name") || "").trim(); if (!name) { say("회차 이름을 입력하세요."); return; }
    mutate(() => {
      const src = round(), id = idFor();
      store.rounds.push({ id, name, close: v.get("close") || "", closed: false, people: v.get("copy") === "on" ? src.people.map(p => ({ uid: p.uid, rater: p.rater, record: fresh() })) : [] });
      store.round = id; logAct("회차 개설");
    }); ui.filter = { status: "", school: "" }; say("회차를 개설했습니다.");
  },
  "round-edit"(f, v) {
    const name = String(v.get("name") || "").trim(); if (!name) { say("회차 이름을 입력하세요."); return; }
    mutate(() => { const r = round(); r.name = name; r.close = v.get("close") || ""; logAct("회차 설정 변경"); }); say("저장했습니다.");
  }
});
