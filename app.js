const SHEET_ID = "1OiDT-mY-9lPxCguMSUqgCsm_Lr_p2G7RIYCRZpJ42Qo";
const SHEET_URLS = [
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`,
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=0`
];
const LESSONS = [["9:00","9:45"],["9:55","10:40"],["10:50","11:35"],["11:55","12:40"],["13:00","13:45"],["14:05","14:50"],["15:00","15:45"],["15:55","16:40"],["16:50","17:35"],["17:45","18:30"]];
const ASSIGNMENT_COLUMNS = [...Array.from({length:20},(_,i)=>i+4),...Array.from({length:17},(_,i)=>i+27),...Array.from({length:13},(_,i)=>i+48),...Array.from({length:8},(_,i)=>i+64)];
const $ = selector => document.querySelector(selector);
const normalize = value => String(value||"").toLocaleLowerCase("ru-RU").replaceAll("ё","е").trim().replace(/\s+/g," ");
let students = [];
let hsv = {h:350,s:.74,v:.74};
let tableSort = {key:null,direction:-1};
function setIcon(element,name){element.style.setProperty("--icon",`url("assets/icons/${name}.svg")`);}

function parseCSV(text) {
  const rows=[]; let row=[],cell="",quoted=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(quoted){if(ch==='"'&&text[i+1]==='"'){cell+='"';i++;}else if(ch==='"')quoted=false;else cell+=ch;}
    else if(ch==='"')quoted=true;
    else if(ch===","){row.push(cell);cell="";}
    else if(ch==="\n"){row.push(cell.replace(/\r$/,""));rows.push(row);row=[];cell="";}
    else cell+=ch;
  }
  if(cell.length||row.length){row.push(cell.replace(/\r$/,""));rows.push(row);}
  return rows;
}
function parseScore(value){const number=Number(String(value||"").replace(",","."));return Number.isFinite(number)?number:null;}
function loadStudents(rows){
  return rows.slice(3).filter(row=>row[1]&&row[1].trim()).map(row=>({
    name:row[1].trim(),surname:row[1].trim().split(/\s+/)[0],group:(row[72]||"").trim(),
    score:parseScore(row[73]),percent:parseScore(row[74]),semester:(row[75]||"").trim(),
    absences:ASSIGNMENT_COLUMNS.reduce((count,index)=>count+((row[index]||"").toLocaleUpperCase("ru-RU").includes("Н")?1:0),0)
  }));
}
function clockMinutes(){
  const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Moscow",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date());
  return Number(parts.find(part=>part.type==="hour").value)*60+Number(parts.find(part=>part.type==="minute").value);
}
function formatWait(minutes){const hours=Math.floor(minutes/60),rest=minutes%60;return hours?`${hours} ч${rest?` ${rest} мин`:""}`:`${rest} мин`;}
function renderSchedule(activeIndex=-1){
  $("#scheduleRows").innerHTML=LESSONS.map(([start,end],index)=>{
    const nextStart=LESSONS[index+1]?.[0];
    const breakMinutes=nextStart?nextStart.split(":").map(Number).reduce((hours,minutes)=>hours*60+minutes,0)-end.split(":").map(Number).reduce((hours,minutes)=>hours*60+minutes,0):null;
    const breakLabel=breakMinutes===null?"<strong>Конец</strong>":`<strong>${breakMinutes} мин</strong><small>перемена</small>`;
    return `<div class="schedule-row ${index===activeIndex?"active":""}"><span class="schedule-lesson">Урок ${index+1}</span><span class="schedule-time">${start} — ${end}</span><span class="schedule-duration">${breakLabel}</span></div>`;
  }).join("");
}
function setRange(start,end){
  const range=$("#timeRange");range.hidden=false;
  range.innerHTML=`<div><span>НАЧАЛО</span><strong>${start}</strong></div><i></i><div><span>КОНЕЦ</span><strong>${end}</strong></div>`;
}
function showNextSchoolDay(){
  const weekday=new Intl.DateTimeFormat("en-US",{timeZone:"Europe/Moscow",weekday:"short"}).format(new Date());
  const nextDay=weekday==="Fri"||weekday==="Sat"||weekday==="Sun"?"в понедельник":"завтра";
  $(".now-card").dataset.kind="next-day";
  $("#statusKicker").textContent="СЛЕДУЮЩИЙ УЧЕБНЫЙ ДЕНЬ";
  setIcon($("#statusIcon"),"arrow-up-right");
  $("#statusTitle").textContent=`Первый урок ${nextDay}`;
  $("#statusDescription").textContent="Показываю время начала и конца первого урока.";
  setRange(LESSONS[0][0],LESSONS[0][1]);
  $("#countdown").textContent="Начало первого урока";
  renderSchedule(-1);
}
function updateStatus(){
  const now=new Date(),minutes=clockMinutes();
  const weekday=new Intl.DateTimeFormat("en-US",{timeZone:"Europe/Moscow",weekday:"short"}).format(now);
  const isWeekend=weekday==="Sat"||weekday==="Sun";
  const card=$(".now-card"),range=$("#timeRange"),count=$("#countdown");
  if(isWeekend){showNextSchoolDay();return;}
  let current=-1,next=-1;
  LESSONS.forEach(([startText,endText],index)=>{
    const [sh,sm]=startText.split(":").map(Number),[eh,em]=endText.split(":").map(Number);
    const start=sh*60+sm,end=eh*60+em;
    if(minutes>=start&&minutes<end)current=index;
    if(next<0&&minutes<start)next=index;
  });
  card.dataset.kind="";range.hidden=false;
  if(current>=0){
    const [start,end]=LESSONS[current],[endHour,endMinute]=end.split(":").map(Number),remaining=endHour*60+endMinute-minutes;
    card.dataset.kind="lesson";$("#statusKicker").textContent="ИДЁТ УРОК";setIcon($("#statusIcon"),"book-open-check");
    $("#statusTitle").textContent=`${current+1}-й урок`;$("#statusDescription").textContent="Сейчас идёт занятие.";
    setRange(start,end);count.innerHTML=`До звонка: <em>${remaining} мин</em>`;renderSchedule(current);return;
  }
  if(next>=0){
    const [start,end]=LESSONS[next],[hour,minute]=start.split(":").map(Number),remaining=hour*60+minute-minutes;
    $("#statusKicker").textContent=next===0?"ДО УРОКОВ":"ПЕРЕМЕНА";setIcon($("#statusIcon"),"clock-3");
    $("#statusTitle").textContent=next===0?"Уроки ещё не начались":"Сейчас перемена";
    $("#statusDescription").textContent=`Следующий — ${next+1}-й урок.`;
    setRange(start,end);count.innerHTML=`До начала урока: <em>${formatWait(remaining)}</em>`;renderSchedule(-1);return;
  }
  showNextSchoolDay();
}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));}
function formatNumber(number){return new Intl.NumberFormat("ru-RU",{maximumFractionDigits:2}).format(number);}
function showResult(query){
  const box=$("#result"),key=normalize(query);if(!key)return;
  box.hidden=false;
  if(!students.length){box.className="result error";box.innerHTML='<div class="result-message">Журнал пока недоступен. Можно попробовать ещё раз чуть позже.</div>';return;}
  const matches=students.filter(student=>normalize(student.surname)===key);
  if(!matches.length){box.className="result error";box.innerHTML=`<div class="result-name">Фамилия «${escapeHtml(query.trim())}» не найдена</div>`;return;}
  if(matches.length>1){box.className="result";box.innerHTML=`<div class="result-name">Нашлось несколько человек</div><div class="result-message">${matches.map(student=>escapeHtml(student.name)).join(" · ")}. Уточни фамилию в таблице ниже.</div>`;return;}
  const student=matches[0];box.className="result";
  box.innerHTML=`<div class="result-name">${escapeHtml(student.name)}</div><div class="result-stats"><div class="stat"><span class="stat-label">Баллы</span><span class="stat-value">${student.score===null?"—":formatNumber(student.score)}</span></div><div class="stat"><span class="stat-label">Проценты</span><span class="stat-value">${student.percent===null?"—":`${formatNumber(student.percent)}%`}</span></div><div class="stat"><span class="stat-label">Группа</span><span class="stat-value">${escapeHtml(student.group||"—")}</span></div><div class="stat"><span class="stat-label">Пропуски</span><span class="stat-value">${student.absences} <small>Н</small></span></div></div>`;
}
function renderGradeTable(){
  const query=normalize($("#tableSearch").value),container=$("#tableRows");
  const previousPositions=new Map([...container.querySelectorAll(".student-row")].map(row=>[row.dataset.rowKey,row.getBoundingClientRect().top]));
  const rows=students.filter(student=>!query||normalize(student.name).includes(query));
  if(tableSort.key)rows.sort((a,b)=>{
    if(tableSort.key==="name")return a.name.localeCompare(b.name,"ru-RU",{sensitivity:"base"})*tableSort.direction;
    const av=a[tableSort.key],bv=b[tableSort.key];if(av===null)return 1;if(bv===null)return -1;if(av===bv)return a.name.localeCompare(b.name,"ru-RU");return(av-bv)*tableSort.direction;
  });
  container.innerHTML=rows.length?rows.map(student=>`<div class="student-row" role="row" data-row-key="${students.indexOf(student)}"><div class="student-name" role="cell"><strong>${escapeHtml(student.name)}</strong><small>${escapeHtml(student.group||"—")}</small></div><span class="student-score" role="cell">${student.score===null?"—":formatNumber(student.score)}</span><span class="student-percent" role="cell">${student.percent===null?"—":`${formatNumber(student.percent)}%`}</span><span class="student-absence" role="cell">${student.absences}</span></div>`).join(""):'<div class="table-empty">Ничего не найдено</div>';
  if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  [...container.querySelectorAll(".student-row")].forEach(row=>{
    const previous=previousPositions.get(row.dataset.rowKey),current=row.getBoundingClientRect().top;
    row.animate(previous===undefined?[
      {opacity:0,transform:"translateY(9px) scale(.99)"},{opacity:1,transform:"translateY(0) scale(1)"}
    ]:[
      {opacity:.72,transform:`translateY(${previous-current}px)`},{opacity:1,transform:"translateY(0)"}
    ],{duration:360,easing:"cubic-bezier(.22,.8,.24,1)"});
  });
}
async function fetchStudents(){
  const state=$("#dataState"),retry=$("#retryData"),label=state.querySelector("span:last-of-type");
  state.hidden=true;state.className="data-state";label.textContent="";retry.hidden=true;
  let lastError;
  for(const url of SHEET_URLS){
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
    try{
      const response=await fetch(url,{mode:"cors",cache:"no-store",signal:controller.signal});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const rows=parseCSV((await response.text()).replace(/^\uFEFF/,"")),loaded=loadStudents(rows);
      if(!loaded.length)throw new Error("Выгрузка таблицы пустая");
      students=loaded;renderGradeTable();state.hidden=true;return;
    }catch(error){lastError=error;}finally{clearTimeout(timeout);}
  }
  state.hidden=false;state.className="data-state error";label.textContent="Не удалось загрузить таблицу.";retry.hidden=false;
  console.error("Журнал недоступен:",lastError);clearTimeout(window.sheetRetryTimer);window.sheetRetryTimer=setTimeout(fetchStudents,30000);
}
function hexToHsv(hex){const value=hex.replace("#",""),r=parseInt(value.slice(0,2),16)/255,g=parseInt(value.slice(2,4),16)/255,b=parseInt(value.slice(4,6),16)/255,max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;let h=0;if(delta){if(max===r)h=60*(((g-b)/delta)%6);else if(max===g)h=60*((b-r)/delta+2);else h=60*((r-g)/delta+4);}return{h:(h+360)%360,s:max?delta/max:0,v:max};}
function hsvToHex({h,s,v}){const f=n=>{const k=(n+h/60)%6;return v-v*s*Math.max(Math.min(k,4-k,1),0);};return "#"+[f(5),f(3),f(1)].map(channel=>Math.round(channel*255).toString(16).padStart(2,"0")).join("");}
function paintAccent(){
  const hex=hsvToHex(hsv),rgb=hex.match(/[0-9a-f]{2}/gi).map(part=>parseInt(part,16));
  document.body.style.setProperty("--accent",hex);document.body.style.setProperty("--accent-light",hex);
  document.body.style.setProperty("--accent-rgb",rgb.join(", "));
  document.body.style.setProperty("--accent-soft",`rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, .16)`);
  $("#accentPreview").style.backgroundColor=hex;$("#accentSample").style.backgroundColor=hex;$("#accentHex").textContent=hex.toUpperCase();
  $("#hueRange").value=Math.round(hsv.h);$("#saturationField").style.setProperty("--picker-hue",`hsl(${hsv.h} 100% 50%)`);
  const handle=$(".picker-handle");handle.style.left=`${hsv.s*100}%`;handle.style.top=`${(1-hsv.v)*100}%`;
  $("#saturationField").setAttribute("aria-valuenow",String(Math.round((hsv.s+hsv.v)/2*100)));
  localStorage.setItem("zhopa.accent",hex);
}
function setSaturationFromPointer(event){
  const rect=$("#saturationField").getBoundingClientRect();hsv.s=Math.min(1,Math.max(0,(event.clientX-rect.left)/rect.width));hsv.v=1-Math.min(1,Math.max(0,(event.clientY-rect.top)/rect.height));paintAccent();
}
function positionAccentPanel(){
  const panel=$("#accentPanel"),rect=$("#accentToggle").getBoundingClientRect();
  const top=rect.bottom+10+panel.offsetHeight>innerHeight-12?Math.max(12,rect.top-panel.offsetHeight-10):rect.bottom+10;
  panel.style.top=`${top}px`;panel.style.right=`${Math.max(12,innerWidth-rect.right)}px`;
}
function setAccentPanel(open){
  const panel=$("#accentPanel"),button=$("#accentToggle");
  button.setAttribute("aria-expanded",String(open));
  if(open){document.body.append(panel);panel.classList.add("is-portaled");panel.hidden=false;positionAccentPanel();}
  else{panel.hidden=true;panel.classList.remove("is-portaled");panel.removeAttribute("style");$(".accent-picker").append(panel);}
}
function toggleGradesTable(){
  const panel=$("#gradesTable"),button=$("#tableToggle"),open=panel.hidden||!panel.classList.contains("expanded");
  button.setAttribute("aria-expanded",String(open));$("#tableToggleText").textContent=open?"Скрыть таблицу":"Вся таблица";
  if(open){
    renderGradeTable();panel.hidden=false;panel.style.maxHeight="0px";panel.getBoundingClientRect();panel.classList.add("expanded");
    requestAnimationFrame(()=>{panel.style.maxHeight=`${panel.scrollHeight}px`;panel.scrollIntoView({behavior:"smooth",block:"nearest"});});
  }else{
    panel.style.maxHeight=`${panel.scrollHeight}px`;panel.getBoundingClientRect();panel.classList.remove("expanded");panel.style.maxHeight="0px";
  }
}
function animateTheme(button){
  const rect=button.getBoundingClientRect();document.documentElement.style.setProperty("--theme-x",`${rect.left+rect.width/2}px`);document.documentElement.style.setProperty("--theme-y",`${rect.top+rect.height/2}px`);
  const apply=()=>{document.body.dataset.theme=document.body.dataset.theme==="light"?"dark":"light";localStorage.setItem("zhopa.theme",document.body.dataset.theme);const light=document.body.dataset.theme==="light";setIcon($("#themeIcon"),light?"moon":"sun");button.setAttribute("aria-label",light?"Включить тёмную тему":"Включить светлую тему");};
  if(document.startViewTransition&&!matchMedia("(prefers-reduced-motion: reduce)").matches)document.startViewTransition(apply);else apply();
}
function setup(){
  const body=document.body,savedTheme=localStorage.getItem("zhopa.theme")==="light"?"light":"dark",savedAccent=localStorage.getItem("zhopa.accent")||"#bd334c";
  body.dataset.theme=savedTheme;hsv=hexToHsv(/^#[0-9a-f]{6}$/i.test(savedAccent)?savedAccent:"#bd334c");paintAccent();
  setIcon($("#themeIcon"),savedTheme==="light"?"moon":"sun");
  $("#themeToggle").addEventListener("click",event=>animateTheme(event.currentTarget));
  $("#accentToggle").addEventListener("click",()=>setAccentPanel($("#accentToggle").getAttribute("aria-expanded")!=="true"));
  window.addEventListener("resize",()=>{if($("#accentToggle").getAttribute("aria-expanded")==="true")positionAccentPanel();});
  window.addEventListener("scroll",()=>{if($("#accentToggle").getAttribute("aria-expanded")==="true")positionAccentPanel();},true);
  $("#hueRange").addEventListener("input",event=>{hsv.h=Number(event.target.value);paintAccent();});
  const field=$("#saturationField");field.addEventListener("pointerdown",event=>{field.setPointerCapture(event.pointerId);setSaturationFromPointer(event);});field.addEventListener("pointermove",event=>{if(event.buttons)setSaturationFromPointer(event);});
  field.addEventListener("keydown",event=>{const step=event.shiftKey?.1:.025;if(event.key==="ArrowRight")hsv.s=Math.min(1,hsv.s+step);else if(event.key==="ArrowLeft")hsv.s=Math.max(0,hsv.s-step);else if(event.key==="ArrowUp")hsv.v=Math.min(1,hsv.v+step);else if(event.key==="ArrowDown")hsv.v=Math.max(0,hsv.v-step);else return;event.preventDefault();paintAccent();});
  document.addEventListener("click",event=>{if(!event.target.closest(".accent-picker")&&!event.target.closest("#accentPanel")&&$("#accentToggle").getAttribute("aria-expanded")==="true")setAccentPanel(false);});
  setIcon($("#expandIcon"),"chevron-down");
  setIcon($(".accent-chevron"),"chevron-down");
  $("#scheduleToggle").addEventListener("click",()=>{const card=$(".now-card"),button=$("#scheduleToggle"),open=!card.classList.contains("show-schedule");card.classList.toggle("show-schedule",open);$("#statusFace").setAttribute("aria-hidden",String(open));$("#scheduleFace").setAttribute("aria-hidden",String(!open));button.setAttribute("aria-expanded",String(open));button.setAttribute("aria-label",open?"Вернуться к статусу расписания":"Открыть расписание звонков");$("#scheduleToggleText").textContent=open?"К статусу":"Расписание";});
  const surnameInput=$("#surnameInput");
  surnameInput.value=localStorage.getItem("zhopa.surname")||"";
  surnameInput.addEventListener("input",()=>{const surname=surnameInput.value.trim();if(surname)localStorage.setItem("zhopa.surname",surname);else localStorage.removeItem("zhopa.surname");});
  $("#searchForm").addEventListener("submit",event=>{event.preventDefault();const surname=surnameInput.value.trim();if(surname)localStorage.setItem("zhopa.surname",surname);showResult(surname);});
  $("#tableToggle").addEventListener("click",toggleGradesTable);
  $("#gradesTable").addEventListener("transitionend",event=>{if(event.target!==event.currentTarget||event.propertyName!=="max-height")return;if(event.currentTarget.classList.contains("expanded"))event.currentTarget.style.maxHeight="none";else event.currentTarget.hidden=true;});
  $("#tableSearch").addEventListener("input",renderGradeTable);
  for(const key of ["name","score","percent","absences"]){const button=$(`#${key==="name"?"nameSort":key==="score"?"scoreSort":key==="percent"?"percentSort":"absenceSort"}`);button.addEventListener("click",()=>{if(tableSort.key===key)tableSort.direction*=-1;else tableSort={key,direction:key==="name"?1:-1};document.querySelectorAll("[data-sort]").forEach(control=>{control.classList.toggle("selected",control.dataset.sort===tableSort.key);control.querySelector(".sort-mark").textContent=control.dataset.sort===tableSort.key?(tableSort.direction<0?"↓":"↑"):"";});renderGradeTable();});}
  $("#retryData").addEventListener("click",fetchStudents);
}
setup();renderSchedule();updateStatus();setInterval(updateStatus,15000);fetchStudents();
