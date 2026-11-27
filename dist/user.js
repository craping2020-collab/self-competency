"use strict";
/* 사용자(전임교수) 화면: 홈 · 자가진단 · 평가 결과 · 도움말, 공용 리포트 */
const myEntry = () => entryOf(session.uid);
const noEntry = () => hero("내 진단", "이번 회차 대상자로 등록되어 있지 않습니다.") +
  `<section class="card"><p>관리자가 「${esc(round().name)}」 회차 대상자로 등록하면 자가진단을 시작할 수 있습니다. 이미 참여 중인 회차가 따로 있다면 관리자에게 현재 회차를 확인해 달라고 요청하세요.</p></section>`;

function stepper(rec) {
  const cur = !rec.submitted ? 0 : !rec.notified ? 1 : !rec.final ? 2 : !rec.interview.saved ? 3 : 4;
  return `<ol class="steps" aria-label="진행 단계">${STAGES.map((s, i) => `<li class="${i < cur ? "done" : i === cur ? "now" : ""}"${i === cur ? ' aria-current="step"' : ""}><span>${i < cur ? "✓" : i + 1}</span>${s}</li>`).join("")}</ol>`;
}
function noticeCard() { return `<section class="card notice"><h2>${NOTICE.title}</h2><ul>${NOTICE.items.map(t => `<li>${esc(t)}</li>`).join("")}</ul></section>`; }

/* 문항 흐름(역량 단위로 순서대로 열림) */
const domainDone = (i, fn) => questions.filter(q => q.domain === domains[i]).every(fn);
const availableDomain = (i, fn) => i <= ui.dom || domains.slice(0, i).every((_, j) => domainDone(j, fn));
function visibleQuestions(fn) {
  const g = questions.filter(q => q.domain === domains[ui.dom]), p = g.findIndex(q => !fn(q));
  return p === -1 ? g : g.slice(0, p + 1);
}
function panel(fn, partFn) {
  return `<section class="card panel"><h2>역량 목록</h2><div class="domain-list">${domains.map((d, i) => {
    const qs = questions.filter(q => q.domain === d);
    return `<button class="domain ${ui.dom === i ? "active" : ""}" style="--dm:${DOMAIN_COLORS[i]}" data-domain="${i}"${availableDomain(i, fn) ? "" : " disabled"}${ui.dom === i ? ' aria-current="true"' : ""}>${d} <span>${qs.filter(partFn).length}/${qs.length}</span></button>`;
  }).join("")}</div></section>`;
}
function card(q, content, current = false, withScale = true) {
  return `<article class="card qcard${current ? " current-card" : ""}" data-q="${q.id}" style="--dm:${domainColor(q.domain)}"><div class="question-id">${q.domain} · 문항 ${String(q.id).padStart(2, "0")}</div><h3>${esc(q.title)}</h3>${withScale ? `<details class="scale"><summary>수준별 행동기준 보기</summary><ol>${q.levels.map((v, i) => `<li><b>${labels[i]}</b> · ${esc(v)}</li>`).join("")}</ol><p class="muted">확인 자료 · ${esc(q.proof)}</p></details>` : ""}${content}</article>`;
}

