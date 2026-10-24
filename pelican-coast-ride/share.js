export async function shareRide(env,url){
 if(typeof env.share==='function'){
  try{await env.share({title:'Pelican Coast · 鹈鹕骑行',url});return 'shared'}
  catch(error){if(error?.name==='AbortError')return 'cancelled'}
 }
 if(typeof env.clipboard?.writeText==='function'){
  try{await env.clipboard.writeText(url);return 'copied'}catch{}
 }
 return 'manual';
}
