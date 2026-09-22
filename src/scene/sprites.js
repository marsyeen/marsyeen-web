/**
 * SPRITES - every object in the scene is a tiny pixel-grid SVG (1 SVG unit = 1 art pixel).
 *
 *   sprites.build('streetcar', { dir: 1, num: '504' })  ->  { svg: '<svg ...>', meta: {...} }
 *
 * scene.js rasterises each SVG once into a crisp bitmap and reuses it every frame.
 *
 * Available sprites (the B.<name> builders below):
 *   streetcar, pedestrian, cn_tower, dome (Rogers Centre), moon, sun, cloud, airplane,
 *   building (far / tower / mid), storefront, theatre, shelter, street_sign,
 *   mailbox, street_lamp, vent (steam grate)
 *
 * To restyle a sprite: find its builder and change the hex colours. Most builders take a
 * `day` option, and SP() holds the shared street palette for night and day.
 */
export const sprites=(function(){
'use strict';
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const RGBA=/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/;
function rect(x,y,w,h,col,op){
  if(w<=0||h<=0) return '';
  let f=col,o=op==null?1:op; const m=RGBA.exec(col);
  if(m){ f='rgb('+m[1]+','+m[2]+','+m[3]+')'; o*=+m[4]; }
  return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+f+'"'+(o<1?' fill-opacity="'+(+o.toFixed(3))+'"':'')+'/>';
}
function doc(w,h,parts,title){
  return '<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'" shape-rendering="crispEdges"><title>'+title+'</title>'+parts.join('')+'</svg>';
}
const rgbs=a=>'rgb('+Math.round(a[0])+','+Math.round(a[1])+','+Math.round(a[2])+')';
const lerp=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const FONT={'0':[7,5,5,5,7],'1':[2,6,2,2,7],'3':[7,1,7,1,7],'4':[5,5,7,1,1],'5':[7,4,7,1,7],'6':[7,4,7,5,7],
  'K':[5,5,6,5,5],'I':[7,2,2,2,7],'N':[5,7,7,5,5],'G':[7,4,5,5,7],'J':[1,1,1,5,7],'O':[7,5,5,5,7],'H':[5,5,7,5,5]};
function glyphs(p,text,x,y,col){
  String(text).split('').forEach((ch,i)=>{const rows=FONT[ch]; if(!rows)return;
    for(let ro=0;ro<5;ro++)for(let co=0;co<3;co++) if(rows[ro]&(4>>co)) p.push(rect(x+i*4+co,y+ro,1,1,col));});
}
/* street-object palette (night / day) */
function SP(day){
  return day?{
    bricks:['#a86a58','#8a86ac','#a4708a','#7a96b8','#b48462','#78a8a0'],
    cornice:'#8a7a86',corniceHi:'rgba(255,255,255,.25)',mortar:'rgba(0,0,0,.10)',shade:'rgba(0,0,0,.22)',hi:'rgba(255,255,255,.15)',
    winFrame:'#3a3448',winLitW:'#cfe4fa',winLitC:'#d5e8fb',winDark:'#7fa4cc',winDarkHi:'rgba(255,255,255,.3)',winSill:'#8a7a86',winCurt:'rgba(0,0,0,.12)',
    shopFrame:'#3a3448',shopSill:'#5a4a5a',doorFrame:'#3a3448',signBg:'#3a3448',
    vent:'#3a3f55',ventSlit:'#8a90a8',
    shRoof:'#4a5288',shHi:'#8a92c8',shPost:'#6a72a8',shGlass:'rgba(180,210,255,.15)',pole:'#2a2e44',head:'#8a8a90'
  }:{
    bricks:['#3b2632','#2f2b44','#34263c','#2a3245','#3d2b2b','#2c3a3a'],
    cornice:'#4a3a4c',corniceHi:'rgba(255,255,255,.12)',mortar:'rgba(0,0,0,.14)',shade:'rgba(0,0,0,.35)',hi:'rgba(255,255,255,.08)',
    winFrame:'#0a0c1c',winLitW:'#ffcf80',winLitC:'#9ac8ff',winDark:'#141a3a',winDarkHi:'rgba(120,140,220,.18)',winSill:'#4a3a4c',winCurt:'rgba(0,0,0,.25)',
    shopFrame:'#0a0c1c',shopSill:'#2a1f2a',doorFrame:'#14101e',signBg:'#1a1526',
    vent:'#090b1c',ventSlit:'#3a4070',
    shRoof:'#1a2048',shHi:'#39408a',shPost:'#2b3270',shGlass:'rgba(140,180,255,.07)',pole:'#0a0c1c',head:'#4a4a55'
  };
}
const B={};

/* ---------- streetcar (Flexity-style, 106x34) ---------- */
B.streetcar=function(o){
  const dir=o.dir<0?-1:1, num=String(o.num||'504'), rn=rng(o.seed||1), L=106, y0=8, p=[];
  const M=(px,py,w,h,col)=>p.push(rect(dir>0?px:L-px-w,py,w,h,col));
  M(0,y0,103,2,'#f2f3f8'); M(10,y0-1,12,1,'#c9ccdc'); M(50,y0-1,10,1,'#c9ccdc');
  M(0,y0+2,103,19,'#d21f2f');
  M(0,y0+2,103,1,'#f6f2ee');
  M(103,y0+4,1,15,'#d21f2f'); M(104,y0+7,1,10,'#c01c2b'); M(105,y0+11,1,4,'#a51824');
  M(72,y0+2,30,6,'#12090c');
  const d0=dir>0?75:7;
  glyphs(p,num,d0,y0+3,'#ffb020');
  for(let k=0;k<11;k+=3){ if(rn()<.8)p.push(rect(d0+13+k,y0+4,2,1,'#d98d12')); if(rn()<.7)p.push(rect(d0+13+k,y0+6,2,1,'#d98d12')); }
  M(1,y0+14,102,3,'#f6f2ee');
  M(0,y0+18,103,3,'#9f1523');
  [[1,34],[37,32],[71,32]].forEach(function(s,si){
    const sx=s[0], sw=s[1], dx=sx+(si===2?2:5);
    M(dx,y0+8,6,12,'#fff1bc'); M(dx+3,y0+8,1,12,'#cfae5e'); M(dx,y0+8,6,1,'#fff9dc');
    const end=si===2?89:sx+sw;
    for(let wx=dx+8;wx+6<=end;wx+=8){
      M(wx,y0+8,6,6,'#ffdc90'); M(wx,y0+8,6,1,'#fff6d8');
      if(rn()<.65){const k=rn()<.5?0:1; M(wx+k,y0+11,4,3,'#3b2b2e'); M(wx+k+1,y0+9,2,2,'#3b2b2e');}
    }
  });
  M(90,y0+8,12,6,'#ffe3a0'); M(90,y0+8,12,1,'#fff6d8');
  M(95,y0+9,2,2,'#3b2b2e'); M(94,y0+11,4,3,'#3b2b2e'); M(102,y0+8,1,6,'#7a1420');
  M(35,y0+2,2,19,'#4d0b12'); M(69,y0+2,2,19,'#4d0b12');
  M(35,y0,2,2,'#555a72'); M(69,y0,2,2,'#555a72');
  M(2,y0+21,99,3,'#171a2b');
  [9,48,86].forEach(function(bx){ M(bx,y0+24,13,2,'#0a0b14'); M(bx+1,y0+24,3,2,'#2b2f45'); M(bx+9,y0+24,3,2,'#2b2f45'); });
  for(let i=0;i<6;i++) M(36+i,y0-1-i,1,1,'#b9bdd0');
  M(38,y0-7,8,1,'#d6dae8'); M(42,y0-6,1,1,'#b9bdd0');
  M(103,y0+14,2,2,'#fff7d0'); M(0,y0+13,1,3,'#ff3030');
  return {svg:doc(L,34,p,'Streetcar '+num+(dir>0?' (eastbound)':' (westbound)')),meta:{}};
};

/* ---------- pedestrian (8x16, 2 walk frames, optional umbrella) ---------- */
B.pedestrian=function(o){
  const p=[];
  p.push(rect(3,6,2,2,o.skin||'#d9ac8c'));
  p.push(rect(3,5,2,1,o.hair||'#1a1420'));
  p.push(rect(2,8,4,5,o.shirt||'#2a4f86'));
  if(o.frame){ p.push(rect(2,13,1,3,'#14162a')); p.push(rect(5,13,1,3,'#14162a')); }
  else p.push(rect(3,13,2,3,'#14162a'));
  if(o.umb){
    p.push(rect(0,2,8,1,o.umb)); p.push(rect(1,1,6,1,o.umb)); p.push(rect(2,0,4,1,o.umb));
    p.push(rect(4,3,1,4,'#14162a'));
  }
  return {svg:doc(8,16,p,'Pedestrian'),meta:{}};
};

/* ---------- CN Tower (geometry comes from towerGeo) ---------- */
function towerGeo(yOff){
  const base=156, top=Math.max(-44,Math.min(20,-yOff+8)), Ht=base-top, k=Math.sqrt(Ht/122), u=Ht/150, rh=Math.max(1,Math.round(u));
  return {base:base,top:top,Ht:Ht,k:k,hk:rh,rh:rh,podY:Math.round(base-.62*Ht),skyY:Math.round(base-.81*Ht),
    podHW:Math.max(5,Math.round(7*u)),skHW:Math.max(2,Math.round(3*u)),upHW:Math.max(1,Math.round(1.4*u)),
    lowHW:Math.max(2,Math.round(2.4*u)),baseHW:Math.max(4,Math.round(7*u))};
}
/* Modelled on photos of the real tower (proportions scale with its height): a straight tapering
   concrete shaft that flares only at the ground, a big round main pod at ~62% (roof ring, dark glass
   bands split by pale rings, grey bowl underneath), a slim upper shaft, a small sky pod at ~81%, and a
   long pale antenna. The RGB lights are drawn on top by scene.js at meta.bandY / meta.skBandY. */
B.cn_tower=function(o){
  const G=o.geo, day=!!o.day, p=[];
  const C=day?{body:'#b8bdc8',hi:'#dfe3ea',shade:'#8d94a4',ring:'#eef1f6',under:'#a3a9b8',glass:'#7fb2dd',mull:'#4c6a92',mast:'#f2f4fa'}
             :{body:'#3a4290',hi:'#6a76c4',shade:'#1c2260',ring:'#8f9ad0',under:'#2b3384',glass:'#3673b8',mull:'#182a66',mast:'#b8c4f0'};
  const base=G.base, top=G.top, rh=G.rh, podY=G.podY, skyY=G.skyY, podHW=G.podHW, upHW=G.upHW, lowHW=G.lowHW, baseHW=G.baseHW, skHW=G.skHW;
  const cx=Math.max(baseHW,podHW)+2, Y=function(y){return y-top;};
  const podTop=podY-6*rh, podBot=podTop+12*rh, skTop=skyY-2*rh, skBot=skTop+4*rh;
  const row=function(y,h,hw,col){ p.push(rect(cx-hw,Y(y),2*hw+1,h,col)); };
  const shaft=function(y,h,hw){ row(y,h,hw,C.body); p.push(rect(cx-hw,Y(y),1,h,C.hi)); p.push(rect(cx+hw,Y(y),1,h,C.shade)); };
  const mullions=function(y,hw){ for(let m=-hw+1;m<hw;m+=3) p.push(rect(cx+m,Y(y),1,rh,C.mull)); };
  // antenna: same concrete colour as the shaft, thick at the bottom, thin needle at the top
  const aMid=top+Math.round((skTop-top)*.4);
  p.push(rect(cx,Y(top),1,aMid-top,C.body));
  shaft(aMid,skTop-aMid,1);
  // sky pod
  [-1,0,0,-1].forEach(function(d,i){ const hw=Math.max(1,skHW+d), y=skTop+i*rh;
    row(y,rh,hw,i===0?C.ring:i===1?C.glass:C.under); if(i===1) mullions(y,hw); });
  // slim shaft between the pods
  shaft(skBot,podTop-skBot,upHW);
  // main pod: dark roof and glass on top, glowing RGB rim (row 8, drawn by scene.js), bowl underneath
  [-5,-3,-1,0,0,0,0,0,0,-1,-2,-4].forEach(function(d,i){
    const hw=Math.max(1,podHW+d), y=podTop+i*rh;
    row(y,rh,hw,i===0?C.hi:i===8?C.ring:i>=9?C.under:(i===4||i===6)?C.glass:i===5?C.ring:C.body);
    if(i===4||i===6) mullions(y,hw);
  });
  // lower shaft: straight taper, flaring only in the last 20%
  let runY=podBot, runHW=-1;
  for(let y=podBot;y<=base+1;y++){
    let hw=-2;
    if(y<=base){ const t=(y-podBot)/(base-podBot); hw=lowHW+Math.round(t*(baseHW-lowHW)*.55)+Math.round(Math.pow(Math.max(0,(t-.8)/.2),2)*(baseHW-lowHW)*.45); }
    if(hw!==runHW){ if(runHW>=0) shaft(runY,y-runY,runHW); runY=y; runHW=hw; }
  }
  return {svg:doc(2*cx+1,base-top+1,p,'CN Tower ('+(day?'day':'night')+')'),
    meta:{cx:cx,podTop:podTop,podBot:podBot,skTop:skTop,skBot:skBot,bandY:podTop+8*rh,bandH:rh,skBandY:skTop+2*rh,skBandH:rh}};
};

/* ---------- Rogers Centre dome (69x48) ---------- */
B.dome=function(o){
  const day=!!o.day, p=[];
  const C={dome:day?'#8fa0bc':'#212a66',top:day?'#c3cfe3':'#5560a8'};
  for(let dx=-34;dx<=34;dx++){
    const hg=Math.round(40*Math.pow(1-Math.pow(Math.abs(dx)/34,2.6),1/1.6));
    p.push(rect(dx+34,40-hg,1,hg+18,C.dome)); p.push(rect(dx+34,40-hg,1,1,C.top));
  }
  if(!day){ p.push(rect(2,33,65,2,'rgba(217,163,90,.34)')); p.push(rect(4,25,61,1,'rgba(217,163,90,.34)')); }
  return {svg:doc(69,58,p,'Rogers Centre ('+(day?'day':'night')+')'),meta:{}};
};

/* ---------- moon / sun (17x17 discs; glow is a lighting effect in the engine) ---------- */
B.moon=function(){
  const rn=rng(3), p=[];
  for(let dy=-8;dy<=8;dy++)for(let dx=-8;dx<=8;dx++){
    if(Math.hypot(dx,dy)<=7 && Math.hypot(dx-3,dy+2)>6.3) p.push(rect(dx+8,dy+8,1,1,rn()<.12?'#c9d0ee':'#eef1ff'));
  }
  return {svg:doc(17,17,p,'Crescent moon'),meta:{}};
};
B.sun=function(o){
  const col=o.tone==='orange'?'#ffb060':'#fff4c0', p=[];
  for(let dy=-8;dy<=8;dy++){ const hw=Math.floor(Math.sqrt(64-dy*dy)); p.push(rect(8-hw,dy+8,2*hw+1,1,col)); }
  return {svg:doc(17,17,p,'Sun ('+(o.tone==='orange'?'low':'high')+')'),meta:{}};
};

/* ---------- cloud ---------- */
B.cloud=function(o){
  const w=o.w||120, h=o.h||12, day=!!o.day, rn=rng(o.seed||1), p=[];
  const ri=function(a,b){return Math.floor(a+rn()*(b-a+1));};
  for(let j=0;j<9;j++){ const bw=ri(20,60),bh=ri(3,6),bx=ri(0,w-bw),by=ri(0,h-bh); p.push(rect(bx,by,bw,bh,day?'rgba(255,255,255,.70)':'rgba(38,46,104,.30)')); }
  for(let j=0;j<4;j++){ const bw=ri(16,40),bx=ri(0,w-bw); p.push(rect(bx,h-3,bw,2,day?'rgba(140,155,195,.35)':'rgba(120,70,120,.16)')); }
  return {svg:doc(w,h,p,'Cloud ('+(day?'day':'night')+')'),meta:{}};
};

/* ---------- airplane (4x1, just a dash) ---------- */
B.airplane=function(o){
  const col=o.day?'#f2f4fa':'#9aa4d0';
  return {svg:doc(4,1,[rect(0,0,4,1,col)],'Airplane'),meta:{}};
};

/* ---------- generic building (far / tower / mid) ---------- */
B.building=function(o){
  const day=!!o.day, kind=o.kind, w=o.w, h=o.h, rn=rng(o.seed||1), PAD=12, p=[];
  if(kind==='far'){
    const col=(day?['#8aa2c6','#94abcc','#849dc2']:['#0d1332','#101638','#0c1230'])[o.ci||0];
    const dim=day?'rgba(110,135,180,.6)':'rgba(48,58,120,.55)', lit=day?'rgba(120,145,190,.6)':'rgba(240,190,110,.55)';
    p.push(rect(0,PAD,w,h,col)); if(o.cap) p.push(rect(3,PAD-4,w-6,4,col)); if(o.ant) p.push(rect(w>>1,PAD-9,1,9,col));
    for(let wy=3;wy<h-20;wy+=5)for(let wx=2;wx<w-2;wx+=3){ if(rn()<.32) p.push(rect(wx,PAD+wy,1,2,rn()<.12?lit:dim)); }
    return {svg:doc(w,h+PAD,p,'Distant building'),meta:{}};
  }
  if(kind==='tower'){
    const col=day?'#7d95bb':'#111842', edge=day?'rgba(255,255,255,.25)':'rgba(90,105,190,.2)';
    const dim=day?'rgba(105,130,175,.6)':'rgba(56,68,140,.55)', lit=day?'rgba(105,130,175,.6)':'rgba(240,190,110,.6)';
    p.push(rect(0,PAD,w,h,col)); p.push(rect(w-1,PAD,1,h,edge));
    for(let wy=3;wy<h-20;wy+=4)for(let wx=2;wx<w-2;wx+=3){ if(rn()<.5) p.push(rect(wx,PAD+wy,1,2,rn()<.25?lit:dim)); }
    return {svg:doc(w,h+PAD,p,'Office tower'),meta:{}};
  }
  const cols=day?['#6c86ae','#7690b8','#627ca6','#7f98be']:['#151c46','#182050','#121a40','#1b2453'];
  const edge=day?'rgba(255,255,255,.25)':'rgba(90,105,190,.22)', win=day?'rgba(170,200,240,.55)':'rgba(60,72,150,.35)', ledge=day?'rgba(255,255,255,.3)':'rgba(90,105,190,.3)';
  const col=cols[o.ci||0], ox=1, st=o.st||0, wins=[];
  p.push(rect(ox,PAD,w,h,col)); p.push(rect(ox+w-1,PAD,1,h,edge)); p.push(rect(ox,PAD,w,1,edge));
  if(st===1){ p.push(rect(ox+3,PAD-6,w-6,6,col)); p.push(rect(ox+3,PAD-6,w-6,1,edge)); }
  if(st===2) p.push(rect(ox+(w>>1),PAD-10,1,10,col));
  if(st===3) p.push(rect(ox-1,PAD,w+2,2,ledge));
  for(let wy=4;wy<h-10;wy+=6)for(let wx=3;wx<w-4;wx+=4){
    p.push(rect(ox+wx,PAD+wy,2,3,win));
    const r=rn(); const ci=r<.5?0:r<.7?1:r<.9?2:3;
    wins.push({x:wx,y:wy,on:rn()<.4,c:ci});
  }
  return {svg:doc(w+2,h+PAD,p,'Mid-rise building'),meta:{wins:wins}};
};

/* ---------- storefront (w x h body, drawn 1px wider each side for the cornice) ---------- */
B.storefront=function(o){
  const day=!!o.day, w=o.w, h=o.h, rn=rng(o.seed||1), S=SP(day), top=166-h, p=[], lights=[];
  const ri=function(a,b){return Math.floor(a+rn()*(b-a+1));}, pk=function(a){return a[Math.floor(rn()*a.length)];};
  const P=function(x,y,ww,hh,c){p.push(rect(x+1,y-top,ww,hh,c));};
  const awn=[['#b3283c','#e9dccb'],['#1f7a72','#d8e8d0'],['#2b4a9a','#dfe5f5'],['#8a3d9a','#e8d0e8'],['#c47a1c','#f0e0b8']];
  const shopC=[[[255,210,120],[210,154,82]],[[143,232,214],[74,176,160]],[[255,134,184],[176,78,120]],[[226,235,255],[143,157,208]]];
  const neon=[[255,95,143],[95,240,216],[255,216,95]];
  P(0,top,w,h,pk(S.bricks));
  for(let yy=top+3;yy<166;yy+=4) P(0,yy,w,1,S.mortar);
  P(w-1,top,1,h,S.shade); P(0,top,1,h,S.hi);
  P(-1,top,w+2,2,S.cornice); P(-1,top,w+2,1,S.corniceHi);
  for(let wy=top+5;wy+8<=136;wy+=12)for(let wx=3;wx+5<=w-3;wx+=9){
    P(wx-1,wy-1,7,10,S.winFrame);
    const lit=rn()<.5; let warm=false; if(lit) warm=rn()<.8;
    if(lit){ P(wx,wy,5,8,warm?S.winLitW:S.winLitC); P(wx,wy,2,8,S.winCurt); lights.push([wx+3,wy+4-top,warm?'255,207,128':'154,200,255',7,.09]); }
    else { P(wx,wy,5,8,S.winDark); P(wx,wy,5,1,S.winDarkHi); }
    P(wx-1,wy+9,7,1,S.winSill);
  }
  const sc=pk(shopC), shx=3, shw=w-13;
  const ca=day?lerp(sc[0],[205,222,240],.6):sc[0], cb=day?lerp(sc[1],[150,175,205],.5):sc[1];
  P(shx-1,148,shw+2,17,S.shopFrame);
  for(let r=0;r<15;r++) P(shx,148+r,shw,1,rgbs(lerp(ca,cb,r/14)));
  const shelf=day?'rgba(0,0,0,.18)':'rgba(0,0,0,.35)';
  P(shx,152,shw,1,shelf); P(shx,158,shw,1,shelf);
  for(let i=0;i<3;i++) P(shx+ri(1,Math.max(2,shw-6)),ri(149,156),ri(2,4),ri(2,3),day?'rgba(40,30,50,.35)':'rgba(20,12,24,.55)');
  if(rn()<.5){ const ppx=shx+ri(2,Math.max(3,shw-5)), pc=day?'#4a4055':'#1a1420'; P(ppx,153,2,2,pc); P(ppx-1,155,4,7,pc); }
  P(shx-1,163,shw+2,3,S.shopSill);
  const dx=w-9;
  P(dx-1,148,8,18,S.doorFrame); P(dx+1,150,4,10,rgbs(ca)); P(dx+4,158,1,2,'#d0c090');
  const ac=pk(awn);
  for(let xx=1;xx<w-1;xx++) P(xx,143,1,(xx%2)?5:4,ac[Math.floor(xx/3)%2]);
  P(1,148,w-2,1,'rgba(0,0,0,.4)');
  const nc=pk(neon), sw=Math.min(w-8,20), sxp=(w-sw)>>1;
  P(sxp,138,sw,4,S.signBg);
  const ncol=day?rgbs(lerp(nc,[70,70,84],.5)):rgbs(nc);
  for(let i=1;i<sw-2;i+=3){ if(rn()<.75) P(sxp+i,139,2,1+(rn()<.4?1:0),ncol); }
  lights.push([sxp+(sw>>1)+1,140-top,nc.join(','),9,.14]);
  lights.push([shx+(shw>>1)+1,155-top,sc[0].join(','),14,.10]);
  return {svg:doc(w+2,h,p,'Storefront ('+(day?'day':'night')+')'),
    meta:{lights:lights,spot:{x:shx+1,w:shw,col:sc[0].join(',')},roof:{x:0,w:w+2,y:0}}};
};

/* ---------- theatre frontage (62x48) ---------- */
B.theatre=function(o){
  const day=!!o.day, S=SP(day), top=118, p=[], lights=[];
  const P=function(x,y,ww,hh,c){p.push(rect(x+1,y-top,ww,hh,c));};
  const stone=day?'#cfc7b6':'#464658', hi=day?'#e6e0d2':'#5a5a70', lo=day?'#a99f8a':'#34344a';
  P(0,top,60,48,stone); P(0,top,60,2,hi); P(-1,top+2,62,1,lo);
  [2,21,39,56].forEach(function(q){ P(q,top+3,3,45,hi); P(q+3,top+3,1,45,lo); });
  [7,26,44].forEach(function(bx){
    P(bx-1,top+8,8,15,S.winFrame); P(bx,top+9,6,13,day?'#7fa4cc':'#ffcf80');
    P(bx+3,top+9,1,13,day?'rgba(255,255,255,.3)':'rgba(0,0,0,.25)');
    lights.push([bx+4,15,'255,207,128',7,.09]);
  });
  P(4,top+27,52,2,lo);
  P(16,148,28,17,S.doorFrame);
  for(let i=0;i<4;i++) P(17+i*7,150,6,15,day?'#a9c4e0':'#ffe9a8');
  [[4,'#c04a6a'],[47,'#4a7ac0']].forEach(function(q){ P(q[0]-1,151,11,13,S.doorFrame); P(q[0],152,9,11,q[1]); P(q[0]+2,154,5,2,'rgba(255,255,255,.35)'); });
  P(12,142,36,5,day?'#4a4058':'#1a1526');
  for(let xx=13;xx<48;xx+=2){ const c=day?'#8a8090':(((xx>>1)%2)?'#ffe27a':'#fff8d8'); P(xx,146,1,1,c); P(xx,142,1,1,c); }
  P(51,124,6,23,day?'#a8486a':'#3a1028'); P(52,125,4,21,day?'#c8688a':'#ff5a9a');
  lights.push([31,146-top,'255,220,120',16,.16]); lights.push([55,135-top,'255,90,150',12,.18]); lights.push([31,157-top,'255,220,150',12,.12]);
  return {svg:doc(62,48,p,'Theatre frontage ('+(day?'day':'night')+')'),
    meta:{lights:lights,spot:{x:13,w:36,col:'255,220,150'},roof:{x:0,w:62,y:0}}};
};

/* ---------- bus shelter + TTC stop flag (38x28) ---------- */
B.shelter=function(o){
  const S=SP(!!o.day), p=[];
  const P=function(x,y,w,h,c){p.push(rect(x+1,y-148,w,h,c));};
  P(-1,157,32,2,S.shRoof); P(-1,157,32,1,S.shHi);
  P(0,159,1,17,S.shPost); P(29,159,1,17,S.shPost);
  P(1,159,28,16,S.shGlass);
  P(18,160,9,14,S.pole); P(19,161,7,12,'#cfe9ff'); P(20,163,5,3,'#4a78c8'); P(20,168,5,2,'#e05a7a');
  P(3,170,12,1,S.pole); P(4,171,1,4,S.pole); P(13,171,1,4,S.pole);
  P(36,148,1,28,'#8a8fb0'); P(33,148,4,4,'#d21f2f'); P(34,149,2,2,'#fff');
  return {svg:doc(38,28,p,'Bus shelter'),meta:{}};
};

/* ---------- street-name sign (KING / JOHN blades) 20x26 ---------- */
B.street_sign=function(o){
  const day=!!o.day, S=SP(day), p=[], bc=day?'#2a5fa8':'#1d3f75', tc=day?'#f4f6fa':'#c4cde6';
  p.push(rect(9,0,1,26,S.pole));
  [['KING',0],['JOHN',8]].forEach(function(b){ p.push(rect(0,b[1],20,7,bc)); glyphs(p,b[0],1,b[1]+1,tc); });
  return {svg:doc(20,26,p,'Street sign KING / JOHN'),meta:{}};
};

/* ---------- mailbox (7x9) ---------- */
B.mailbox=function(){
  const p=[rect(0,0,7,9,'#a82030'),rect(0,0,7,1,'#7a1622'),rect(6,0,1,9,'#7a1622'),rect(1,3,4,1,'#14101e')];
  return {svg:doc(7,9,p,'Mailbox'),meta:{}};
};

/* ---------- street lamp (14x38); dn = which way the arm points ---------- */
B.street_lamp=function(o){
  const S=SP(!!o.day), dn=o.dn<0?-1:1, px0=dn>0?1:11, p=[];
  p.push(rect(px0,0,2,38,S.pole));
  p.push(rect(dn>0?px0:px0-9,0,11,1,S.pole));
  p.push(rect(px0-1,25,4,1,S.pole));
  p.push(rect(px0+dn*9-2,1,5,2,S.head));
  return {svg:doc(14,38,p,'Street lamp'),meta:{poleX:px0}};
};

/* ---------- steam grate (9x1) ---------- */
B.vent=function(o){
  const S=SP(!!o.day), p=[rect(0,0,9,1,S.vent)];
  [1,3,5,7].forEach(function(x){p.push(rect(x,0,1,1,S.ventSlit));});
  return {svg:doc(9,1,p,'Steam grate'),meta:{}};
};

/* ---------- export catalogue (used to write assets/*.svg) ---------- */
function catalog(){
  const geo=towerGeo(12), out=[];
  const add=function(file,name,opts){out.push({file:file,name:name,opts:opts});};
  [['504','east',1],['504','west',1],['304','east',2],['304','west',2]].forEach(function(c){ add('streetcar-'+c[0]+'-'+c[1]+'.svg','streetcar',{dir:c[1]==='east'?1:-1,num:c[0],seed:c[2]}); });
  add('pedestrian-walk-a.svg','pedestrian',{shirt:'#8a2b3a',skin:'#d9ac8c',hair:'#1a1420',frame:0});
  add('pedestrian-walk-b.svg','pedestrian',{shirt:'#8a2b3a',skin:'#d9ac8c',hair:'#1a1420',frame:1});
  add('pedestrian-umbrella.svg','pedestrian',{shirt:'#2a4f86',skin:'#a8744e',hair:'#4a3020',frame:0,umb:'#b03a4a'});
  [false,true].forEach(function(d){
    const t=d?'day':'night';
    add('cn-tower-'+t+'.svg','cn_tower',{geo:geo,day:d});
    add('rogers-centre-'+t+'.svg','dome',{day:d});
    add('cloud-'+t+'.svg','cloud',{w:120,h:14,seed:5,day:d});
    add('theatre-'+t+'.svg','theatre',{day:d});
    add('bus-shelter-'+t+'.svg','shelter',{day:d});
    add('street-sign-'+t+'.svg','street_sign',{day:d});
    add('street-lamp-east-'+t+'.svg','street_lamp',{day:d,dn:1});
    add('street-lamp-west-'+t+'.svg','street_lamp',{day:d,dn:-1});
    add('steam-grate-'+t+'.svg','vent',{day:d});
    add('airplane-'+t+'.svg','airplane',{day:d,dir:1});
    add('building-far-'+t+'.svg','building',{kind:'far',w:18,h:60,ci:0,cap:true,ant:false,seed:11,day:d});
    add('building-tower-'+t+'.svg','building',{kind:'tower',w:18,h:100,seed:12,day:d});
    add('building-mid-'+t+'.svg','building',{kind:'mid',w:22,h:56,ci:1,st:1,seed:13,day:d});
    [[30,44,21],[36,40,22],[28,48,23]].forEach(function(s,i){ add('storefront-'+(i+1)+'-'+t+'.svg','storefront',{w:s[0],h:s[1],seed:s[2],day:d}); });
  });
  add('moon.svg','moon',{});
  add('sun-high.svg','sun',{tone:'yellow'});
  add('sun-low.svg','sun',{tone:'orange'});
  add('mailbox.svg','mailbox',{});
  return out;
}

return {
  build:function(n,o){ if(!B[n]) throw new Error('Unknown asset: '+n); return B[n](o||{}); },
  names:Object.keys(B),
  towerGeo:towerGeo,
  catalog:catalog
};
})();