/* 수준 선택: 라디오를 카드로 보여 준다 (현재 수준 / 2년 뒤 목표) */
const ALT_HINT = {
  before: "기회는 있었으나 아직 하지 않음",
  role: "내 직무·보직에 이 행동이 없음",
  chance: "역할은 있으나 최근 1년간 그런 상황이 없었음",
  none: "해당 역량에 대한 별도 개선계획 없음",
  later: "아직 정하지 못함"
};
const STATE_HELP = {
  before: "역할과 기회가 있었으나 Lv.1(기초 수행)에 해당하는 행동을 아직 하지 않았습니다.",
  role: "내 직무·보직에 이 행동이 포함되지 않습니다.",
  chance: "역할은 있으나 최근 1년 안에 그런 상황이 없었습니다.",
  none: "해당 역량에 대한 별도 개선계획이 없습니다.",
  later: "아직 정하지 않았습니다."
};
function levelPicker(q, field, value, locked) {
  const target = field === "target", name = `${field}-${q.id}`, d = `data-a="${q.id}" data-f="${field}"`, dis = locked ? " dis" : "", da = locked ? " disabled" : "";
  const fresh = ui.fresh && ui.fresh.q === q.id && ui.fresh.f === field ? " reveal" : "";
  const nums = numbers.map(n => `<label class="lv lv${n}${value === n ? " on" : ""}${dis}"><input type="radio" name="${name}" value="${n}" ${d} ${value === n ? "checked" : ""}${da}><span class="lv-n">Lv.${n}</span><span class="lv-t">${labels[n - 1]}</span></label>`).join("");
  const altKeys = target ? ["none", "later"] : ["before", "role", "chance"];
  const alt = `<div class="lv-alt"><div class="lv-alt-h">${target ? "목표를 정하기 어렵다면" : "위 수준에 해당하지 않는다면"}${tip("선택 사항입니다. 하나를 고르면 수준 대신 이 상태로 기록됩니다" + (target ? "." : "(평균에서 제외)."), "l")}</div><div class="lv-alt-grid">${altKeys.map(k => `<label class="alt${value === k ? " on" : ""}${dis}"><input type="radio" name="${name}" value="${k}" ${d} ${value === k ? "checked" : ""}${da}><b>${special[k]}</b><small>${ALT_HINT[k]}</small></label>`).join("")}</div></div>`;
  /* 상세 행동기준 설명: 수준 카드를 누르는 순간 아래에 생긴다 */
  const desc = numbers.includes(value) ? `<div class="lv-desc lv${value}${fresh}" style="--sel:var(--lc)"><b>Lv.${value} · ${labels[Number(value) - 1]}</b> — ${esc(q.levels[Number(value) - 1])}</div>`
    : special[value] ? `<div class="lv-desc${fresh}"><b>${special[value]}</b> — ${STATE_HELP[value]}</div>` : "";
  return `<fieldset class="lv-field"><legend>${target ? "2년 뒤 목표" : "현재 수준"}</legend><div class="lv-grid" role="radiogroup">${nums}</div>${alt}${desc}</fieldset>`;
}

/* 행동기준 확인 (목업): 업무 기록으로 행동기준을 확인한다. 실제 운영에서는 학내 시스템 기록과 연동한다 */
function recordPanel(rec, q, mode, locked) {
  const a = rec.answers[q.id] || {}, owner = mode === "owner";
  const r = rec.records[q.id] || (owner && a.current && session ? { level: mockRecordLevel(session.uid, q) } : null);
  const rows = q.signals.map((t, i) => `<li class="${r && i < r.level ? "on" : ""}"><span class="sg" aria-hidden="true">${r && i < r.level ? "✓" : "·"}</span><span><b>${labels[i]}</b> ${esc(t)}</span></li>`).join("");
  const differs = owner && r && numbers.includes(a.current) && Number(a.current) !== r.level;
  const diff = tip(differs ? `기록으로 확인된 행동기준(Lv.${r.level})과 선택한 수준(Lv.${a.current})이 다릅니다. 면담에서 함께 살펴봅니다.` : "업무 기록에서 자동으로 확인된 행동기준입니다. 선택한 수준과 다르면 면담에서 함께 살펴봅니다.", "l");
  return `<details class="records" open><summary>행동기준 확인${diff}</summary><ul class="signals">${rows}</ul></details>`;
}
const phaseBanner = () => banner(PHASE_NOTE, "info");
/* 체험 계정 전환(로그인 보류 중에만): 교원 첫 화면에서 바로 다른 교원으로 바꿔 볼 수 있다 */
const demoSwitch = u => SKIP_LOGIN && store.users.length > 1
  ? `<div class="demo-switch"><span>체험 계정</span><select id="faculty-view" aria-label="체험 계정 전환">${store.users.map(m => `<option value="${esc(m.id)}"${m.id === u.id ? " selected" : ""}>${esc(m.name)}${m.evaluator ? " (평가자)" : ""}</option>`).join("")}</select></div>` : "";
/* 처음 쓰는 교원을 위한 3단계 안내 */
const howto = () => `<ol class="howto" aria-label="자가진단 방법"><li><b>1</b><span><strong>역량 탭을 골라 이동</strong>순서 없이 어느 역량부터 입력해도 됩니다.</span></li><li><b>2</b><span><strong>문항을 펼쳐 수준 선택</strong>현재 수준을 고르면 목표 선택이 열리고 자동 저장됩니다.</span></li><li><b>3</b><span><strong>행동기준 확인 후 제출</strong>업무 기록에서 확인된 행동기준이 자동으로 표시됩니다. 확인하고 제출합니다.</span></li></ol>`;

