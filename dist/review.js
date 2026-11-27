"use strict";
/* 평가자 화면: 평가 대상자 목록 · 평가하기 · 재검토 · 확정 · 면담기록 */
function ratersPageInner() {
  const u = me(), r = round(), mine = r.people.filter(p => p.rater === u.id);
  const wait = mine.filter(p => p.record.submitted && !p.record.notified).length;
  const pending = mine.filter(p => p.record.notified && !p.record.final).length;
  const fin = mine.filter(p => p.record.final).length;
  const rows = mine.map(p => {
    const usr = userOf(p.uid) || {}, na = nextAction(p, "rater");
    return [`<b>${esc(usr.name)}</b>`, esc(usr.school), statusPill(statusOf(p.record)), esc(na.label),
      `<button class="${na.go ? "primary" : "quiet"} small" data-go="review/${p.uid}" ${p.record.submitted ? "" : "disabled"}>${p.record.submitted ? (na.btn || "열람") : "제출 대기"}</button>`];
  });
  return hero("평가 대상자", `관리자가 나를 평가자로 지정한 교원입니다. (${esc(r.name)})`) +
    `<div class="kpis">${kpi(mine.length, "담당 교원")}${kpi(wait, "평가 작성 대기")}${kpi(pending, "이의제기·확정 대기")}${kpi(fin, "확정 완료")}</div>` +
    `<section class="card">${table(["교원", "스쿨", "상태", "다음 할 일", ""], rows)}</section>`;
}

