/* 목업 자동 테스트 (jsdom). 실행: tests 폴더에서  npm i  →  node <파일>.js
   앱 폴더(../dist)를 임시 웹서버로 띄워 가상 브라우저에서 흐름을 검증한다. */
const nodepath = require("path");
const root = nodepath.resolve(__dirname, "../dist");
const KEY = "cheonggang-v6-mock", SKEY = "cheonggang-v6-session";
const { JSDOM, VirtualConsole } = require("jsdom");
const http = require("http"), fs = require("fs"), path = require("path");

const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split("?")[0]).replace(/^\/$/, "/index.html")); fs.readFile(f, (e, d) => { if (e) { r.statusCode = 404; r.end(); } else { r.setHeader("content-type", f.endsWith(".html") ? "text/html;charset=utf-8" : f.endsWith(".css") ? "text/css" : "text/javascript;charset=utf-8"); r.end(d); } }); });
const errors = []; let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
srv.listen(0, async () => {
  const vc = new VirtualConsole(); vc.on("jsdomError", e => errors.push(e.message));
  const dom = await JSDOM.fromURL(`http://localhost:${srv.address().port}/`, { runScripts: "dangerously", resources: "usable", virtualConsole: vc, pretendToBeVisual: true, beforeParse(w) { w.matchMedia = () => ({ matches: false, addEventListener() { }, removeEventListener() { } }); w.scrollTo = () => { }; w.confirm = () => true; try { w.sessionStorage.setItem(SKEY, JSON.stringify({ role: "admin" })); } catch (e) { } } });
  const w = dom.window, d = w.document, $ = s => d.querySelector(s), $$ = s => [...d.querySelectorAll(s)]; await sleep(800);
  const st = () => JSON.parse(w.localStorage.getItem("cheonggang-v6-mock"));
  const click = async s => { (typeof s === "string" ? $(s) : s).dispatchEvent(new w.MouseEvent("click", { bubbles: true })); await sleep(40); };
  const form = async (sel, vals) => { const f = $(sel); for (const [k, v] of Object.entries(vals)) { const e = f.elements[k]; if (e.type === "checkbox") e.checked = v; else e.value = v; } f.dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true })); await sleep(80); };
  const check = async (e, v) => { e.checked = v; e.dispatchEvent(new w.Event("change", { bubbles: true })); await sleep(20); };

  await click('[data-go="members"]');
  await form("form[data-form=bulk]", { text: "하민수, 게임스쿨, N, hm01\n하지연, 방송스쿨, N, hj01\n윤도현, 게임스쿨, N, yd01", enroll: true });
  // 평가자 등록 → 담당 지정 패널 자동 열림
  await form("form[data-form=add-user]", { name: "한평가", school: "게임스쿨", loginId: "hv01", evaluator: true, enroll: true });
  ok(!!$("[data-act=assign-save]") && $("#content").textContent.includes("한평가 평가자의 담당 교수 지정"), "평가자 등록 직후 담당 교수 지정 패널이 열림");
  const hv = st().users.find(u => u.loginId === "hv01");
  const cand = $$("[data-asg]").map(x => x.dataset.asg); const byName = n => st().users.find(u => u.name === n).id;
  ok(!cand.includes(hv.id), "평가자 본인은 후보 목록에 없음");
  // 검색 + 체크 + 저장
  await check($(`[data-asg="${byName("하민수")}"]`), true); await check($(`[data-asg="${byName("하지연")}"]`), true);
  ok($("[data-act=assign-save]").textContent.includes("2명"), "저장 버튼에 선택 수 표시");
  await click("[data-act=assign-save]");
  const raterOf = n => st().rounds[0].people.find(p => p.uid === byName(n)).rater;
  ok(raterOf("하민수") === hv.id && raterOf("하지연") === hv.id && !raterOf("윤도현"), "선택한 2명만 배정됨");
  ok($(`[data-act=assign-open][data-id="${hv.id}"]`).textContent.includes("(2명)"), "목록에 담당 인원 표시");
  // 일괄: 검색 결과 모두 선택(게임스쿨 검색)
  await click(`[data-act=assign-open][data-id="${hv.id}"]`);
  const q = $('[data-q="assign"]'); q.value = "윤"; q.dispatchEvent(new w.Event("input", { bubbles: true })); await sleep(40);
  await click("[data-act=assign-all]"); await click("[data-act=assign-save]");
  ok(raterOf("윤도현") === hv.id && raterOf("하민수") === hv.id, "검색 결과 모두 선택 → 3명 담당, 기존 유지");
  // 해제
  await click(`[data-act=assign-open][data-id="${hv.id}"]`); await check($(`[data-asg="${byName("하지연")}"]`), false); await click("[data-act=assign-save]");
  ok(!raterOf("하지연") && raterOf("하민수") === hv.id, "체크 해제 시 미배정으로 복귀");
  // 통보된 사람은 잠금
  await new Promise(r => { const s = JSON.parse(w.localStorage.getItem("cheonggang-v6-mock")); s.rounds[0].people.find(p => p.uid === byName("하민수")).record.notified = true; w.localStorage.setItem("cheonggang-v6-mock", JSON.stringify(s)); r(); });
  await click('[data-go="progress"]'); await click('[data-go="members"]');
  await click(`[data-act=assign-open][data-id="${hv.id}"]`);
  ok($(`[data-asg="${byName("하민수")}"]`).disabled, "통보된 교수는 변경 불가(비활성)");
  // 다른 평가자 → 이전 평가자 교수를 가져오기
  await click("[data-act=assign-cancel]");
  await click(`[data-act=assign-open][data-id="u-rater"]`);
  const row = $(`[data-asg="${byName("윤도현")}"]`).closest("tr"); ok(/현재 평가자 한평가/.test(row.textContent), "다른 평가자 담당 교수는 '현재 평가자'로 표시");
  await check($(`[data-asg="${byName("윤도현")}"]`), true); await click("[data-act=assign-save]");
  ok(raterOf("윤도현") === "u-rater", "다른 평가자 담당으로 변경");
  ok(st().log.some(l => /평가자 배정/.test(l.action)), "처리 기록에 남음");
  ok(errors.length === 0, "오류 없음 " + errors.join(";"));
  console.log(fails ? "FAILED" : "ALL PASSED"); srv.close(); process.exit(fails ? 1 : 0);
});


