/* 목업 자동 테스트 (jsdom). 실행: tests 폴더에서  npm i  →  node mock-flow.test.js
   앱 폴더(../dist)를 임시 웹서버로 띄워 가상 브라우저에서 전체 흐름을 검증한다. */
const { JSDOM, VirtualConsole } = require("jsdom");
const http = require("http"), fs = require("fs"), path = require("path");
const root = path.resolve(__dirname, "../dist");
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split("?")[0]).replace(/^\/$/, "/index.html")); fs.readFile(f, (e, d) => { if (e) { r.statusCode = 404; r.end(); } else { r.setHeader("content-type", f.endsWith(".html") ? "text/html;charset=utf-8" : f.endsWith(".css") ? "text/css" : "text/javascript;charset=utf-8"); r.end(d); } }); });
const errors = []; const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
srv.listen(0, async () => {
  const vc = new VirtualConsole(); vc.on("jsdomError", e => errors.push(e.message));
  const dom = await JSDOM.fromURL(`http://localhost:${srv.address().port}/`, { runScripts: "dangerously", resources: "usable", virtualConsole: vc, pretendToBeVisual: true,
    beforeParse(w) { w.matchMedia = () => ({ matches: false, addEventListener() { }, removeEventListener() { } }); w.scrollTo = () => { }; w.confirm = () => true; } });
  const w = dom.window, d = w.document, $ = s => d.querySelector(s), $$ = s => [...d.querySelectorAll(s)]; await sleep(800);
  const T = () => $("#content").textContent;
  const click = async s => { (typeof s === "string" ? $(s) : s).dispatchEvent(new w.MouseEvent("click", { bubbles: true })); await sleep(40); };
  const st = () => JSON.parse(w.localStorage.getItem("cheonggang-v6-mock"));
  const go = async h => { w.location.hash = h; await sleep(120); };
  const pick = async (id, f, v) => { const r = $(`input[data-a="${id}"][data-f="${f}"][value="${v}"]`); r.checked = true; r.dispatchEvent(new w.Event("input", { bubbles: true })); await sleep(15); };
  const tab = async i => { await click(`.dtab[data-domain="${i}"]`); };
  const nav = () => $$("#nav .nav").map(b => b.querySelector(".lbl").firstChild.textContent.trim());
  const openCards = () => $$(".qcard:not(.qsum)").length;
  const radios = f => $$(`input[data-f="${f}"]`).length;

  ok(!!st() && st().v === 6, "v6 시연 데이터 생성: 구성원 " + (st() && st().users.length) + "명");
  // 메뉴 4개
  ok(nav().join(",") === "자가진단,진단결과,도움말,운영자기능", "메뉴 4개: " + nav().join(" / "));
  // 첫 화면 = 처음 시작하는 교원의 자가진단
  ok($("#crumb").textContent === "자가진단" && T().includes("홍길동 교수님") && $("#count-n").textContent.startsWith("0") && !!$(".howto"), "첫 화면: 처음 시작하는 교원(홍길동 0/12) + 3단계 안내");
  // 점진적 공개 ① 문항은 하나만 펼쳐짐
  ok(openCards() === 1 && $$(".qsum").length === 1, "문항 1개만 펼쳐짐, 나머지는 요약 행");
  // 점진적 공개 ② 처음에는 현재 수준만 — 카드를 누르면 설명·다음 행동 칸이 생성된다
  ok(radios("current") === 7 && radios("target") === 0 && !$(".lv-desc") && !$(".nudge") && !$("details.records") && !!$(".lv-fields.single") && !$(".qsteps"), "클릭 전: 현재 수준 카드만 보이고 설명·목표·행동기준 확인 칸은 아직 없음");
  ok($$(".lv-alt").length === 1 && $(".lv-alt .tip").dataset.tip.includes("선택 사항") && $(".lv-alt").textContent.includes("기회는 있었으나 아직 하지 않음") && $(".lv-alt").textContent.includes("역할은 있으나 최근 1년간"), "'기초 수행 전·역할 해당 없음·수행 기회 없음'은 선택 사항임과 각각의 뜻을 칸에 풀어 씀");
  ok(!$("details.scale") && !$("#content .mock-tag"), "자가진단 카드에 '4수준 행동기준 보기' 중복 없음, 목업 표시 없음");
  await pick(1, "current", "1");
  ok(!!$(".lv-desc.lv1") && $(".lv-desc.lv1").textContent.includes("기초 수행") && $(".lv-desc.lv1").textContent.includes("정기상담"), "'기초 수행'을 누르면 상세 행동기준 설명 칸이 생성됨");
  ok(radios("target") === 6 && radios("current") === 7 && !$(".lv-fields.single") && !$(".nudge"), "현재 수준을 고르면 오른쪽에 2년 뒤 목표 선택이 생김(좌우 비교, 별도 안내 문구 없음)");
  ok(!$(".qmore"), "목표를 고르기 전에는 행동기준 확인·사례 입력 칸이 없음");
  await pick(1, "target", "3");
  ok($$(".lv-desc").length === 2 && !!$(".lv-desc.lv3"), "목표를 누르면 목표 수준 설명 칸도 생성됨(좌: 현재 · 우: 목표)");
  ok(!!$(".qmore") && !!$("details.records") && !!$("details.more") && !!$('[data-act="next-q"]') && !$(".nudge:not(.ok)"), "이어서 행동기준 확인·사례 입력·다음 문항 칸이 생성됨");
  ok(T().includes("행동기준 확인") && !/일상 기록|기록 기준 추정|기록 추정|신호/.test(T()), "문구: '행동기준 확인', AI스러운 표현 없음");
  ok($("details.records").open && $$(".signals li").length === 4 && $$(".signals li.on").length >= 1 && !T().includes("기록으로 확인하기") && !$('[data-act="pull-record"]'), "행동기준 확인 칸: 버튼 없이 자동으로 확인된 기준에 체크가 표시됨(모든 문항 동일)");
  await pick(1, "current", "2");
  ok(!!$(".lv-desc.lv2") && $(".lv-desc.lv2").textContent.includes("기대수준 충족") && $$(".lv-desc").length === 2, "수준을 바꾸면 설명 칸이 해당 수준 기준으로 바뀜");
  await click('[data-act="next-q"]');
  ok($(".qcard:not(.qsum)").dataset.q === "2" && $("#count-n").textContent.startsWith("1") && radios("target") === 0, "다음 문항: 앞 문항은 요약으로 접히고 새 문항은 다시 현재 수준만 보임");
  await pick(2, "current", "before");
  ok(!!$(".alt.on") && $(".alt.on").textContent.includes("기초 수행 전") && !!$(".lv-desc") && $(".lv-desc").textContent.includes("기초 수행 전") && radios("target") === 6, "'기초 수행 전' 선택 → 상태로 기록되고 설명 칸이 생기며 목표 선택이 이어짐");
  await tab(3);
  ok($(".dtab.active").textContent.includes("창의연구") && openCards() === 1, "완료 전에도 다른 역량 탭으로 바로 이동");
  await click('[data-act="submit"]'); await sleep(80);
  ok($(".dtab.active").textContent.includes("학생지향") && $("#toast").textContent.includes("입력하지 않은 문항"), "미완료 제출 → 비어 있는 역량으로 안내");

  // 진단결과 / 도움말 / 운영자기능
  await click('#nav [data-go="result"]');
  ok($("#crumb").textContent === "진단결과" && !T().includes("다음 할 일") && !$(".steps") && T().includes("영역별 현재 수준"), "진단결과: 다음 할 일·진행 단계 없이 영역별 현재 수준부터 보임");
  await click('#nav [data-go="faq"]');
  ok($("#crumb").textContent === "도움말 · 자주 묻는 질문" && $$(".subtab").length === 2, "도움말: 질문 + 파일럿 안내 탭");
  await click('.subtab[data-go="pilot"]');
  ok(T().includes("목업이 보여 주는 것"), "도움말 안 파일럿 안내");
  await click('#nav [data-go="home"]');
  ok($("#crumb").textContent === "운영자기능 · 운영 홈" && $$(".subtab").length === 6, "운영자기능: 하위 탭 6개");
  await click('.subtab[data-go="agreement"]');
  ok(T().includes("행동기준 확인 ↔ 평가자 확인") && /\d+%/.test(T()), "측정 일치도: " + $$(".kpi .n").map(x => x.textContent).join(", "));
  await click('#nav [data-go="self"]');
  ok($("#crumb").textContent === "자가진단" && T().includes("교수님"), "자가진단 메뉴로 교원 보기 복귀");

  // 김교수: 제출 완료 상태
  { const f0 = $("#faculty-view"); f0.value = "u-sample"; f0.dispatchEvent(new w.Event("change", { bubbles: true })); await sleep(150); }
  ok(T().includes("개인 진단 리포트"), "제출한 교원은 리포트 표시");
  await click('[data-act="form"]');
  ok($$(".lv input:not(:disabled)").length === 0, "제출한 교원은 입력 잠금");
  // 최도현: 이미 입력한 문항
  { const f1 = $("#faculty-view"); f1.value = "u-p3"; f1.dispatchEvent(new w.Event("change", { bubbles: true })); await sleep(150); }
  ok(T().includes("최도현 교수님") && radios("current") === 7 && radios("target") === 6 && !!$(".qmore") && $$(".lv-desc").length === 2, "이미 입력한 문항을 열면 현재·목표 설명과 행동기준 확인 칸이 모두 펼쳐져 있음");

  // 홍길동: 12문항 완료 후 제출
  { const f2 = $("#faculty-view"); f2.value = "u-p4"; f2.dispatchEvent(new w.Event("change", { bubbles: true })); await sleep(150); }
  for (let di = 0; di < 6; di++) {
    await tab(di);
    for (let k = 0; k < 2; k++) {
      const sum = $(".qsum:not(.done) .qsum-btn"); if (sum) await click(sum);
      const id = $(".qcard:not(.qsum)").dataset.q;
      if ($(`input[data-a="${id}"][data-f=current]`) && !$(`input[data-a="${id}"][data-f=current]:checked`)) await pick(id, "current", "2");
      if ($(`input[data-a="${id}"][data-f=target]`) && !$(`input[data-a="${id}"][data-f=target]:checked`)) await pick(id, "target", "3");
    }
  }
  ok($("#count-n").textContent.startsWith("12") && $$(".dtab .cnt.full").length === 6, "12문항 완료, 모든 탭 완료 표시: " + $("#count-n").textContent);
  await click('[data-act="submit"]'); await sleep(80);
  ok(T().includes("개인 진단 리포트") && !!$("svg.radar") && T().includes("행동기준 확인"), "제출 → 리포트(레이더, 행동기준 확인 열)");

  // 평가자(이평가)
  w.sessionStorage.setItem("cheonggang-v6-session", JSON.stringify({ role: "user", uid: "u-rater" })); w.location.hash = "#/result"; await sleep(60); w.dispatchEvent(new w.Event("hashchange")); await sleep(150);
  ok($$(".subtab").map(b => b.textContent).join(",") === "내 진단결과,평가 대상자", "평가자는 진단결과 안에 '평가 대상자' 탭");
  await click('.subtab[data-go="raters"]');
  ok($("#crumb").textContent === "진단결과 · 평가 대상자" && T().includes("담당 교원"), "평가 대상자: " + $("#crumb").textContent);
  await go("#/review/u-p2");
  ok(!!$("details.scale"), "평가자 화면에는 판정에 필요한 수준별 행동기준 설명이 유지됨");
  ok(T().includes("박지연 선생님 평가") && T().includes("행동기준 확인") && !T().includes("현재 수준"), "평가 화면: 행동기준 확인 표시, 자가진단 수준 비공개");
  for (let g = 0; g < 60; g++) {
    let acted = false;
    for (const c of $$("article.card")) { const lv = c.querySelector("select[data-rv]"), rs = c.querySelector("textarea[data-rv]");
      if (lv && !lv.value) { lv.value = "3"; lv.dispatchEvent(new w.Event("input", { bubbles: true })); await sleep(15); acted = true; break; }
      if (rs && !rs.value.trim()) { rs.value = "근거 확인"; rs.dispatchEvent(new w.Event("input", { bubbles: true })); rs.dispatchEvent(new w.Event("change", { bubbles: true })); await sleep(15); acted = true; break; } }
    if (acted) continue; const fw = $("[data-forward]"); if (fw && !fw.disabled) { await click(fw); continue; } break;
  }
  const nb = $('[data-act="notify"]'); ok(nb && !nb.disabled, "평가 12문항 완료 → 통보 버튼 활성");
  await click(nb); await sleep(80); ok(T().includes("통보 내역"), "결과 통보");
  console.log("errors:", errors.length ? errors : "none"); ok(errors.length === 0, "스크립트 오류 없음");
  console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED"); srv.close(); process.exit(fails ? 1 : 0);
});