function reviewPageInner(uid) {
  const e = entryOf(uid);
  if (!e || e.rater !== session.uid) return hero("평가하기", "내가 평가자로 지정된 교원이 아닙니다.") + '<button class="primary" data-go="raters">평가 대상자로</button>';
  const rec = e.record, usr = userOf(uid) || {}, title = `${esc(usr.name)} 선생님 평가`;
  if (!rec.submitted) return hero(title, "교원이 자가진단을 제출하면 평가를 시작할 수 있습니다.") + '<button class="primary" data-go="raters">평가 대상자로</button>';
  const back = '<div class="actions"><button class="quiet" data-go="raters">← 평가 대상자</button></div>';

  /* 1) 평가 작성 */
  if (!rec.notified) {
    const fn = q => reviewDone(recOf(uid), q), part = q => (recOf(uid).reviews[q.id] || {}).level;
    ui.count = () => countReview(recOf(uid));
    const done = countReview(rec), visible = visibleQuestions(fn), current = (visible.find(q => !fn(q)) || {}).id;
    ui.gates.push({ sel: "[data-forward]", ok: () => domainDone(ui.dom, fn) }, { sel: "[data-act=notify]", ok: () => countReview(recOf(uid)) === questions.length });
    const cards = visible.map(q => {
      const rv = rec.reviews[q.id] || {}, d = f => `data-rv="${q.id}" data-f="${f}" data-uid="${uid}"`;
      return card(q, `<p class="guide"><b>교원이 남긴 사례</b> · ${esc(answerOf(rec, q).evidence || "입력된 사례 없음")}</p>${recordPanel(rec, q, "rater", true)}${select("평가 확인 수준", [...numbers, "before", "role", "chance", "hold"], rv.level, d("level"))}${field("판정 이유 또는 보완 요청", rv.reason, d("reason"))}`, current === q.id);
    }).join("");
    const last = ui.dom >= domains.length - 1;
    return hero(title, "교원이 남긴 사례와 기록으로 확인된 행동기준을 같은 기준에 대입해 확인 수준과 이유를 기록하세요. 교원의 자가진단 수준은 통보 후 대조됩니다.", done, questions.length) +
      `<div class="layout"><div>${cards}<div class="actions"><button class="quiet" data-go="raters">← 목록</button>${!last ? `<button class="quiet" data-domain="${ui.dom + 1}" data-forward ${domainDone(ui.dom, fn) ? "" : "disabled"}>다음 역량</button>` : ""}<button class="primary" data-act="notify" data-uid="${uid}" ${done === questions.length ? "" : "disabled"}>결과 통보 처리</button></div></div>${panel(fn, part)}</div>`;
  }

  /* 2) 통보 이후: 재검토 · 확정 · 면담 */
  const holds = questions.filter(q => resultOf(rec, q.id).level === "hold");
  const summary = [...numbers, "before", "role", "chance", "hold"].map(v => pill(`${display(v)} · ${questions.filter(q => resultOf(rec, q.id).level === v).length}건`)).join("");
  const rows = questions.map(q => [esc(q.domain + " · " + q.title), esc(display(answerOf(rec, q).current)), esc(display(resultOf(rec, q.id).level)), esc(display(answerOf(rec, q).target)), esc(resultOf(rec, q.id).reason || "") + (rec.supplements[q.id] ? `<p class="muted">교원 보완: ${esc(rec.supplements[q.id])}</p>` : "")]);
  const recheck = rec.final ? "" : holds.map(q => `<details class="scale ${rec.supplements[q.id] ? "current-card" : ""}"><summary>문항 ${q.id} · 확인 보류 재판정</summary><p>${esc(q.title)}</p>${rec.supplements[q.id] ? `<p><b>교원 보완 자료</b> · ${esc(rec.supplements[q.id])}</p><form data-form="recheck" data-uid="${uid}" data-id="${q.id}">${select("재판정 수준", [...numbers, "before", "role", "chance"], "", 'name="level" required')}${field("재판정 이유", "", 'name="reason" required')}<div class="actions"><button class="primary">재판정 반영</button></div></form>` : '<p class="muted">교원이 보완 자료를 제출하면 재판정할 수 있습니다.</p>'}</details>`).join("");
  const firstOpen = Object.keys(rec.appeals).find(k => !rec.appeals[k].resolved);
  const appeals = Object.entries(rec.appeals).map(([id, a]) => {
    const q = questions.find(x => x.id === Number(id));
    return `<article class="card${!a.resolved && id === firstOpen ? " current-card" : ""}"><h3>${esc(q.title)}</h3><p>최초 판정 · ${esc(display((rec.reviews[id] || {}).level))}</p><p>요청 사유 · ${esc(a.reason)}</p>${a.resolved ? `${pill("재검토 완료 · " + display(a.level), "ok")}<p>${esc(a.decision)}</p>` : `<form data-form="resolve" data-uid="${uid}" data-id="${id}">${select("재검토 후 확인 수준", [...numbers, "before", "role", "chance", "hold"], (rec.reviews[id] || {}).level, 'name="level" required')}${field("재검토 이유", "", 'name="decision" required')}<div class="actions"><button class="primary">재검토 결과 통보</button></div></form>`}</article>`;
  }).join("");
  const ivOpen = Boolean(rec.interview.open || rec.interview.saved || rec.interview.action || rec.final);
  const d = f => `data-iv="${f}" data-uid="${uid}"`;
  const iv = ivOpen ? `<section class="card ${rec.interview.saved ? "" : "current-card"}"><h2>성장 면담기록 ${rec.interview.saved ? pill("저장됨", "ok") : ""}</h2>${field("다음 행동", rec.interview.action, d("action"))}${field("필요한 지원과 담당자", rec.interview.support, d("support"))}<div class="fields">${["면담일", "점검일"].map((v, i) => `<label>${v}<input type="date" ${d(i ? "check" : "date")} value="${esc(rec.interview[i ? "check" : "date"])}"></label>`).join("")}</div><div class="actions"><button class="primary" data-act="save-interview" data-uid="${uid}">면담기록 저장</button></div></section>`
    : `<section class="card"><h2>성장 면담</h2><p class="muted">결과 통보 후 교원과 다음 개발 행동을 정하는 면담을 기록합니다.</p><div class="actions"><button class="primary" data-act="open-interview" data-uid="${uid}">성장 면담 시작</button></div></section>`;
  return hero(title, rec.final ? "결과가 확정되었습니다." : "이의제기를 처리하고 보류 문항을 정리한 뒤 평가를 확정하세요.") + back +
    `<section class="card"><h2>진행 단계</h2>${stepper(rec)}<div class="inline-list">${summary}</div></section>` +
    `<section class="card"><h2>통보 내역 ${rec.final ? pill("확정", "ok") : pill("통보 완료")}</h2>${table(["문항", "자가진단", "평가 확인", "목표", "판정 사유"], rows)}${recheck}${!rec.final ? `<div class="actions"><button class="primary" data-act="final" data-uid="${uid}">평가 확정 처리</button></div>` : ""}</section>` +
    appeals + iv + reportCard(e, "rater");
}

