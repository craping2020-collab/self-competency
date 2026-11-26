"use strict";
const key = "cheonggang-v4-pilot";
const labels = ["수행 경험 없음", "지원받아 수행", "독립 수행", "상황에 맞춰 조정", "교내 공유·확산"];
const special = {"role":"역할 해당 없음","chance":"수행 기회 없음","hold":"확인 보류","none":"수행 계획 없음","later":"미정"};
const stages = ["자기진단", "타인평가", "이의제기·면담", "운영 관리"];
const domains = [...new Set(questions.map(q => q.domain))];
const fresh = () => ({answers:{}, reviews:{}, appeals:{}, interview:{}, priorities:[], submitted:false, notified:false, final:false});
let state = fresh();
try { state = {...state,...JSON.parse(localStorage.getItem(key) || "{}")}; } catch {}
let stage = 0, domain = 0, report = false;
const el = id => document.getElementById(id);
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const display = v => special[v] || (labels[Number(v)-1] && v ? v + "단계 · " + labels[Number(v)-1] : "—");
const answer = q => state.answers[q.id] || {};
const reviewed = q => state.reviews[q.id] || {};
const completed = q => answer(q).current && answer(q).target;
function save() { try { saveRoster(); } catch { say("브라우저 저장을 사용할 수 없습니다."); } }
let messageTimer;
function say(s) { el("toast").textContent=s; clearTimeout(messageTimer); messageTimer=setTimeout(()=>el("toast").textContent="",3300); }
function options(values, value) { return '<option value="">선택</option>'+values.map(v=>'<option value="'+v+'"'+(v===value?' selected':'')+'>'+esc(display(v))+'</option>').join(""); }
const numbers = ["1","2","3","4","5"];
function select(label, values, value, data, disabled=false) { return '<label>'+label+'<select '+data+(disabled?" disabled":"")+'>'+options(values,value)+'</select></label>'; }
function field(label,value,data,disabled=false) { return '<label class="block">'+label+'<textarea '+data+(disabled?" disabled":"")+'>'+esc(value)+'</textarea></label>'; }
function hero(title,detail,metric,total) { return '<section class="hero"><div><h1>'+title+'</h1><p>'+detail+'</p></div>'+(total?'<div class="count"><strong>'+metric+' / '+total+'</strong><span>완료 문항</span><progress value="'+metric+'" max="'+total+'" aria-label="완료 문항"></progress></div>':'')+'</section>'; }
function table(head, rows) { return '<div class="scroll"><table class="report-table"><thead><tr>'+head.map(v=>'<th scope="col">'+v+'</th>').join("")+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(v=>'<td>'+v+'</td>').join("")+'</tr>').join("")+'</tbody></table></div>'; }
function panel() { return '<section class="card panel"><h2>역량 목록</h2><div class="domain-list">'+domains.map((d,i)=>'<button class="domain '+(domain===i?"active":"")+'" data-domain="'+i+'">'+d+' <span>'+questions.filter(q=>q.domain===d&&(stage===0?completed(q):reviewed(q).level)).length+'/2</span></button>').join("")+'</div></section>'; }
function card(q, content) { return '<article class="card"><div class="question-id">'+q.domain+' · 문항 '+String(q.id).padStart(2,"0")+'</div><h3>'+esc(q.title)+'</h3><details class="scale"><summary>5단계 행동기준 보기</summary><ol>'+q.levels.map((v,i)=>'<li><b>'+labels[i]+'</b> · '+esc(v)+'</li>').join("")+'</ol><p class="muted">확인 자료 · '+esc(q.proof)+'</p></details>'+content+'</article>'; }
function self() {
 if(!person())return hero("자기진단","운영 관리에서 진단대상을 등록하세요.")+'<button class="primary" data-stage="3">운영 관리</button>';
 const count=questions.filter(completed).length;
 if(report) return hero("개인 진단 리포트","문항별 현재 수준과 목표를 살펴보고 개발할 행동을 두 개까지 선택하세요.",count,12)+
 '<section class="card"><h2>나의 진단 결과</h2>'+table(["행동 문항","현재","2년 뒤 목표","개발 우선"],questions.map(q=>[esc(q.domain+" · "+q.title),esc(display(answer(q).current))+(answer(q).sharing?'<br><span class="pill">교내 공유 기회 없었음</span>':""),esc(display(answer(q).target)),'<input type="checkbox" aria-label="'+esc(q.title)+' 개발 우선" data-priority="'+q.id+'" '+(state.priorities.includes(q.id)?"checked":"")+'>']))+'</section>'+
 '<section class="card">'+field("다음에 할 행동과 필요한 지원",state.plan,'data-plan')+'<div class="actions"><button class="quiet" data-action="form">문항 보기</button><button class="quiet" data-action="print">인쇄 / PDF</button></div></section>';
 const cards=questions.filter(q=>q.domain===domains[domain]).map(q=>{
 const a=answer(q), data=f=>'data-answer="'+q.id+'" data-field="'+f+'"';
 const description = value => q.levels[Number(value)-1];
 const selected = (value, heading) => description(value)?'<p><b>'+heading+'</b> · '+esc(description(value))+'</p>':"";
 const anchors = selected(a.current,"현재 기준")+selected(a.target,"목표 기준");
 const sharing = ["3","4"].includes(a.current)||a.sharing;
 return card(q,'<div class="fields">'+select("현재 수준",[...numbers,"role","chance"],a.current,data("current"),state.submitted)+select("2년 뒤 목표",["2","3","4","5","none","later"],a.target,data("target"),state.submitted)+'</div>'+(anchors?'<div class="selection-notes">'+anchors+'</div>':"")+
 (sharing?'<label class="share-option"><input type="checkbox" '+data("sharing")+' '+(a.sharing?"checked":"")+(state.submitted?" disabled":"")+'><span><strong>(최근 1년 내) 교내 공유 기회 없었음</strong><small>현재 수준을 그대로 기록하고, 공유 기회가 필요했는지 따로 남깁니다.</small></span></label>':"")+
 field("수행 사례와 확인 자료 (선택)",a.evidence,data("evidence"),state.submitted));
 }).join("");
 return hero("자기진단","최근 1년의 실제 행동을 떠올리고, 현재 수준과 2년 뒤 목표를 선택하세요.",count,12)+'<div class="layout"><div>'+cards+'<div class="actions"><button class="quiet" data-action="report">결과 미리보기</button>'+(state.submitted?'<span class="pill">제출 완료</span>':domain<5?'<button class="primary" data-domain="'+(domain+1)+'">다음 역량</button>':'<button class="primary" data-action="submit">자기진단 제출</button>')+'</div></div>'+panel()+'</div>';
}
function review() {
 if(!person()?.rater) return hero("타인평가","운영 관리에서 이 교원에게 평가자를 배정하세요.")+'<button class="primary" data-stage="3">운영 관리</button>';
 if(!state.submitted) return hero("타인평가","교원이 자기진단을 제출하면 평가를 시작할 수 있습니다.")+'<button class="primary" data-stage="0">자기진단으로</button>';
 const done=questions.filter(q=>reviewed(q).level&&reviewed(q).reason?.trim()).length;
 if(state.notified) {
  const summary=[...numbers,"role","chance","hold"].map(v=>'<span class="pill">'+esc(display(v))+' · '+questions.filter(q=>resultOf(state,q.id).level===v).length+'건</span>').join("");
  return hero("평가 결과","1명 체험 데이터의 문항 분포입니다.",done,12)+'<section class="card"><h2>결과 집계</h2><div class="inline-list">'+summary+'</div></section><section class="card"><h2>개인 통보 내역</h2>'+table(["문항","자기진단","평가 확인","목표","판정 사유"],questions.map(q=>[esc(q.domain+" · "+q.title),esc(display(answer(q).current)),esc(display(state.appeals[q.id]?.resolved ? state.appeals[q.id].level : reviewed(q).level)),esc(display(answer(q).target)),esc(resultOf(state,q.id).reason)+(state.supplements?.[q.id]?'<p class="muted">보완: '+esc(state.supplements[q.id])+'</p>':"")]))+supplementForms()+'<div class="actions"><button class="primary" data-stage="2">이의제기·면담으로</button></div></section>';
 }
 const cards=questions.filter(q=>q.domain===domains[domain]).map(q=>{
  const r=reviewed(q), data=f=>'data-review="'+q.id+'" data-field="'+f+'"';
  return card(q,'<p class="guide"><b>교원이 남긴 사례</b> · '+esc(answer(q).evidence||"입력된 사례 없음")+'</p>'+select("평가 확인 수준",[...numbers,"role","chance","hold"],r.level,data("level"))+field("판정 이유 또는 보완 요청",r.reason,data("reason")));
 }).join("");
 return hero("타인평가","교원이 남긴 사례를 같은 행동기준에 대입해 확인 수준과 이유를 기록하세요.",done,12)+'<div class="layout"><div>'+cards+'<div class="actions">'+(domain<5?'<button class="quiet" data-domain="'+(domain+1)+'">다음 역량</button>':'')+'<button class="primary" data-action="notify">결과 통보 처리</button></div></div>'+panel()+'</div>';
}
function followup() {
 if(!state.notified) return hero("이의제기·면담","평가 결과가 통보되면 재검토를 요청하고 면담을 기록할 수 있습니다.")+'<button class="primary" data-stage="1">타인평가로</button>';
 const entries=Object.entries(state.appeals).map(([id,a])=>{
  const q=questions.find(x=>x.id===Number(id));
  return '<article class="card"><h3>'+esc(q.title)+'</h3><p>최초 판정 · '+esc(display(reviewed(q).level))+'</p><p>요청 사유 · '+esc(a.reason)+'</p>'+(a.resolved?'<span class="pill">재검토 완료 · '+esc(display(a.level))+'</span><p>'+esc(a.decision)+'</p>':'<form data-resolve="'+id+'">'+select("재검토 후 확인 수준",[...numbers,"role","chance","hold"],reviewed(q).level,'name="level" required')+field("재검토 이유","",'name="decision" required')+'<div class="actions"><button class="primary">재검토 결과 통보</button></div></form>')+'</article>';
 }).join("");
 const available=questions.filter(q=>!state.appeals[q.id]);
 return hero("이의제기·면담","재검토 요청과 다음 개발 행동을 기록하세요.")+
 '<section class="card"><h2>이의제기 <span class="pill">'+(state.final?"결과 확정":"통보 완료")+'</span></h2>'+
 (!state.final&&available.length?'<form id="appeal"><label class="block">대상 문항<select name="id" required><option value="">선택</option>'+available.map(q=>'<option value="'+q.id+'">'+q.id+'. '+esc(q.title)+'</option>').join("")+'</select></label>'+field("요청 이유와 보완 근거","",'name="reason" required')+'<div class="actions"><button class="primary">재검토 요청</button></div></form>':'')+
 (!state.final?'<div class="actions"><button class="quiet" data-action="final">평가 확정 처리</button></div>':'')+'</section>'+entries+
 '<section class="card"><h2>성장 면담기록</h2>'+field("다음 행동",state.interview.action,'data-interview="action"')+field("필요한 지원과 담당자",state.interview.support,'data-interview="support"')+
 '<div class="fields">'+["면담일","점검일"].map((v,i)=>'<label>'+v+'<input type="date" data-interview="'+(i?"check":"date")+'" value="'+esc(state.interview[i?"check":"date"])+'"></label>').join("")+'</div><div class="actions"><button class="primary" data-action="interview">면담기록 저장</button></div></section>';
}
function render() {
 el("crumb").textContent=(person()?person().name+" · ":"")+stages[stage];
 el("nav").innerHTML=stages.map((s,i)=>'<button data-stage="'+i+'" class="nav '+(i===stage?"active":"")+'" '+(i===stage?'aria-current="step"':'')+'><span>'+(i+1)+'</span><span>'+s+'<small>'+["현재와 목표","확인과 통보","재검토와 발전계획","회차·등록·배정"][i]+'</small></span></button>').join("");
 el("content").innerHTML=[self,review,followup,admin][stage]();
}
function navigate(next) { stage=next; domain=0; report=false; render(); window.scrollTo(0,0); }
document.addEventListener("click",e=>{
 const b=e.target.closest("button"); if(!b)return;
 if(b.dataset.open){switchPerson(b.dataset.open);navigate(Number(b.dataset.view||0));return;}
 if(b.dataset.stage!==undefined){navigate(Number(b.dataset.stage));return;}
 if(b.dataset.domain!==undefined){domain=Number(b.dataset.domain);render();window.scrollTo(0,0);return;}
 if(b.id==="demo"){
  const id=idFor();
  let evaluator=roster.evaluators.find(e=>e.id==="sample-rater");
  if(!evaluator){evaluator={id:"sample-rater",name:"예시 평가자"};roster.evaluators.push(evaluator);}
  round().people.push({id,name:"예시 교원",school:"예시 스쿨",rater:evaluator.id,record:fresh()});
  switchPerson(id);
  for(const q of questions)state.answers[q.id]={current:q.id===11?"chance":q.id%3===0?"2":"3",target:"4",evidence:q.id===6?"지난 학기 과제 지침을 수정하고 학생 의견을 검토했습니다.":"파일럿용 가상 사례"};
  state.submitted=true;save();navigate(0);say("예시 자기진단을 불러왔습니다.");return;
 }
 switch(b.dataset.action){
 case "open-round":
  openedRound=round().id;
  render();
  document.querySelector('#add-person input')?.focus();
  return;
 case "form":report=false;break;
 case "report":report=true;break;
 case "print":window.print();return;
 case "submit":{
  const missing=questions.find(q=>!completed(q));
  if(missing){domain=domains.indexOf(missing.domain);render();say("현재 수준과 목표를 모두 선택하세요.");return;}
  state.submitted=true;report=true;say("자기진단을 제출했습니다.");break;
 }
 case "notify":{
  const missing=questions.find(q=>!reviewed(q).level||!reviewed(q).reason?.trim());
  if(missing){domain=domains.indexOf(missing.domain);render();say("모든 문항의 수준과 판정 이유를 입력하세요.");return;}
  state.notified=true;say("체험용 개인 결과를 통보 상태로 바꿨습니다.");break;
 }
 case "final":
  if(questions.some(q=>resultOf(state,q.id).level==="hold")){say("확인 보류 문항의 검토를 먼저 완료하세요.");return;}
  if(Object.values(state.appeals).some(a=>!a.resolved)){say("접수된 이의제기를 먼저 처리하세요.");return;}
  state.final=true;say("평가 결과를 확정했습니다.");break;
 case "interview":
  if(!state.interview.action?.trim()||!state.interview.support?.trim()||!state.interview.date||!state.interview.check){say("다음 행동, 지원과 담당자, 면담일 및 점검일을 입력하세요.");return;}
  if(state.interview.check<state.interview.date){say("점검일은 면담일 이후로 선택하세요.");return;}
  state.interview.saved=true;say("면담기록을 저장했습니다.");break;
 default:return;
 }
 save();render();
});
document.addEventListener("input",e=>{
 const t=e.target,d=t.dataset;
 if(t.id==="active-round"){saveRoster();roster.round=t.value;openedRound=null;roster.active="";switchPerson(round().people[0]?.id||"");render();return;}
 if(d.assign){const assigned=round().people.find(p=>p.id===d.assign);assigned.rater=t.value;saveRoster();render();return;}
 if(d.answer&&!state.submitted){const a=state.answers[d.answer]||={};a[d.field]=t.type==="checkbox"?t.checked:t.value;if(d.field==="current"&&(!["3","4"].includes(a.current)))a.sharing=false;}
 else if(d.review&&!state.notified){const r=state.reviews[d.review]||={};r[d.field]=t.value;}
 else if(d.interview){state.interview[d.interview]=t.value;state.interview.saved=false;}
 else if(d.plan!==undefined)state.plan=t.value;
 else if(d.priority){
  const id=Number(d.priority);
  if(t.checked&&state.priorities.length===2){t.checked=false;say("두 개까지 선택할 수 있습니다.");return;}
  state.priorities=t.checked?[...state.priorities,id]:state.priorities.filter(x=>x!==id);
 }else return;
 save();
 if(t.tagName==="SELECT"){
  render();
  const id=d.answer?"data-answer":"data-review", value=d.answer||d.review;
  if(value)document.querySelector('select['+id+'="'+value+'"][data-field="'+d.field+'"]')?.focus();
 }
});
document.addEventListener("submit",e=>{
 const form=e.target;
 if(handleAdminForm(form)||handleSupplement(form)){e.preventDefault();return;}
 if(form.id!=="appeal"&&!form.dataset.resolve)return;
 e.preventDefault();
 const values=new FormData(form);
 if(form.id==="appeal"){
  const id=values.get("id"),reason=values.get("reason").trim();
  if(!reason||state.final||state.appeals[id]){say("대상과 요청 사유를 확인하세요.");return;}
  state.appeals[id]={reason,resolved:false};
  say("재검토 요청을 접수했습니다.");
 }else{
  const id=form.dataset.resolve,decision=values.get("decision").trim();
  if(!decision||state.final||state.appeals[id].resolved){say("재검토 이유를 확인하세요.");return;}
  Object.assign(state.appeals[id],{level:values.get("level"),decision,resolved:true});
  say("재검토 결과를 기록했습니다.");
 }
 save();render();
});
