export const TAU = Math.PI * 2;
export const BIKE = { rear: {x:410,y:493}, front: {x:720,y:493}, radius:94, crank:{x:557,y:493}, crankRadius:34, hip:{x:516,y:388}, thigh:82, shin:82, gearRatio:1.9 };
export function createRide(reducedMotion=false) { return {time:0, speed:1, playing:!reducedMotion}; }
export function advanceRide(state,dt) { if(state.playing && Number.isFinite(dt) && dt>0) state.time += Math.min(dt,.05)*state.speed; return state; }
export function setSpeed(state,speed) { if(!Number.isFinite(speed)||speed<.5||speed>2) throw new RangeError('速度须在 0.5–2 倍之间'); state.speed=speed;return state; }
export function setPlaying(state,playing) { if(typeof playing!=='boolean')throw new TypeError('播放状态应为布尔值');state.playing=playing;return state; }
export function getPose(time) {
 const crankAngle=time*1.55, wheelAngle=crankAngle*BIKE.gearRatio;
 const bob=Math.sin(crankAngle*2)*1.7;
 const hip={x:BIKE.hip.x,y:BIKE.hip.y+bob};
 const legs=[0,Math.PI].map(offset=>{
  const a=crankAngle+offset;
  const foot={x:BIKE.crank.x+Math.cos(a)*BIKE.crankRadius,y:BIKE.crank.y+Math.sin(a)*BIKE.crankRadius};
  const dx=foot.x-hip.x,dy=foot.y-hip.y,d=Math.hypot(dx,dy);
  const along=(BIKE.thigh**2-BIKE.shin**2+d*d)/(2*d),height=Math.sqrt(Math.max(0,BIKE.thigh**2-along**2));
  const knee={x:hip.x+dx/d*along-dy/d*height,y:hip.y+dy/d*along+dx/d*height};
  return {hip,knee,foot};
 });
 return {crankAngle,wheelAngle,distance:wheelAngle*BIKE.radius,bob,legs};
}
export function runDiagnostics() {
 const results=[];const check=(name,fn)=>{try{fn();results.push({name,passed:true});}catch(error){results.push({name,passed:false,error:error.message});}};
 const expect=(v)=>{if(!v)throw Error('检查未通过');};const near=(a,b)=>Math.abs(a-b)<1e-7;
 check('双脚持续贴合踏板 · 360 帧',()=>{for(let i=0;i<360;i++){for(const l of getPose(i/360*TAU/1.55).legs)expect(near(Math.hypot(l.foot.x-BIKE.crank.x,l.foot.y-BIKE.crank.y),BIKE.crankRadius));}});
 check('腿部关节长度稳定 · 720 帧',()=>{for(let i=0;i<720;i++)for(const l of getPose(i/100).legs){expect(near(Math.hypot(l.knee.x-l.hip.x,l.knee.y-l.hip.y),BIKE.thigh));expect(near(Math.hypot(l.foot.x-l.knee.x,l.foot.y-l.knee.y),BIKE.shin));}});
 check('车轮与地面同步滚动',()=>{for(const t of [0,.1,1,3,20]){const p=getPose(t);expect(near(p.wheelAngle*BIKE.radius,p.distance));}});
 check('暂停后时间完全停止',()=>{const s=createRide();advanceRide(s,.02);setPlaying(s,false);advanceRide(s,.04);expect(near(s.time,.02));});
 check('倍速与输入范围有效',()=>{const s=createRide();setSpeed(s,2);advanceRide(s,.02);expect(near(s.time,.04));let failed=false;try{setSpeed(s,3);}catch{failed=true;}expect(failed&&s.speed===2);});
 check('切回页面时不会突然跳动',()=>{const s=createRide();advanceRide(s,10);expect(near(s.time,.05));});
 return results;
}
