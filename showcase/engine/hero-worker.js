import {extrudeShape} from './custom-shape.js';
// Adapted ACubic worker: glyph field and lighting run off the main thread.
import {createField,framePoints,heroLayout,glyphFitScale,PATHS,COLORS} from './square-to-bars-model.js';
import {timeline,INTRO_HOLD,TRANSITION} from './square-to-bars-timing.js';
import {SHOCK_DURATION} from './field-shockwave.js';

const lightColors=['#0c1b22','#142731','#232923','#10212a'];
const state={playing:true,reduced:false,inView:true,visible:true,light:false,width:1,height:1,extend:0,topExtension:0,dpr:1,time:0,phase:null,form:'mark',customMesh:null,customOptions:{},contrast:1,glyphScale:1,columns:236,rows:100,extraRows:0};
let canvas=null,ctx=null,field=[],frame=0,last=0,lastDrawn=0,shocks=[],shockTime=0,draws=0,statsAt=0,hasRendered=false;
const paths=PATHS.map(p=>new Path2D(p));
// Some browser/low-power states can delay worker animation callbacks. Race a
// cancellable timer with rAF so a supported-but-stalled rAF cannot strand the view.
const raf=callback=>{
 let done=false,frameId=null;
 const cancel=()=>{done=true;clearTimeout(timer);if(frameId!==null&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(frameId);};
 const finish=now=>{if(done)return;cancel();callback(now);};
 const timer=setTimeout(()=>finish(performance.now()),60);
 if(typeof requestAnimationFrame==='function'){try{frameId=requestAnimationFrame(finish);}catch{/* Timer remains active. */}}
 return cancel;
};
const caf=cancel=>{if(cancel)cancel();};

function invalidate(){if(ctx&&state.width>1&&state.height>1&&field.length&&!frame&&state.visible&&state.inView)frame=raf(draw);}
function stopFrame(){caf(frame);frame=0;last=0;}

function draw(now){
  frame=0;
  const running=state.playing&&!state.reduced;
  // (3) ~30 fps while idling; every frame while a ripple is live.
  if(hasRendered&&running&&!shocks.length&&now-lastDrawn<30){invalidate();return;}
  lastDrawn=now;
  const dt=last?Math.min((now-last)/1000,.1):0;last=now;
  if(running)state.time+=dt;
  shockTime+=dt;shocks=shocks.filter(shock=>shockTime-shock.time<SHOCK_DURATION);
  const timing=timeline(state.reduced?INTRO_HOLD+TRANSITION:state.time);
  if(timing.phase!==state.phase){state.phase=timing.phase;postMessage({type:'phase',phase:timing.phase});}
  const {width,height,extend,topExtension,dpr}=state,layout=heroLayout(width-extend,height),{zoom,panY}=layout,panX=layout.panX+extend/2;
  const marks=framePoints(field,timing.progress,{...timing,width,height,zoom,panX,panY,topExtension,ambient:!state.reduced,shocks,shockTime,form:state.form,customMesh:state.customMesh,customOptions:state.customOptions,columns:state.columns,rows:state.rows});
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height+topExtension);
  const light=state.light,colors=light?lightColors:COLORS;
  const fittedSize=glyphFitScale(width,height,state.columns,state.rows,state.glyphScale);
  for(let kind=0;kind<paths.length;kind++){
    ctx.fillStyle=colors[kind];const path=paths[kind];            // (2)
    for(const p of marks){
      if(p.kind!==kind)continue;
      const alpha=Math.min(.98,(light?p.lightAlpha:p.alpha)*state.contrast);
      if(alpha<.005||p.clearance<=0)continue;
      const scale=p.scale*p.clearance*fittedSize,c=Math.cos(p.angle)*scale,s=Math.sin(p.angle)*scale;
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
      ctx=canvas.getContext('2d');
      if(!ctx)throw Error('Canvas2D is unavailable');
      Object.assign(state,{playing:m.playing,reduced:m.reduced,light:m.light});
      break;
    case 'resize':
      Object.assign(state,{width:m.width,height:m.height,extend:m.extend,topExtension:m.topExtension,dpr:m.dpr});
      state.extraRows=m.extraRows||0;
      field=createField(state.extraRows,state.columns,state.rows);
      canvas.width=Math.round(m.width*m.dpr);canvas.height=Math.round((m.height+m.topExtension)*m.dpr);
      // Paint a correctly sized first frame now, before waiting for an animation tick.
      if(!hasRendered&&state.visible&&state.inView){stopFrame();draw(performance.now());return;}
      break;
    case 'settings':
      if(Array.isArray(m.customMesh)&&m.customMesh.length>0&&m.customMesh.length<=700&&m.customMesh.every(face=>Array.isArray(face.vertices)&&face.vertices.length>=3&&face.vertices.length<=4&&face.vertices.every(p=>Array.isArray(p)&&p.length===3&&p.every(v=>Number.isFinite(v)&&Math.abs(v)<4))))state.customMesh=m.customMesh;
      if(m.customOptions){
        const limits={scale:[.5,1.25],speed:[0,1.5],yaw:[-Math.PI,Math.PI],tilt:[-1.23,1.23]};
        for(const [key,[min,max]] of Object.entries(limits))if(Number.isFinite(m.customOptions[key]))state.customOptions[key]=Math.max(min,Math.min(max,m.customOptions[key]));
      }
      if(m.outline){
        try{state.customMesh=extrudeShape(m.outline,m.depth);}
        catch(error){postMessage({type:'shape-error',message:error.message});break;}
      }
      if(['mark','volume','orbit','sphere','custom'].includes(m.form)&&(m.form!=='custom'||state.customMesh)){state.form=m.form;state.time=0;last=0;}
      if(Number.isFinite(m.contrast))state.contrast=Math.max(.4,Math.min(1.4,m.contrast));
      if(Number.isFinite(m.glyphScale))state.glyphScale=Math.max(.5,Math.min(3,m.glyphScale));
      if(Number.isFinite(m.columns)||Number.isFinite(m.rows)){
        if(Number.isFinite(m.columns))state.columns=Math.max(64,Math.min(300,Math.round(m.columns)));
        if(Number.isFinite(m.rows))state.rows=Math.max(32,Math.min(140,Math.round(m.rows)));
        field=createField(state.extraRows,state.columns,state.rows);
      }
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
