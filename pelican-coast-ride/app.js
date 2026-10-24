import {shareRide} from './share.js';
import {BIKE,TAU,createRide,advanceRide,setSpeed,setPlaying,getPose,runDiagnostics} from './model.js';
const canvas=document.querySelector('#coast'),ctx=canvas.getContext('2d');
const media=matchMedia('(prefers-reduced-motion: reduce)'),ride=createRide(media.matches);
const ink='#3e6550',green='#33755e',cream='#f9f8df',gold='#d6a254';
const path=(d,fill,stroke=ink,width=2)=>{const p=new Path2D(d);ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';if(fill){ctx.fillStyle=fill;ctx.fill(p)}if(stroke){ctx.strokeStyle=stroke;ctx.stroke(p)}};
const line=(x1,y1,x2,y2,color=ink,w=2)=>{ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=w;ctx.lineCap='round';ctx.stroke()};
const circle=(x,y,r,fill,stroke=null,w=2)=>{ctx.beginPath();ctx.arc(x,y,r,0,TAU);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=w;ctx.stroke()}};
const ellipse=(x,y,rx,ry,fill)=>{ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);ctx.fillStyle=fill;ctx.fill()};
function wheel(x,y,a){ctx.save();ctx.translate(x,y);circle(0,0,94,'#e4ebd0',ink,9);circle(0,0,89,null,'#e9d590',3);ctx.save();ctx.rotate(a);for(let i=0;i<24;i++){const t=i*TAU/24;line(0,0,87*Math.cos(t),87*Math.sin(t),'#77987a',.85)}circle(0,0,9,'#467b61');circle(0,0,3,'#becbad');ctx.restore();ctx.restore()}
function leg(l,front){ctx.save();ctx.lineJoin='round';const c=front?'#d7a557':'#b88c48';line(l.hip.x,l.hip.y,l.knee.x,l.knee.y,c,13);line(l.knee.x,l.knee.y,l.foot.x,l.foot.y,c,11);circle(l.knee.x,l.knee.y,5.5,c);path(`M ${l.foot.x-8} ${l.foot.y-2} Q ${l.foot.x+9} ${l.foot.y-6} ${l.foot.x+17} ${l.foot.y+2} L ${l.foot.x+19} ${l.foot.y+6} L ${l.foot.x-10} ${l.foot.y+6} Z`,c,'#99733e',1);line(l.foot.x-13,l.foot.y+8,l.foot.x+18,l.foot.y+8,ink,4);ctx.restore()}
function bird(p,t){ctx.save();ctx.translate(0,p.bob);
 // Narrow tail, full body, and the S-shaped pelican neck.
 path('M 445 357 L 382 302 L 398 348 L 431 367 Z',cream,ink,2.4);
 path('M 437 321 C 470 300 505 315 544 321 C 563 298 571 279 565 257 C 554 230 558 204 580 199 C 604 193 618 215 610 238 C 604 258 610 280 599 308 C 585 351 564 394 518 402 C 470 410 440 388 432 366 C 425 350 425 332 437 321 Z',cream,ink,2.4);
 path('M 446 365 C 460 386 482 397 508 398 C 537 398 558 387 573 370 C 537 385 485 383 446 365 Z','#e3e9cb',null);
 path('M 565 256 Q 574 270 584 273 M 572 280 Q 572 302 560 319',null,'#80957b',1.1);
 // Scarf flutters independently, while its knot stays on the neck.
 const flutter=Math.sin(t*2.2)*5;
 path(`M 562 279 Q 532 ${264+flutter} 497 ${274+flutter} L 506 ${286+flutter} L 498 ${295+flutter} Q 535 ${284+flutter} 568 291 Z`,'#d8ac67',ink,1.4);
 path('M 563 279 Q 583 289 607 280 L 603 293 Q 581 300 563 290 Z','#d8ac67',ink,1.3);
 // Throat pouch and long beak.
 path('M 604 224 Q 676 222 797 242 Q 756 276 706 280 Q 646 280 615 242 Z','#d8aa58',ink,1.7);
 path('M 604 223 Q 679 226 797 242 Q 702 255 610 235 Z','#eac57b',ink,1.5);
 path('M 620 239 Q 691 259 780 245',null,'#ab894f',1);
 for(let i=0;i<9;i++)line(627+i*15,244+i*.8,632+i*15,248+i*.8,'#b79355',.6);
 circle(598,220,4.2,ink);circle(599,219,1,cream);
 // Helmet and chin strap.
 path('M 565 205 Q 559 169 588 166 Q 617 162 627 204 Z',green,ink,2);
 path('M 559 204 Q 594 198 633 204 L 634 208 Q 594 211 560 209 Z','#2d614e',ink,1.6);
 for(let i=0;i<5;i++){const x=571+i*11;path(`M ${x} 199 Q ${x-4} 182 ${584+(i-2)*3} 173`,null,'#99b396',1.5)}
 path('M 571 210 L 584 238 L 606 240 L 616 210',null,'#4e745e',2);
 // Wing rests on the handlebar, with trailing feather contours.
 path('M 465 334 Q 491 320 527 342 Q 570 363 622 349 L 705 337 Q 718 337 714 344 Q 669 356 626 372 Q 577 392 517 374 Q 481 364 465 334 Z',cream,ink,2.2);
 path('M 478 342 Q 524 375 581 373 M 480 349 Q 516 373 548 375 M 488 360 Q 512 376 531 377',null,'#8ba080',1.2);
 circle(712,341,3.1,gold,ink,1.1);
 ctx.restore()}
