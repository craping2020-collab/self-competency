const rosterKey = key + "-roster";
function loadRoster() {
 let saved;
 try { saved = JSON.parse(localStorage.getItem(rosterKey)); } catch {}
 return saved?.rounds?.length ? saved : {
  round:"pilot", active:"sample", evaluators:[{id:"sample-rater",name:"예시 평가자"}],
  rounds:[{id:"pilot",name:"교원 역량진단 파일럿",people:[{id:"sample",name:"예시 교원",school:"예시 스쿨",rater:"sample-rater",record:state}]}]
 };
}
let roster = loadRoster();
let openedRound = null;
const round = () => roster.rounds.find(r=>r.id===roster.round);
const person = () => round().people.find(p=>p.id===roster.active);
state = person()?.record || fresh();
function saveRoster() {
 const p=person();
 if(p)p.record=state;
 try { localStorage.setItem(rosterKey,JSON.stringify(roster)); } catch { say("브라우저 저장을 사용할 수 없습니다."); }
}
function switchPerson(id) {
 saveRoster();
 roster.active=id;
 state=person()?.record || fresh();
 saveRoster();
}
const idFor = () => crypto.randomUUID?.() || Date.now().toString(36)+Math.random().toString(36).slice(2);
const nameOf = id => roster.evaluators.find(r=>r.id===id)?.name || "미배정";
function statusOf(r) {
 if(r.final)return "확정";
 if(Object.values(r.appeals).some(a=>!a.resolved))return "재검토 중";
 if(r.notified)return questions.some(q=>resultOf(r,q.id).level==="hold")?"보완 대기":"통보 완료";
 if(Object.keys(r.reviews).length)return "평가 중";
 return r.submitted?"제출 완료":"미제출";
}
function resultOf(r,id) {
 const appeal=r.appeals[id], review=r.reviews[id] || {};
 return appeal?.resolved ? {level:appeal.level,reason:appeal.decision} : review;
}
const input = (label,name,type="text")=>'<label class="block">'+label+'<input required maxlength="80" type="'+type+'" name="'+name+'"></label>';
function admin() {
 const r=round(), rows=r.people;
 const isOpen=openedRound===r.id;
 const hasResults=rows.some(p=>p.record.notified);
 const schools=[...new Set(rows.map(p=>p.school))];
 const schoolRows=schools.map(s=>{
  const group=rows.filter(p=>p.school===s);
  const records=group.filter(p=>p.record.notified).map(p=>p.record);
  return [esc(s),group.length,records.length,questions.map(q=>{
   const counts=numbers.map(n=>records.filter(record=>resultOf(record,q.id).level===n).length);
   const exceptions=["role","chance","hold"].map(n=>records.filter(record=>resultOf(record,q.id).level===n).length);
   return '<div>문항 '+q.id+' · 유효 '+counts.reduce((a,b)=>a+b,0)+' ('+counts.join('/')+') · 역할 없음 '+exceptions[0]+' · 기회 없음 '+exceptions[1]+' · 보류 '+exceptions[2]+'</div>';
  }).join("")];
 });
 return hero("운영 관리","회차를 개설하고, 교원과 평가자를 등록해 진행 상황을 확인하세요.")+
 '<section class="card"><h2>진단 회차</h2><label class="block">현재 회차<select id="active-round">'+roster.rounds.map(x=>'<option value="'+x.id+'"'+(x.id===r.id?" selected":"")+'>'+esc(x.name)+'</option>').join("")+'</select></label>'+
 '<p class="muted">'+(r.close?"응답 마감 "+esc(r.close)+" · ":"")+'문항 버전 v4</p>'+
 (!isOpen?'<div class="actions"><button class="primary" data-action="open-round">이 회차 열기</button></div>':"")+
 '<details><summary>새 회차 개설</summary><form id="add-round"><div class="fields">'+input("회차 이름","name")+input("응답 마감일","close","date")+'</div><div class="actions"><button class="primary">회차 개설</button></div></form></details></section>'+
 (!isOpen?"":'<section class="card"><h2>진단대상 등록</h2><form id="add-person"><div class="fields">'+input("교원 이름 또는 표시명","name")+input("소속 스쿨","school")+'</div><div class="actions"><button class="primary">대상자 등록</button></div></form></section>')+
 (!isOpen||!rows.length?"":'<section class="card"><h2>대상자별 진행 현황 <span class="pill">'+rows.length+'명 · 미배정 '+rows.filter(p=>!p.rater).length+'명</span></h2>'+
 '<details'+(roster.evaluators.length?"":" open")+'><summary>평가자 등록</summary><form id="add-rater">'+input("평가자 이름 또는 표시명","name")+'<div class="actions"><button class="primary">평가자 등록</button></div></form><p class="muted">'+esc(roster.evaluators.map(x=>x.name).join(" · ")||"등록된 평가자가 없습니다.")+'</p></details>'+
 table(["진단대상","스쿨","지정 평가자","진행 상태","화면 열기"],rows.map(p=>[
  esc(p.name),esc(p.school),'<select aria-label="'+esc(p.name)+' 평가자 배정" data-assign="'+p.id+'"><option value="">미배정</option>'+roster.evaluators.map(e=>'<option value="'+e.id+'"'+(e.id===p.rater?" selected":"")+'>'+esc(e.name)+'</option>').join("")+'</select>',
  '<span class="pill">'+statusOf(p.record)+'</span>','<button class="quiet" data-open="'+p.id+'">교원 화면</button> <button class="quiet" data-open="'+p.id+'" data-view="1" '+(p.rater&&p.record.submitted?"":"disabled")+'>평가 화면</button>'
 ]))+'</section>')+
 (isOpen&&hasResults?'<section class="card"><h2>스쿨별 평가 집계</h2><p class="muted">통보된 평가 기준. 괄호 안은 1~5단계 인원수이며 재검토 판정을 반영합니다.</p><details><summary>문항별 집계 보기</summary>'+
 table(["스쿨","대상","통보","문항별 결과"],schoolRows)+'</details></section>':"");
}
function handleAdminForm(form) {
 if(!["add-round","add-person","add-rater"].includes(form.id))return false;
 const f=new FormData(form), name=f.get("name").trim();
 if(!name){say("이름을 입력하세요.");return true;}
 const id=idFor();
 if(form.id==="add-round"){
  roster.rounds.push({id,name,close:f.get("close"),people:[]});
  roster.round=id;
  openedRound=id;
  switchPerson("");
 }else if(form.id==="add-person"){
  const school=f.get("school").trim();
  if(!school){say("소속 스쿨을 입력하세요.");return true;}
  round().people.push({id,name,school,rater:"",record:fresh()});
  if(!person())switchPerson(id);
 }else roster.evaluators.push({id,name});
 saveRoster();render();say("등록했습니다.");
 return true;
}
function supplementForms() {
 return questions.filter(q=>resultOf(state,q.id).level==="hold").map(q=>
 '<details class="scale"><summary>문항 '+q.id+' · 확인 보류 보완</summary><p>'+esc(q.title)+'</p>'+
 '<form data-supplement="'+q.id+'">'+field("교원 보완 자료",state.supplements?.[q.id],'name="detail" required')+
 '<div class="actions"><button class="quiet">보완 저장</button></div></form>'+
 (state.supplements?.[q.id]?'<form data-recheck="'+q.id+'">'+select("평가자 재판정", [...numbers,"role","chance"],"",'name="level" required')+
 field("재판정 이유","",'name="reason" required')+'<div class="actions"><button class="primary">재판정 통보</button></div></form>':"")+'</details>').join("");
}
function handleSupplement(form) {
 const id=form.dataset.supplement||form.dataset.recheck;
 if(!id)return false;
 const values=new FormData(form);
 if(state.final||resultOf(state,id).level!=="hold")return true;
 if(form.dataset.supplement){
  const detail=values.get("detail").trim();
  if(!detail){say("보완 내용을 입력하세요.");return true;}
  (state.supplements||={})[id]=detail;
 }else{
  const level=values.get("level"),reason=values.get("reason").trim();
  if(!state.supplements?.[id]||!level||!reason){say("보완 근거와 판정 이유를 확인하세요.");return true;}
  (state.recheckHistory||={})[id]=resultOf(state,id);
  if(state.appeals[id]?.resolved)Object.assign(state.appeals[id],{level,decision:reason});
  else state.reviews[id]={level,reason};
 }
 saveRoster();
 render();
 say(form.dataset.supplement?"보완을 저장했습니다. 평가자가 재판정할 수 있습니다.":"재판정 결과를 반영했습니다.");
 return true;
}
render();