/* 하위 탭 (도움말 · 진단결과) */
const tabsBar = (items, active) => `<div class="subtabs" role="tablist">${items.map(([k, l]) => `<button class="subtab${k === active ? " active" : ""}" data-go="${k}" role="tab" aria-selected="${k === active}">${l}</button>`).join("")}</div>`;
const helpTabs = a => tabsBar([["faq", "자주 묻는 질문"], ["pilot", "파일럿 안내"]], a);
const resultTabs = a => { const m = me(); return m && m.evaluator ? tabsBar([["result", "내 진단결과"], ["raters", "평가 대상자"]], a) : ""; };

/* 개인 리포트 (owner | admin | rater) */
const tip = (text, cls = "") => `<span class="tip ${cls}" tabindex="0" role="note" aria-label="${esc(text)}" data-tip="${esc(text)}"></span>`;
const fileSize = n => n >= 1048576 ? (n / 1048576).toFixed(1) + "MB" : Math.max(1, Math.round(n / 1024)) + "KB";
function uploadBox(q, a, locked) {
  const files = a.files || [];
  const list = files.length ? `<ul class="files">${files.map((f, i) => `<li><span class="fname">📎 ${esc(f.name)}</span><span class="muted small">${fileSize(f.size)}</span>${locked ? "" : `<button class="quiet small" data-act="rm-file" data-q="${q.id}" data-i="${i}" aria-label="${esc(f.name)} 삭제">삭제</button>`}</li>`).join("")}</ul>` : "";
  return `<div class="upload"><div class="upload-h"><b>자료 업로드</b><span class="muted small">(선택)</span>${tip("수행 사례를 뒷받침하는 자료(문서·이미지 등)를 올리세요. 올린 즉시 자동 저장됩니다. 목업에서는 파일 이름만 기록하고 실제 파일은 저장하지 않습니다.", "l")}</div>${locked ? "" : `<label class="upbtn">파일 선택<input type="file" multiple data-upload="${q.id}"></label>`}${list}</div>`;
}
const PRIO_HEAD = '개발 우선<span class="tip" tabindex="0" role="note" data-tip="앞으로 먼저 키우고 싶은 행동을 두 개까지 체크하세요. 성장 면담에서 우선 이야기하며, 인사에는 반영되지 않습니다. 체크하거나 풀면, 필요한 지원 내용을 입력해도 자동 저장됩니다."></span>';
function reportCard(e, viewer) {
  const rec = e.record, showEval = rec.notified, owner = viewer === "owner";
  const series = [{ name: "현재(자가진단)", vals: domains.map(d => domainAvg(rec, d, "current")), color: "#345676", dash: "" }];
  if (showEval) series.push({ name: "평가 확인", vals: domains.map(d => domainAvg(rec, d, "eval")), color: "#b5651d", dash: "2 3" });
  series.push({ name: "2년 뒤 목표", vals: domains.map(d => domainAvg(rec, d, "target")), color: "#2f7a63", dash: "6 4" });
  const dRows = domains.map((d, i) => [esc(d), fmt(series[0].vals[i]), ...(showEval ? [fmt(series[1].vals[i])] : []), fmt(series[series.length - 1].vals[i])]);
  const hasRec = questions.some(q => rec.records[q.id]);
  const head = ["행동 문항", "현재", ...(hasRec ? ["행동기준 확인"] : []), ...(showEval ? ["평가 확인"] : []), "2년 뒤 목표", PRIO_HEAD, "필요한 지원 (선택)", ...(owner ? [] : ["수행 사례"])];
  const rows = questions.map(q => {
    const a = answerOf(rec, q), pr = rec.priorities.includes(q.id);
    return [esc(q.domain + " · " + q.title), esc(display(a.current)),
      ...(hasRec ? [rec.records[q.id] ? "Lv." + rec.records[q.id].level : "—"] : []),
      ...(showEval ? [esc(display(resultOf(rec, q.id).level))] : []), esc(display(a.target)),
      owner ? `<input type="checkbox" aria-label="${esc(q.title)} 개발 우선" data-priority="${q.id}" ${pr ? "checked" : ""}>` : (pr ? "●" : ""),
      owner ? `<input type="text" class="support" data-support="${q.id}" value="${esc((rec.supports || {})[q.id] || "")}" maxlength="120" placeholder="${pr ? "예: 연수, 자료, 동료 멘토링" : "개발 우선을 체크하면 입력"}" aria-label="${esc(q.title)} 필요한 지원" ${pr ? "" : "disabled"}><span class="saved-mark" data-saved="${q.id}" aria-live="polite"></span>` : esc((rec.supports || {})[q.id] || (pr ? "—" : "")),
      ...(owner ? [] : [esc(a.evidence || ((a.files || []).length ? "" : "—")) + ((a.files || []).length ? `<div class="muted small">${a.files.map(f => "📎 " + esc(f.name)).join("<br>")}</div>` : "")])];
  });
  return `<section class="card"><h2>영역별 현재 수준</h2><div class="chart-row"><div>${radar(series)}</div><div>${table(["역량", "현재", ...(showEval ? ["평가"] : []), "목표"], dRows)}<p class="muted small">Lv.1~4 평균입니다. ‘기초 수행 전’·‘역할 해당 없음’·‘수행 기회 없음’·‘확인 보류’ 등은 평균에서 제외됩니다.</p></div></div></section>` +
    `<section class="card"><h2>문항별 결과</h2>${table(head, rows)}</section>`;
}
function planCard() {
  return `<div class="actions no-print"><button class="quiet" data-act="print">인쇄 / PDF</button></div>`;
}
const canWithdraw = rec => rec.submitted && !rec.notified && !Object.keys(rec.reviews).length && !isClosed(round());

