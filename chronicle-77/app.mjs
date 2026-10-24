import {categories,filterEvents,countByDecade,escapeHtml as esc} from './core.mjs';
const $=s=>document.querySelector(s);
const state={query:'',category:'',decade:'',year:'',sort:'asc'};
let events=[],expanded=false;
const params=new URLSearchParams(location.search);
for(const k of Object.keys(state))if(params.has(k))state[k]=params.get(k);
if(!categories.includes(state.category))state.category='';
if(!['asc','desc'].includes(state.sort))state.sort='asc';
if(state.decade&&!/^(194|195|196|197|198|199|200|201|202)0$/.test(state.decade))state.decade='';
function urlState(){const p=new URLSearchParams();Object.entries(state).forEach(([k,v])=>{if(v&&!(k==='sort'&&v==='asc'))p.set(k,v)});history.replaceState(null,'',`${location.pathname}${p.size?'?'+p:''}${location.hash}`)}
function init(){
 $('#total-count').textContent=events.length;
 const years=[...new Set(events.map(e=>e.year))].sort((a,b)=>a-b);
 if(state.year&&!years.includes(Number(state.year)))state.year='';
 $('#year').insertAdjacentHTML('beforeend',years.map(y=>`<option value="${y}">${y}年</option>`).join(''));
 $('#search').value=state.query;$('#year').value=state.year;$('#sort').value=state.sort;
 $('#categories').innerHTML=['全部主题',...categories].map((c,i)=>`<button type="button" data-category="${i?c:''}" aria-pressed="false"><span class="cat-dot"></span>${c}</button>`).join('');
 const counts=countByDecade(events);
 $('#decades').innerHTML=`<button type="button" data-decade="">全部年代 <span>${events.length}</span></button>`+Object.entries(counts).sort((a,b)=>Number(a[0])-Number(b[0])).map(([d,n])=>`<button type="button" data-decade="${d}">${d==='1940'?'1949':d.slice(0,3)+'0s'}<span>${n}</span></button>`).join('');
 $('#filters').addEventListener('submit',e=>e.preventDefault());
 $('#search').addEventListener('input',e=>{state.query=e.target.value;render()});
 $('#year').addEventListener('change',e=>{state.year=e.target.value;state.decade='';render()});
 $('#sort').addEventListener('change',e=>{state.sort=e.target.value;render()});
 $('#categories').addEventListener('click',e=>{const b=e.target.closest('button');if(b){state.category=b.dataset.category;render()}});
 $('#decades').addEventListener('click',e=>{const b=e.target.closest('button');if(b){state.decade=b.dataset.decade;state.year='';$('#year').value='';render()}});
 $('#reset').addEventListener('click',reset);$('#empty-reset').addEventListener('click',reset);
 $('#toggle-all').addEventListener('click',()=>{expanded=!expanded;document.querySelectorAll('.event').forEach(el=>el.open=expanded);$('#toggle-all').textContent=expanded?'收起全部':'展开全部'});
 render();
 if(location.hash.startsWith('#event-')){const el=document.getElementById(location.hash.slice(1));if(el){el.open=true;el.scrollIntoView({block:'center'})}}
}
function reset(){Object.assign(state,{query:'',category:'',decade:'',year:'',sort:'asc'});$('#search').value='';$('#year').value='';$('#sort').value='asc';expanded=false;render()}
function render(){
 const list=filterEvents(events,state),active=Boolean(state.query||state.category||state.decade||state.year);
 $('#results-count').textContent=active?`找到 ${list.length} 项事件 · 共 ${events.length} 项`:`共 ${events.length} 项事件 · 按时间${state.sort==='desc'?'倒序':'正序'}`;
 $('#reset').hidden=!active;$('#empty').hidden=list.length!==0;$('#toggle-all').hidden=!list.length;
 $('#toggle-all').textContent=expanded?'收起全部':'展开全部';
 document.querySelectorAll('[data-category]').forEach(b=>{const on=b.dataset.category===state.category;b.classList.toggle('active',on);b.setAttribute('aria-pressed',on)});
 document.querySelectorAll('[data-decade]').forEach(b=>{const on=b.dataset.decade===state.decade;b.classList.toggle('active',on);b.setAttribute('aria-pressed',on)});
 $('#active-filters').innerHTML=[state.query?`关键词：${state.query}`:'',state.category,state.year?`${state.year}年`:'',state.decade?`${state.decade}年代`:''].filter(Boolean).map(t=>`<span class="filter-chip">${esc(t)}</span>`).join('');
 const groups=[];list.forEach(e=>{let g=groups.at(-1);if(!g||g.year!==e.year){g={year:e.year,items:[]};groups.push(g)}g.items.push(e)});
 $('#timeline').innerHTML=groups.map(g=>`<section class="year-group" aria-label="${g.year}年"><div class="year-label">${g.year}<span>${g.items.length} 项事件</span></div><div class="year-events">${g.items.map((e,i)=>`<details class="event" id="event-${esc(e.id)}"${expanded||(!active&&g===groups[0]&&i===0)?' open':''}><summary><div><div class="event-meta"><time class="event-date" datetime="${esc(e.date)}">${esc(e.displayDate)}</time><span class="event-category">${esc(e.category)}</span></div><h3 class="event-title">${esc(e.title)}</h3></div><span class="expand-icon" aria-hidden="true"></span></summary><div class="event-body"><p>${esc(e.summary)}</p><div class="source-row"><span>参考来源</span><a href="${esc(e.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(e.sourceTitle)}（新窗口）</a></div></div></details>`).join('')}</div></section>`).join('');
 urlState();
}
try{const r=await fetch('events.json');if(!r.ok)throw new Error(r.status);events=await r.json();init()}catch(error){$('#results-count').textContent='年表暂时无法载入';$('#timeline').innerHTML='<div class="error-note">年表数据载入失败，请刷新页面重试。</div>';console.error(error)}
