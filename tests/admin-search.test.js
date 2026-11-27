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
  const click = async s => { $(s).dispatchEvent(new w.MouseEvent("click", { bubbles: true })); await sleep(30); };
  // 구성원 3명 추가
  await click('[data-go="members"]');
  const f = $("form[data-form=bulk]"); f.elements.text.value = "하민수, 게임스쿨, N, hm01\n하지연, 방송스쿨, N, hj01\n윤도현, 게임스쿨, N, yd01"; f.dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true })); await sleep(80);
  const type = async (sel, v, composing = false) => { const i = $(sel); i.value = v; const e = new w.Event("input", { bubbles: true }); Object.defineProperty(e, "isComposing", { value: composing }); i.dispatchEvent(e); await sleep(30); };
  const rows = () => d.querySelector("#content tbody") ? d.querySelector("#content tbody").querySelectorAll("tr").length : 0;
  // 구성원 검색
  const before = rows();
  await type('[data-q="members"]', "하");
  ok(rows() === 2 && d.activeElement && d.activeElement.dataset.q === "members" && $('[data-q="members"]').value === "하", "구성원: '하' 검색 2명, 입력창 포커스·값 유지");
  await type('[data-q="members"]', "yd01"); ok(rows() === 1, "구성원: ID로 검색");
  await type('[data-q="members"]', ""); ok(rows() === before, "구성원: 지우면 전체 복귀");
  // 진행 현황 검색
  await click('[data-go="progress"]');
  const all = rows(); ok(all >= 3, "진행 현황 전체 " + all + "명");
  await type('[data-q="progress"]', "하", true); ok(rows() === all, "한글 조합 중에는 다시 그리지 않음");
  $('[data-q="progress"]').dispatchEvent(Object.assign(new w.Event("compositionend", { bubbles: true }))); await sleep(30);
  ok(rows() === 2, "조합 종료 후 필터 적용(하 → 2명)");
  ok(/2명 표시/.test($("#content").textContent), "표시 건수 안내");
  await type('[data-q="progress"]', "없는이름"); ok(/표시할 내용이 없습니다/.test($("#content").textContent), "결과 없음 안내");
  await click('[data-act="clear-filter"]'); ok(rows() === all && $('[data-q="progress"]').value === "", "필터 해제 시 검색어도 초기화");
  ok(errors.length === 0, "오류 없음 " + errors.join(";"));
  console.log(fails ? "FAILED" : "ALL PASSED"); srv.close(); process.exit(fails ? 1 : 0);
});