/* ---------- 자가진단 (점진적 공개: 문항을 펼치면 현재 수준 → 목표 → 근거 순으로 열린다) ---------- */
function selfPage() {
  const e = myEntry(); if (!e) return noEntry();
  const uid = e.uid, rec = e.record, closed = isClosed(round()), locked = rec.submitted || closed, count = countSelf(rec);
  const fn = q => doneSelf(recOf(uid), q), part = fn;
  ui.count = () => countSelf(recOf(uid));
  const warn = closed && !rec.submitted ? banner("응답이 마감되어 입력할 수 없습니다. 마감 연장이 필요하면 관리자에게 문의하세요.", "warn") : "";
  if (ui.report || (rec.submitted && !ui.form)) {
    return warn + hero("개인 진단 리포트", rec.submitted ? "자가진단을 제출했습니다." : "제출 전 미리보기입니다. 아직 제출되지 않았습니다.", count, questions.length) + (demoSwitch(userOf(uid) || {}) ? `<div class="top-tools">${demoSwitch(userOf(uid) || {})}</div>` : "") + reportCard(e, "owner") + planCard(e) +
      `<div class="actions"><button class="quiet" data-act="form">문항 보기</button>${rec.submitted ? (canWithdraw(rec) ? '<button class="quiet" data-act="withdraw">제출 취소하고 수정하기</button>' : "") : `<button class="primary" data-act="submit" ${closed ? "disabled" : ""}>자가진단 제출</button>`}</div>`;
  }
  const gi = ui.dom, qs = questions.filter(q => q.domain === domains[gi]);
  const openId = ui.openQ && qs.some(q => q.id === ui.openQ) ? ui.openQ : (qs.find(q => !fn(q)) || qs[0]).id; ui.openQ = openId;
  const lvText = v => numbers.includes(v) ? "Lv." + v : (special[v] || "미선택");
  const tabs = `<nav class="dtabs" aria-label="역량 선택">${domains.map((d, i) => { const dq = questions.filter(q => q.domain === d), n = dq.filter(fn).length; return `<button class="dtab${gi === i ? " active" : ""}" style="--dm:${DOMAIN_COLORS[i]}" data-domain="${i}"${gi === i ? ' aria-current="true"' : ""}><span class="dot"></span><span>${d}</span><span class="cnt${n === dq.length ? " full" : ""}">${n}/${dq.length}</span></button>`; }).join("")}</nav>`;
  const cards = qs.map((q, idx) => {
    const a = answerOf(rec, q), done = fn(q), d = f => `data-a="${q.id}" data-f="${f}"`;
    if (q.id !== openId) {
      const state = done ? `<span class="qs-chip">현재 ${lvText(a.current)}</span><span class="qs-arrow">→</span><span class="qs-chip">목표 ${lvText(a.target)}</span>` : a.current ? `<span class="qs-chip">현재 ${lvText(a.current)}</span><em>목표 입력 전</em>` : "<em>입력 전</em>";
      return `<article class="card qcard qsum${done ? " done" : ""}" style="--dm:${domainColor(q.domain)}"><button type="button" class="qsum-btn" data-act="open-q" data-q="${q.id}" aria-expanded="false"><span class="qs-no">${done ? "✓" : String(q.id).padStart(2, "0")}</span><span class="qs-title">${esc(q.title)}</span><span class="qs-state">${state}</span><span class="qs-open" aria-hidden="true">펼치기</span></button></article>`;
    }
    const nextLabel = idx < qs.length - 1 ? "다음 문항 →" : gi < domains.length - 1 ? `다음 역량(${domains[gi + 1]}) →` : "제출하러 가기";
    /* 점진적 공개: 처음에는 '현재 수준'만 보인다. 카드를 누르면 그 수준의 설명과 함께 '2년 뒤 목표'가 생기고,
       목표를 누르면 설명과 함께 행동기준 확인·사례 입력·다음 문항으로 이어지는 칸이 생긴다 */
    const fr = ui.fresh && ui.fresh.q === q.id ? ui.fresh.f : "";
    const left = levelPicker(q, "current", a.current, locked);
    const right = a.current ? `<div class="${fr === "current" ? "reveal " : ""}lv-col">${levelPicker(q, "target", a.target, locked)}</div>` : "";
    const step3 = a.current && a.target ? `<div class="${fr === "target" ? "reveal " : ""}qmore"><div class="nudge ok">마지막으로 <b>행동기준을 확인</b>하고 이 문항을 마무리하세요</div>${recordPanel(rec, q, "owner", locked)}` +

      `<details class="more"${a.evidence || (a.files || []).length ? " open" : ""}><summary>수행 사례 남기기 <span class="muted small">(선택)</span></summary>${field("수행 사례와 확인 자료", a.evidence, d("evidence"), locked)}${uploadBox(q, a, locked)}</details>` +
      `<div class="qfoot"><span class="qdone">✓ 이 문항 입력 완료</span><button class="primary small" data-act="next-q" data-q="${q.id}">${nextLabel}</button></div></div>` : "";
    return card(q, `<div class="lv-fields${a.current ? "" : " single"}">${left}${right}</div>${step3}`, true, false);
  }).join("");
  const bar = `<div class="actionbar"><div class="ab-left"><span class="saved">입력은 자동 저장됩니다</span><span class="ab-prog"><progress id="count-p" value="${count}" max="${questions.length}" aria-label="완료 문항"></progress><span id="ab-n">${count}/${questions.length} 완료</span></span></div><div class="ab-right"><button class="quiet" data-domain="${gi - 1}" ${gi === 0 ? "disabled" : ""}>← 이전 역량</button><button class="quiet" data-domain="${gi + 1}" ${gi >= domains.length - 1 ? "disabled" : ""}>다음 역량 →</button>${rec.submitted ? pill("제출 완료", "ok") : `<button class="primary" data-act="submit" ${closed ? "disabled" : ""}>자가진단 제출</button>`}</div></div>`;
  const me0 = userOf(uid) || {}, rd = round(), dd0 = rd.close ? dday(rd.close) : null;
  const sub = `<b>${esc(me0.name)} 선생님</b> · ${esc(rd.name)}${dd0 ? ` · 응답 마감 ${esc(rd.close)} ${pill(closed ? "마감" : dd0.text, dd0.cls)}` : ""}`;
  const html = warn + hero("자가진단", sub, count, questions.length) + `<div class="top-tools">${phaseBanner()}${demoSwitch(me0)}</div>` + (count < questions.length && !rec.submitted ? howto() : "") + tabs + `<div>${cards}</div>` + bar;
  ui.fresh = null; return html;
}

