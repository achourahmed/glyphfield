// Adapted ACubic worker: glyph field and lighting run off the main thread.
import {createField,framePoints,heroLayout,PATHS,COLORS} from './square-to-bars-model.js';
import {timeline,INTRO_HOLD,TRANSITION} from './square-to-bars-timing.js';
import {SHOCK_DURATION} from './field-shockwave.js';

const lightColors=['#0c1b22','#142731','#232923','#10212a'];
const state={playing:true,reduced:false,inView:true,visible:true,light:false,width:1,height:1,extend:0,topExtension:0,dpr:1,time:0,phase:null};
let canvas=null,ctx=null,field=[],frame=0,last=0,lastDrawn=0,shocks=[],shockTime=0,draws=0,statsAt=0,hasRendered=false;
const paths=PATHS.map(p=>new Path2D(p));
// Workers have requestAnimationFrame in current Chrome, Firefox and Safari; fall back to a timer elsewhere.
const raf=typeof requestAnimationFrame==='function'?requestAnimationFrame:cb=>setTimeout(()=>cb(performance.now()),16);
const caf=typeof cancelAnimationFrame==='function'?cancelAnimationFrame:clearTimeout;

function invalidate(){if(ctx&&field.length&&!frame&&state.visible&&state.inView)frame=raf(draw);}
function stopFrame(){caf(frame);frame=0;last=0;}

function draw(now){
  frame=0;
  const running=state.playing&&!state.reduced;
  // (3) ~30 fps while idling; every frame while a ripple is live.
  if(running&&!shocks.length&&now-lastDrawn<30){invalidate();return;}
  lastDrawn=now;
  const dt=last?Math.min((now-last)/1000,.06):0;last=now;
  if(running)state.time+=dt;
  shockTime+=dt;shocks=shocks.filter(shock=>shockTime-shock.time<SHOCK_DURATION);
  const timing=timeline(state.reduced?INTRO_HOLD+TRANSITION:state.time);
  if(timing.phase!==state.phase){state.phase=timing.phase;postMessage({type:'phase',phase:timing.phase});}
  const {width,height,extend,topExtension,dpr}=state,layout=heroLayout(width-extend,height),{zoom,panY}=layout,panX=layout.panX+extend/2;
  const marks=framePoints(field,timing.progress,{...timing,width,height,zoom,panX,panY,topExtension,ambient:!state.reduced,shocks,shockTime});
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height+topExtension);
  const light=state.light,colors=light?lightColors:COLORS;
  for(let kind=0;kind<paths.length;kind++){
    ctx.fillStyle=colors[kind];const path=paths[kind];            // (2)
    for(const p of marks){
      if(p.kind!==kind)continue;
      const alpha=light?p.lightAlpha:p.alpha;
      if(alpha<.005||p.clearance<=0)continue;
      const scale=p.scale*p.clearance,c=Math.cos(p.angle)*scale,s=Math.sin(p.angle)*scale;
      ctx.setTransform(dpr*c,dpr*s,-dpr*s*p.squeeze,dpr*c*p.squeeze,dpr*p.x,dpr*(p.y+topExtension));
      ctx.globalAlpha=alpha;ctx.fill(path,'evenodd');
    }
  }
  ctx.globalAlpha=1;
  if(!hasRendered){hasRendered=true;postMessage({type:'ready'});}
  draws++;
  if(now-statsAt>=1000){postMessage({type:'stats',fps:Math.round(draws*1000/(now-statsAt))});draws=0;statsAt=now;}
  if(running||shocks.length)invalidate();
}

onmessage=({data:m})=>{
  switch(m.type){
    case 'init':
      canvas=m.canvas;
      ctx=canvas.getContext('2d',{willReadFrequently:true});                 // (1)
      Object.assign(state,{playing:m.playing,reduced:m.reduced,light:m.light});
      break;
    case 'resize':
      Object.assign(state,{width:m.width,height:m.height,extend:m.extend,topExtension:m.topExtension,dpr:m.dpr});
      field=createField(m.extraRows);
      canvas.width=Math.round(m.width*m.dpr);canvas.height=Math.round((m.height+m.topExtension)*m.dpr);
      break;
    case 'theme': state.light=m.light; break;
    case 'play': state.playing=m.playing; if(!m.playing)shocks=[]; last=0; break;
    case 'reduced': state.reduced=m.reduced; state.playing=!m.reduced; if(m.reduced)shocks=[]; last=0; break;
    case 'replay': state.time=0; shocks=[]; state.playing=true; last=0; break;
    case 'shock': shocks=[...shocks.slice(-3),{x:m.x,y:m.y,time:shockTime}]; if(!frame)last=0; break;
    case 'visible': state.visible=m.visible; if(!m.visible)stopFrame(); break;
    case 'inview': state.inView=m.inView; if(m.inView)last=0; else stopFrame(); break;
  }
  invalidate();
};