/* ---------- 평가자 동작 (모든 동작은 지정 평가자만 가능) ---------- */
const asRater = uid => { const e = entryOf(uid); return e && e.rater === session.uid && session.role === "user" ? e : null; };
Object.assign(ACTIONS, {
  async notify(t) {
    const r = await ask({ title: "결과를 통보할까요?", body: "통보하면 교원이 결과를 확인하고 이의제기할 수 있으며, 평가 내용은 더 이상 수정할 수 없습니다.", ok: "통보" });
    if (!r) return;
    const ok = mutate(() => { const e = asRater(t.dataset.uid); if (!e || !e.record.submitted || e.record.notified || countReview(e.record) !== questions.length) return false; e.record.notified = true; logAct("결과 통보", e.uid); return true; }, false);
    ui.dom = 0; render(); say(ok ? "결과를 통보했습니다." : "모든 문항의 수준과 이유를 입력하세요.");
  },
  async final(t) {
    const e0 = asRater(t.dataset.uid); if (!e0) return;
    if (hasHold(e0.record)) { say("확인 보류 문항의 재판정을 먼저 완료하세요."); return; }
    if (openAppeals(e0.record)) { say("접수된 이의제기를 먼저 처리하세요."); return; }
    const r = await ask({ title: "평가를 확정할까요?", body: "확정하면 이의제기와 재판정이 닫힙니다. 되돌리려면 관리자의 확정 해제가 필요합니다.", ok: "확정" });
    if (!r) return;
    const ok = mutate(() => { const e = asRater(t.dataset.uid); if (!e || !e.record.notified || e.record.final || hasHold(e.record) || openAppeals(e.record)) return false; e.record.final = true; logAct("평가 확정", e.uid); return true; });
    say(ok ? "평가 결과를 확정했습니다." : "확정할 수 없는 상태입니다.");
  },
  "open-interview"(t) { mutate(() => { const e = asRater(t.dataset.uid); if (e) e.record.interview.open = true; }); },
  "save-interview"(t) {
    const uid = t.dataset.uid, iv = recOf(uid).interview;
    if (!(iv.action || "").trim() || !(iv.support || "").trim() || !iv.date || !iv.check) { say("다음 행동, 지원과 담당자, 면담일 및 점검일을 입력하세요."); return; }
    if (iv.check < iv.date) { say("점검일은 면담일 이후로 선택하세요."); return; }
    const ok = mutate(() => { const e = asRater(uid); if (!e || !e.record.notified) return false; e.record.interview.saved = true; logAct("면담기록 저장", e.uid); return true; });
    say(ok ? "면담기록을 저장했습니다." : "저장할 수 없는 상태입니다.");
  }
});
Object.assign(FORMS, {
  resolve(f, v) {
    const id = f.dataset.id, uid = f.dataset.uid, decision = String(v.get("decision") || "").trim(), level = v.get("level");
    const ok = mutate(() => { const e = asRater(uid), a = e && e.record.appeals[id]; if (!a || e.record.final || a.resolved || !decision || !level) return false; Object.assign(a, { level, decision, resolved: true }); logAct(`이의제기 재검토 통보(문항 ${id})`, uid); return true; });
    say(ok ? "재검토 결과를 기록했습니다." : "재검토 이유를 확인하세요.");
  },
  recheck(f, v) {
    const id = f.dataset.id, uid = f.dataset.uid, level = v.get("level"), reason = String(v.get("reason") || "").trim();
    const ok = mutate(() => {
      const e = asRater(uid); if (!e || e.record.final || resultOf(e.record, id).level !== "hold" || !e.record.supplements[id] || !level || !reason) return false;
      const rec = e.record; rec.recheckHistory = rec.recheckHistory || {}; rec.recheckHistory[id] = resultOf(rec, id);
      if (rec.appeals[id] && rec.appeals[id].resolved) Object.assign(rec.appeals[id], { level, decision: reason }); else rec.reviews[id] = { level, reason };
      logAct(`보류 재판정(문항 ${id})`, uid); return true;
    });
    say(ok ? "재판정 결과를 반영했습니다." : "보완 근거와 판정 이유를 확인하세요.");
  }
});

const ratersPage = () => resultTabs("raters") + ratersPageInner();
const reviewPage = uid => resultTabs("raters") + reviewPageInner(uid);