/* ---------- 평가 결과 (피평가자) ---------- */
function resultPageInner() {
  const e = myEntry(); if (!e) return noEntry();
  const rec = e.record, uid = e.uid;
  if (!rec.submitted) return hero("진단결과 미리보기", "지금까지 입력한 내용으로 만든 미리보기입니다. 아직 제출되지 않았습니다.", countSelf(rec), questions.length) + reportCard(e, "owner") + planCard(e);
  if (!rec.notified) return hero("평가 결과", "평가가 진행 중입니다. 결과가 통보되면 이 화면에서 확인하고 이의제기할 수 있습니다.") +
    `<section class="card"><p>지정 평가자 · <b>${esc(e.rater ? nameOf(e.rater) : "미배정 (관리자가 배정하면 시작됩니다)")}</b></p><p class="muted">제출일 · ${fmtDT(rec.submittedAt)}</p>${canWithdraw(rec) ? '<div class="actions"><button class="quiet" data-act="withdraw">제출 취소하고 수정하기</button></div>' : ""}</section>` + reportCard(e, "owner") + planCard(e);
  const holds = questions.filter(q => resultOf(rec, q.id).level === "hold");
  const summary = [...numbers, "before", "role", "chance", "hold"].map(v => pill(`${display(v)} · ${questions.filter(q => resultOf(rec, q.id).level === v).length}건`)).join("");
  const rows = questions.map(q => [esc(q.domain + " · " + q.title), esc(display(answerOf(rec, q).current)), esc(display(resultOf(rec, q.id).level)), esc(display(answerOf(rec, q).target)), esc(resultOf(rec, q.id).reason || "") + (rec.supplements[q.id] ? `<p class="muted">보완: ${esc(rec.supplements[q.id])}</p>` : "")]);
  const supp = rec.final ? "" : holds.map(q => `<details class="scale current-card"><summary>문항 ${q.id} · 확인 보류 보완</summary><p>${esc(q.title)}</p><form data-form="supplement" data-uid="${uid}" data-id="${q.id}">${field("보완 자료", rec.supplements[q.id], 'name="detail" required')}<div class="actions"><button class="quiet">${rec.supplements[q.id] ? "보완 수정" : "보완 저장"}</button></div></form>${rec.supplements[q.id] ? '<p class="muted">저장했습니다. 평가자가 재판정하면 결과가 바뀝니다.</p>' : ""}</details>`).join("");
  const avail = questions.filter(q => !rec.appeals[q.id]);
  const appealForm = !rec.final && avail.length ? `<form data-form="appeal" data-uid="${uid}"><label class="block">대상 문항<select name="id" required><option value="">선택</option>${avail.map(q => `<option value="${q.id}">${q.id}. ${esc(q.title)}</option>`).join("")}</select></label>${field("요청 이유와 보완 근거", "", 'name="reason" required')}<div class="actions"><button class="primary">재검토 요청</button></div></form>` : "";
  const appeals = Object.entries(rec.appeals).map(([id, a]) => { const q = questions.find(x => x.id === Number(id)); return `<article class="card"><h3>${esc(q.title)}</h3><p>최초 판정 · ${esc(display((rec.reviews[id] || {}).level))}</p><p>요청 사유 · ${esc(a.reason)}</p>${a.resolved ? `${pill("재검토 완료 · " + display(a.level), "ok")}<p>${esc(a.decision)}</p>` : pill("재검토 대기", "warn")}</article>`; }).join("");
  const iv = rec.interview.saved ? `<section class="card"><h2>성장 면담기록</h2><p><b>다음 행동</b> · ${esc(rec.interview.action)}</p><p><b>필요한 지원과 담당자</b> · ${esc(rec.interview.support)}</p><p class="muted">면담일 ${esc(rec.interview.date)} · 점검일 ${esc(rec.interview.check)}</p></section>` : "";
  return hero("평가 결과", `평가자 ${esc(nameOf(e.rater))} · ${rec.final ? "결과가 확정되었습니다." : "확정 전까지 이의제기할 수 있습니다."}`) + phaseBanner() +
    `<section class="card"><h2>진행 단계</h2>${stepper(rec)}<div class="inline-list">${summary}</div></section>` +
    `<section class="card"><h2>개인 통보 내역 ${rec.final ? pill("확정", "ok") : pill("통보 완료")}</h2>${table(["문항", "자가진단", "평가 확인", "목표", "판정 사유"], rows)}${supp}</section>` +
    (appealForm || appeals ? `<section class="card"><h2>이의제기</h2>${rec.final ? '<p class="muted">결과가 확정되어 더 이상 요청할 수 없습니다.</p>' : ""}${appealForm}</section>${appeals}` : "") + iv +
    reportCard(e, "owner") + planCard(e);
}