function draw(){const dpr=Math.min(devicePixelRatio||1,2);const w=canvas.clientWidth,h=canvas.clientHeight;const sw=Math.round(w*dpr),sh=Math.round(h*dpr);if(canvas.width!==sw||canvas.height!==sh){canvas.width=sw;canvas.height=sh}
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 // On narrow screens the landscape crops at its edges, keeping the whole rider visible.
 const scale=Math.max(w/1200,h/665),viewWidth=w/scale;ctx.translate((w-1200*scale)/2,(h-665*scale)/2);ctx.scale(scale,scale);
 const t=ride.time,p=getPose(t);const sky=ctx.createLinearGradient(0,0,0,650);sky.addColorStop(0,'#e9efe3');sky.addColorStop(1,'#eef0db');ctx.fillStyle=sky;ctx.fillRect(0,0,1200,665);
 circle(941,149,58,'#f5d68e');circle(941,149,60,null,'#f7df9e',1);
 // High clouds, very slow drift.
 for(const [x,y,s] of [[156,132,1],[547,96,.73],[1030,225,.85]]){ctx.save();ctx.translate(x-Math.sin(t*.08+x)*14,y);ctx.scale(s,s);path('M -40 7 Q -41 -1 -22 -2 Q -24 -15 -8 -13 Q 1 -26 18 -10 Q 42 -11 44 1 Q 67 -2 69 8 Z','#f8faeb',null);ctx.restore()}
 // Layered hills repeat seamlessly across the horizon.
 ctx.fillStyle='#c4d2b4';ctx.beginPath();ctx.moveTo(0,346);for(let x=0;x<=1200;x+=8){ctx.lineTo(x,344+Math.sin((x+p.distance*.055)/145)*18+Math.sin((x+p.distance*.055)/85)*6)}ctx.lineTo(1200,425);ctx.lineTo(0,425);ctx.fill();
 ctx.fillStyle='#afd0bd';ctx.fillRect(0,367,1200,146);const water=ctx.createLinearGradient(0,367,0,520);water.addColorStop(0,'#b4d1be');water.addColorStop(1,'#c8dcc1');ctx.fillStyle=water;ctx.fillRect(0,367,1200,146);
 for(let i=0;i<15;i++){const y=393+(i%4)*24;let x=((i*139-p.distance*.15)%1400+1400)%1400-100;line(x,y,x+32+(i%3)*61,y,'#eaf0d5',2)}
 path('M 0 480 Q 130 464 268 476 Q 395 487 519 475 Q 685 452 836 473 Q 1000 485 1200 460 L 1200 560 L 0 560 Z','#dbe0bc',null);
 path('M 0 550 Q 304 540 514 548 Q 800 559 1200 542 L 1200 665 L 0 665 Z','#eee7c7',null);
 path('M 0 548 Q 300 539 522 548 Q 831 558 1200 543',null,'#faf7dd',7);
 // Near-ground accents scroll at wheel travel speed (no-slip correspondence).
 for(let i=0;i<18;i++){let x=((i*107-p.distance)%1350+1350)%1350-80;const y=585+(i%3)*20;line(x,y,x+13+(i%4)*19,y,'#dbd5b3',1.3)}
 for(let i=0;i<4;i++){let x=((i*410+80-p.distance)%1550+1550)%1550-130;const y=539;path(`M ${x} ${y} q 2 -27 10 -35 M ${x} ${y} q -6 -23 -15 -26 M ${x} ${y} q 8 -21 20 -24`,null,'#7b9671',1.5)}
 // Two distant gulls.
 for(const [x,y] of [[820,217],[879,248]]){const flap=Math.sin(t*2+x)*2;path(`M ${x-16} ${y+flap} q 7 -10 16 0 q 8 -10 16 0`,null,'#6c8975',1.6)}
 ellipse(565,592,216,9,'#d6d2ad55');ellipse(565,590,153,6,'#c9c8a830');
 leg(p.legs[1],false);wheel(410,493,p.wheelAngle);wheel(720,493,p.wheelAngle);
 // Curved steel tubes with a pale highlight.
 const frame='M 410 493 L 480 389 L 557 493 L 684 390 L 480 389 M 410 493 L 557 493 M 684 390 L 720 493';
 path(frame,null,green,9);path(frame,null,'#86aa85',1.2);
 path('M 684 390 L 671 345 Q 670 330 689 328 L 710 328',null,green,8);path('M 690 328 L 714 328',null,ink,8);
 line(480,389,477,373,green,7);path('M 451 373 Q 475 369 497 374',null,'#625c3a',8);
 path('M 556 475 L 411 484 Q 396 492 411 500 L 556 511',null,'#647e54',2.2);
 circle(557,493,24,'#dedeb4',green,3);circle(557,493,18,null,'#bdad70',1.5);ctx.save();ctx.translate(557,493);ctx.rotate(p.crankAngle);line(-34,0,34,0,'#a2894a',5);circle(0,0,5,'#486e52');ctx.restore();
 bird(p,t);leg(p.legs[0],true);
 // A restrained paper grain, anchored to the page rather than flickering per frame.
 ctx.globalAlpha=.025;ctx.drawImage(grain,0,0,1200,665);ctx.globalAlpha=1;
 canvas.dataset.time=ride.time.toFixed(4);canvas.dataset.speed=String(ride.speed);canvas.dataset.playing=String(ride.playing);
}
const grain=document.createElement('canvas');grain.width=360;grain.height=200;const gc=grain.getContext('2d'),pixels=gc.createImageData(360,200);let seed=173;for(let i=0;i<pixels.data.length;i+=4){seed=(seed*16807)%2147483647;const v=seed%256;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=v;pixels.data[i+3]=255}gc.putImageData(pixels,0,0);
function updateControls(){document.querySelector('#play-label').textContent=ride.playing?'暂停':'继续';document.querySelector('#play-icon').textContent=ride.playing?'Ⅱ':'▷';document.querySelector('#play').setAttribute('aria-label',ride.playing?'暂停骑行':'继续骑行');document.querySelector('#play').setAttribute('aria-pressed',String(!ride.playing));document.querySelector('#status').textContent=ride.playing?'沿海慢骑中':'在海边歇一会';document.querySelectorAll('[data-speed]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.speed)===ride.speed)));draw()}
const toggle=()=>{setPlaying(ride,!ride.playing);updateControls()};document.querySelector('#play').addEventListener('click',toggle);document.querySelectorAll('[data-speed]').forEach(b=>b.addEventListener('click',()=>{setSpeed(ride,Number(b.dataset.speed));updateControls()}));document.addEventListener('keydown',e=>{if(e.code==='Space'&&!['BUTTON','SUMMARY','INPUT','TEXTAREA'].includes(e.target.tagName)){e.preventDefault();toggle()}});
document.querySelector('#run-tests').addEventListener('click',()=>{const r=runDiagnostics();const list=document.querySelector('#test-results');list.replaceChildren(...r.map(x=>{const li=document.createElement('li');li.className=x.passed?'pass':'fail';li.textContent=x.name;return li}));document.querySelector('#test-summary').textContent=`${r.filter(x=>x.passed).length} / ${r.length} 项通过 · 本次检查已完成`;});
media.addEventListener('change',e=>{if(e.matches){setPlaying(ride,false);updateControls()}});new ResizeObserver(draw).observe(canvas);
let last=0;function animate(now){const dt=last?(now-last)/1000:0;last=now;if(!document.hidden)advanceRide(ride,dt);draw();requestAnimationFrame(animate)}updateControls();requestAnimationFrame(animate);

const shareButton=document.querySelector('#share'),feedback=document.querySelector('#share-feedback'),manual=document.querySelector('#share-manual'),urlInput=document.querySelector('#share-url');
// 分享当前部署地址，而非任何固定域名。
const publicUrl=location.href.split('#')[0];
shareButton.addEventListener('click',async()=>{shareButton.disabled=true;feedback.hidden=true;manual.hidden=true;try{const result=await shareRide(navigator,publicUrl);if(result==='manual'){manual.hidden=false;urlInput.value=publicUrl;urlInput.focus();urlInput.select()}else if(result!=='cancelled'){feedback.textContent=result==='copied'?'链接已复制，可以发给朋友了':'已打开分享';feedback.hidden=false}}finally{shareButton.disabled=false}});
document.querySelector('#share-close').addEventListener('click',()=>{manual.hidden=true;shareButton.focus()});
