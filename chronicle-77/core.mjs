export const categories = ['政治与制度','经济与改革','科技与工程','社会与文化','外交与世界','灾难与公共卫生'];
export function filterEvents(events, {query='', category='', decade='', year='', sort='asc'}={}) {
  const terms=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return events.filter(e=> (!category||e.category===category) && (!year||e.year===Number(year)) && (!decade||Math.floor(e.year/10)*10===Number(decade)) && terms.every(t=>`${e.title} ${e.summary} ${e.category} ${e.displayDate} ${e.year}`.toLocaleLowerCase().includes(t))).sort((a,b)=> (a.date.localeCompare(b.date)||a.title.localeCompare(b.title,'zh-CN'))*(sort==='desc'?-1:1));
}
export function countByDecade(events) {return events.reduce((a,e)=>{const d=Math.floor(e.year/10)*10;a[d]=(a[d]||0)+1;return a},{});}
export function escapeHtml(s) {return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