function resultPage() {
  const e = myEntry(), top = resultTabs("result") + (demoSwitch(me() || {}) ? `<div class="top-tools">${demoSwitch(me() || {})}</div>` : "");
  if (!e) return top + resultPageInner();
  return top + resultPageInner();
}

/* ---------- 도움말 (공용) ---------- */
function faqPage() {
  return helpTabs("faq") + hero("도움말", "자주 묻는 질문입니다.") + `<section class="card faq">${FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</section>`;
}

/* ---------- 파일럿 안내 (공용, 정적) ---------- */
function pilotPage() {
  const li = a => `<ul>${a.map(t => `<li>${t}</li>`).join("")}</ul>`;
  return helpTabs("pilot") + hero("파일럿 안내", "이 목업이 무엇을 보여 주고, 실제 파일럿에서 무엇을 어떻게 검증할지 정리했습니다.") + banner("이 화면은 <b>목업</b>입니다. 계정·저장소·업무 기록 연동은 가상이며, 입력 내용은 이 브라우저에만 저장됩니다.", "warn") +
    `<div class="grid2"><section class="card"><h2>목업이 보여 주는 것</h2>${li([
      "<b>공통 4수준 척도</b>(기초 수행–기대수준 충족–변화 기여–전문성 공유·지원)로 6개 역량 12개 행동을 진단하는 방식",
      "<b>업무 기록으로 행동기준을 확인</b>하는 방식 — 교원이 평가용 서류를 따로 쓰지 않고, 상담일지 같은 기록에서 행동기준을 확인함 (여기서는 가상 기록)",
      "자가진단 → 평가자 판정(자기점수 비공개) → 통보 → 이의제기 → 면담의 <b>전체 흐름</b>",
      "자가진단·행동기준 확인·평가자 확인을 나란히 보는 <b>측정 일치도</b> (운영자기능)"])}</section>` +
    `<section class="card"><h2>실제 파일럿에서 검증할 것</h2>${li([
      "기록으로 확인한 행동기준과 교원 자가진단, 평가자 판단이 얼마나 일치하는지",
      "같은 사례를 평가자들이 판정했을 때 Lv.1·2, Lv.2·3, Lv.3·4 경계가 같은 뜻으로 읽히는지",
      "역할 해당 없음·수행 기회 없음·기초 수행 전 응답의 사유와 비율",
      "문항별 난이도 차이와 기록이 부족한 문항(어떤 기록 필드가 더 필요한지)"])}</section></div>` +
    `<section class="card"><h2>목업과 실제 구축의 차이</h2>${table(["구분", "목업(지금)", "파일럿·정식 운영"], [
      ["저장", "이 브라우저(localStorage)", "서버·DB (여러 교원이 각자 접속)"],
      ["로그인", "체험용 계정 선택 (보안 아님)", "학교 계정 연동, 권한별 열람"],
      ["업무 기록", "수준 선택 시 자동 표시 (가상 기록)", "상담일지·결재·행사 기록 등 학내 시스템 연동"],
      ["수준 확인", "자가진단 + 평가자 판정, 기록은 참고 자료", "기록 필드에서 행동기준 확인, 사람은 이의·예외 확인"],
      ["인사 반영", "없음", "첫해는 문항별 결과 중심, 반영 수준은 파일럿 후 결정"]])}</section>` +
    `<section class="card"><h2>일정(제안)</h2>${table(["시기", "내용"], [
      ["2026.12 ~ 2027.2", "업적평가계획(안) 확정, IT 1차 조정(상담일지 구조화 우선 검토)"],
      ["2027.4 ~ 5", "IT 2차 조정, 적용 모니터링"],
      ["2027.6", "자가진단 시범 운영(인사 미반영) + 기록 대조, 평가자 조율 세션"],
      ["2027.8", "반영 수준(전면·일부·참고) 결정"]])}</section>`;
}

/* ---------- 사용자 동작 ---------- */
Object.assign(ACTIONS, {
  form() { ui.form = true; ui.report = false; render(); },
  report() { ui.report = false; location.hash = "#/result"; window.scrollTo(0, 0); },
  print() { window.print(); },
  "open-q"(t) { ui.openQ = Number(t.dataset.q); render(); const n = document.querySelector(".qcard:not(.qsum)"); if (n && n.scrollIntoView) n.scrollIntoView({ behavior: "smooth", block: "start" }); },
  "next-q"(t) {
    const id = Number(t.dataset.q), q = questions.find(x => x.id === id), qs = questions.filter(x => x.domain === q.domain), i = qs.findIndex(x => x.id === id);
    if (i < qs.length - 1) ui.openQ = qs[i + 1].id;
    else if (ui.dom < domains.length - 1) { ui.dom += 1; ui.openQ = null; }
    else { ui.openQ = null; render(); const b = document.querySelector(".actionbar"); if (b && b.scrollIntoView) b.scrollIntoView({ behavior: "smooth", block: "end" }); say("모든 역량을 확인했습니다. 아래에서 제출하세요."); return; }
    render(); const n = document.querySelector(".qcard:not(.qsum)"); if (n && n.scrollIntoView) n.scrollIntoView({ behavior: "smooth", block: "start" });
  },
  "rm-file"(t) {
    const id = Number(t.dataset.q), i = Number(t.dataset.i);
    mutate(() => { const e = session && session.role === "user" ? entryOf(session.uid) : null; if (!e || e.record.submitted || isClosed(round())) return; const a = e.record.answers[id]; if (a && a.files) a.files.splice(i, 1); });
    ui.openQ = id; render(); say("자료를 삭제했습니다. 자동 저장되었습니다.");
  },
  "pull-record"(t) {
    const id = Number(t.dataset.q), q = questions.find(x => x.id === id);
    mutate(() => { const e = session && session.role === "user" ? entryOf(session.uid) : null; if (!e || e.record.submitted || isClosed(round()) || !q) return; pullRecord(e.record, e.uid, q); logAct(`행동기준 확인(문항 ${id}, 목업)`, e.uid); });
    say("기록으로 행동기준을 확인했습니다. (목업)");
  },
  "pull-all"() {
    mutate(() => { const e = session && session.role === "user" ? entryOf(session.uid) : null; if (!e || e.record.submitted || isClosed(round())) return; questions.forEach(q => pullRecord(e.record, e.uid, q)); logAct("행동기준 전체 확인(목업)", e.uid); });
    say("12개 문항의 행동기준을 기록으로 확인했습니다. (목업)");
  },
  async submit() {
    const e0 = entryOf(session.uid);
    if (e0 && !e0.record.submitted) {
      const miss = questions.filter(q => !doneSelf(e0.record, q));
      if (miss.length) { ui.dom = domains.indexOf(miss[0].domain); ui.report = false; ui.form = true; render(); window.scrollTo(0, 0); say(`아직 입력하지 않은 문항이 ${miss.length}개 있습니다. 해당 역량으로 이동했습니다.`); return; }
    }
    const r = await ask({ title: "자가진단을 제출할까요?", body: "제출하면 평가자에게 전달되고 수정할 수 없습니다. (평가자가 평가를 시작하기 전에는 ‘제출 취소’로 되돌릴 수 있습니다.)", ok: "제출" });
    if (!r) return;
    const ok = mutate(() => {
      const e = entryOf(session.uid), rec = e && e.record;
      if (!rec || rec.submitted || isClosed(round()) || countSelf(rec) !== questions.length) return false;
      rec.submitted = true; rec.submittedAt = new Date().toISOString(); logAct("자가진단 제출", e.uid); return true;
    }, false);
    if (!ok) { say("제출할 수 없는 상태입니다. 모든 문항과 마감일을 확인하세요."); render(); return; }
    ui.report = true; ui.form = false; render(); window.scrollTo(0, 0); say("자가진단을 제출했습니다.");
  },
  async withdraw() {
    const r = await ask({ title: "제출을 취소할까요?", body: "다시 수정한 뒤 제출할 수 있습니다.", ok: "제출 취소" });
    if (!r) return;
    const ok = mutate(() => {
      const e = entryOf(session.uid), rec = e && e.record;
      if (!rec || !canWithdraw(rec)) return false;
      rec.submitted = false; rec.submittedAt = ""; logAct("제출 취소(본인)", e.uid); return true;
    }, false);
    ui.form = true; ui.report = false; render(); say(ok ? "제출을 취소했습니다. 수정 후 다시 제출하세요." : "평가가 시작되어 제출을 취소할 수 없습니다. 관리자에게 문의하세요.");
  }
});
Object.assign(FORMS, {
  appeal(f, v) {
    const id = v.get("id"), reason = String(v.get("reason") || "").trim();
    const ok = mutate(() => {
      const e = entryOf(session.uid), rec = e && e.record;
      if (!rec || !rec.notified || rec.final || !id || !reason || rec.appeals[id]) return false;
      rec.appeals[id] = { reason, resolved: false }; logAct(`이의제기 접수(문항 ${id})`, e.uid); return true;
    });
    say(ok ? "재검토 요청을 접수했습니다." : "대상 문항과 요청 이유를 확인하세요.");
  },
  supplement(f, v) {
    const id = f.dataset.id, detail = String(v.get("detail") || "").trim();
    const ok = mutate(() => {
      const e = entryOf(session.uid), rec = e && e.record;
      if (!rec || rec.final || resultOf(rec, id).level !== "hold" || !detail) return false;
      rec.supplements[id] = detail; logAct(`보완 자료 제출(문항 ${id})`, e.uid); return true;
    });
    say(ok ? "보완 자료를 저장했습니다. 평가자가 재판정할 수 있습니다." : "보완 내용을 입력하세요.");
  }
});
