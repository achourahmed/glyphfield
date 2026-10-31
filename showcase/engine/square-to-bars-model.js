import {glyphFitScale} from './grid-settings.js';
export {glyphFitScale};
import {LIGHT_START,LIGHT_DURATION} from './square-to-bars-timing.js';
import {particleMotion} from './orbit-choreography.js';
import {sparkleFrame,sparkleLight} from './field-sparkles.js';
import {shockwaveLight} from './field-shockwave.js';
import {sculptureFrame,sculptureLight,galleryForm} from './field-sculptures.js';
import {cameraOrbit} from './scene-orbit.js';
// Native 2D canvas: every glyph stays on its grid cell; only its ink changes.
export const WIDTH=800,HEIGHT=800;
// Redesign switches (2026-10-30): logo floats; sculptures and sparkles off.
export const LOGO_FLOAT={sway:.07,swayRate:.8,bob:.012,bobRate:.55};
export const SHOW_SCULPTURES=false,SHOW_SPARKLES=false;
export const LOGO_SHIFT=-.04; // horizontal offset of the logo as a share of the field width (.09 before the redesign)
export const FIELD_INK=.3; // 1 = the live field; lower = quieter background glyphs, the logo itself is unaffected
export const FIELD_COLUMNS=236,FIELD_ROWS=100;
// Preserve the existing 230-column glyph size independently of grid density.
const GLYPH_SCALE=WIDTH/230*.97/56;
export const PATHS=['M-25-28H11L28-11V25H-11L-25 11Z','M-26-24H-6V15L-26 27ZM5-27 26-15V24H5Z','M-27-26H25V-6H-3L-7-2V25H-27Z','M-26-14-14-26H14L26-14V14L14 26H-14L-26 14ZM-10-7V7L-7 10H7L10 7V-7L7-10H-7Z'];
export const COLORS=['#c4d1d5','#899da9','#dedbd2','#b4c0c7'];
const random=i=>{let a=Math.imul(i+81,0x45d9f3b);a=Math.imul(a^(a>>>16),0x45d9f3b);return((a^(a>>>16))>>>0)/4294967296;};
const ease=t=>t*t*t*(t*(t*6-15)+10);

function rotate([x,y,z],yaw,pitch){
 const ax=x*Math.cos(yaw)+z*Math.sin(yaw),az=-x*Math.sin(yaw)+z*Math.cos(yaw);
 return[ax,y*Math.cos(pitch)-az*Math.sin(pitch),y*Math.sin(pitch)+az*Math.cos(pitch)];
}
function targetPose(p,turns=[0,0,0],width=WIDTH,height=HEIGHT,cameraYaw=0){
 const [lx,ly,lz]=p.localPosition,a=turns[p.beam],c=Math.cos(a),s=Math.sin(a),b=p.beam*Math.PI*2/3;
 const bx=lx*c+lz*s+10.5,by=ly-20.5;
 const [x,y,z]=rotate([bx*Math.cos(b)-by*Math.sin(b),bx*Math.sin(b)+by*Math.cos(b),-lx*s+lz*c],-.35+cameraYaw,.18);
 const perspective=180/(180-z),scale=Math.min(width/120,height/112);
 return {x:width/2+x*scale*perspective,y:height/2+y*scale*perspective,unit:p.scale*scale*perspective,z};
}
// Bound the complete turn, not just its starting face, so the vertical bar never meets the top edge.
const turnBounds=(()=>{
 let min=Infinity,max=-Infinity;
 for(let view=0;view<24;view++)for(let step=0;step<48;step++)for(let beam=0;beam<3;beam++)for(const x of [-6.5,6.5])for(const y of [-22.5,22.5])for(const z of [-5,5]){
  const a=step*Math.PI*2/48,p=targetPose({beam,localPosition:[x,y,z],scale:1},[a,a,a],120,112,view*Math.PI/12);
  min=Math.min(min,p.y-56);max=Math.max(max,p.y-56);
 }
 return{min:min-.15,max:max+.15};
})();
export function heroLayout(width,height){
 const scale=Math.min(width/120,height/112);
 const zoom=Math.min(1.64*.92,height*.88/((turnBounds.max-turnBounds.min)*scale));
 return{zoom,panX:width*LOGO_SHIFT,panY:height*.06-height/2-turnBounds.min*scale*zoom};
}
// Project the actual cuboid faces so the light-only preview shares the sculpture's camera and shading.
function lightFaces(turns,width,height,zoom,panX,panY,cameraYaw){
 const faces=[],light=[-.53,-.61,.58];
 for(let beam=0;beam<3;beam++)for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
  const half=[6.5,22.5,5],other=[0,1,2].filter(i=>i!==axis),normal=[0,0,0];normal[axis]=sign;
  const a=turns[beam],b=beam*Math.PI*2/3;
  const nx=normal[0]*Math.cos(a)+normal[2]*Math.sin(a),nz=-normal[0]*Math.sin(a)+normal[2]*Math.cos(a);
  const n=rotate([nx*Math.cos(b)-normal[1]*Math.sin(b),nx*Math.sin(b)+normal[1]*Math.cos(b),nz],-.35+cameraYaw,.18);
  if(n[2]<.03)continue;
  const corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>{
   const local=[0,0,0];local[axis]=half[axis]*sign;local[other[0]]=half[other[0]]*u;local[other[1]]=half[other[1]]*v;
   const p=targetPose({beam,localPosition:local,scale:1},turns,width,height,cameraYaw);
   return{x:width/2+(p.x-width/2)*zoom+panX,y:height/2+(p.y-height/2)*zoom+panY,z:p.z};
  });
  const area=corners.reduce((sum,p,i)=>{const q=corners[(i+1)%4];return sum+p.x*q.y-p.y*q.x;},0);
  const bounds={left:Math.min(...corners.map(p=>p.x)),right:Math.max(...corners.map(p=>p.x)),top:Math.min(...corners.map(p=>p.y)),bottom:Math.max(...corners.map(p=>p.y))};
  const ends=[-22.5,22.5].map(y=>{
   const p=targetPose({beam,localPosition:[0,y,0],scale:1},turns,width,height,cameraYaw);
   return{x:width/2+(p.x-width/2)*zoom+panX,y:height/2+(p.y-height/2)*zoom+panY};
  });
  faces.push({beam,ends,corners,bounds,winding:Math.sign(area),depth:corners.reduce((sum,p)=>sum+p.z,0)/4,light:.22+.76*Math.max(0,n.reduce((sum,v,i)=>sum+v*light[i],0))});
 }
 return faces.sort((a,b)=>b.depth-a.depth);
}

function coverage(x,y,face,feather){
 const b=face.bounds;
 if(x<b.left-feather||x>b.right+feather||y<b.top-feather||y>b.bottom+feather)return 0;
 let distance=Infinity;
 for(let i=0;i<4;i++){
  const a=face.corners[i],b=face.corners[(i+1)%4],dx=b.x-a.x,dy=b.y-a.y;
  distance=Math.min(distance,face.winding*(dx*(y-a.y)-dy*(x-a.x))/Math.max(.0001,Math.hypot(dx,dy)));
 }
 const t=Math.max(0,Math.min(1,(distance+feather)/(2*feather)));
 return t*t*(3-2*t);
}
function shadeAt(x,y,faces,feather,relief,index,particleElapsed){
 let opacity=0,inkOpacity=0,light=0,depth=0;
 for(const face of faces){
  const amount=coverage(x,y,face,feather)*(1-opacity);
  if(amount<=0)continue;
  // The brighter plane and darker side exchange as a bar turns. Soft coverage
  // transfers the edge between adjacent fixed glyphs instead of popping cells on/off.
  const tone=(.32+.66*face.light)*(1-relief)+(.14+.95*face.light)*relief;
  // Reuse the study's staggered travelling exit/return, but modulate ink, not grid geometry.
  const [start,end]=face.ends,dx=end.x-start.x,dy=end.y-start.y;
  const along=Math.max(0,Math.min(1,((x-start.x)*dx+(y-start.y)*dy)/Math.max(1,dx*dx+dy*dy)));
  const motion=particleMotion({index,beam:face.beam,size:1+random(index*61),localPosition:[0,along*45-22.5,0]},particleElapsed);
  const wave=1-relief*.38*(1-motion.scale);
  light+=amount*tone*wave;depth+=amount*face.depth;inkOpacity+=amount*wave;opacity+=amount;
  if(opacity>.999)break;
 }
 return{opacity:inkOpacity,coverage:opacity,light,depth:opacity?depth/opacity:0};
}
export function createField(extraRows=0,columns=FIELD_COLUMNS,rows=FIELD_ROWS){
 columns=Math.max(64,Math.min(300,Math.round(Number.isFinite(columns)?columns:FIELD_COLUMNS)));
 rows=Math.max(32,Math.min(140,Math.round(Number.isFinite(rows)?rows:FIELD_ROWS)));
 const pitchX=WIDTH/columns,pitchY=HEIGHT/rows;
 return Array.from({length:columns*(rows+extraRows)},(_,index)=>({
  index,source:{x:(index%columns+.5)*pitchX,y:((index<columns*rows?Math.floor(index/columns):-1-Math.floor((index-columns*rows)/columns))+.5)*pitchY},
  kind:Math.floor(random(index)*4),angle:Math.floor(random(index*3)*4)*Math.PI/2,
  // Tighter rows and columns change spacing only, never the mark dimensions.
  startScale:GLYPH_SCALE,startAlpha:.48+random(index*13)*.45,
  // Horizontal streams advance right to left. Each row has its own head
  // offset, with small cell jitter so the leading edge never becomes a wipe.
  revealOrder:.82*(1-(index%columns+.5)/columns)+.14*random(Math.floor(index/columns)*97+41)+.04*random(index*79+23)
 }));
}
export function framePoints(field,progress,{barTurns=[0,0,0],particleElapsed=null,time=0,fieldElapsed=time,width=WIDTH,height=HEIGHT,zoom=1,panX=0,panY=0,topExtension=0,ambient=true,shocks=[],shockTime=0,form='mark',customMesh=null,columns=FIELD_COLUMNS,rows=FIELD_ROWS}={}){
 const relief=ease(Math.max(0,Math.min(1,progress))),fit=Math.min(width/WIDTH,height/HEIGHT);
 const cameraYaw=cameraOrbit(time,ambient),sceneScale=Math.min(width/120,height/112)*zoom;
 // the logo does not follow the camera orbit. Instead it floats a
 // little — a slow sway in yaw and a gentle bob, on different periods so
 // the motion never repeats visibly. Both are off under reduced motion.
 const floatYaw=ambient?LOGO_FLOAT.sway*Math.sin(time*LOGO_FLOAT.swayRate):0;
 const floatBob=ambient?height*LOGO_FLOAT.bob*Math.sin(time*LOGO_FLOAT.bobRate+1.3):0;
 const faces=form==='mark'?lightFaces(barTurns,width,height,zoom,panX,panY+floatBob,floatYaw):[];
 const gallery=form==='mark'?null:galleryForm(form,ambient?time:0,width,height,customMesh);
 const feather=Math.max(.9,Math.min(width/columns,height/rows)*.44);
 // the other objects can be switched off to look at the logo alone.
 const sparkles=sparkleFrame(time,ambient&&SHOW_SPARKLES);
 const sculptures=sculptureFrame(time,width,height,ambient&&SHOW_SCULPTURES,{yaw:cameraYaw,cx:width/2+panX,cy:height/2+panY,distance:180*sceneScale});
 return field.map(p=>{
  // A staggered right-to-left scan reveals the logo once; background cells
  // return to their resting ink immediately behind the passing stream.
  const tileFade=.22+.16*random(p.index*89+31);
  const delay=LIGHT_START+p.revealOrder*(LIGHT_DURATION-.38);
  const reveal=ease(Math.max(0,Math.min(1,(fieldElapsed-delay)/tileFade)));
  const strength=1-(1-reveal)*(1-relief);
  const x=p.source.x/WIDTH*width,y=p.source.y/HEIGHT*height;
  // Stable per-cell thresholds dissolve the field toward the left without a hard edge or flicker.
  const fieldX=p.source.x/WIDTH;
  // Carry the soft tail beneath the end of the headline while keeping the
  // fully visible region fixed. Feather the canvas boundary to avoid a seam.
  const edgeFade=ease(Math.max(0,Math.min(1,fieldX/.12)));
  const envelope=ease(Math.max(0,Math.min(1,(fieldX+.16)/.735)))*edgeFade;
  const grain=ease(Math.max(0,Math.min(1,(envelope-random(p.index*53+7)+.30)/.60)));
  // A broad continuous fade, with quiet individual remnants instead of bright islands.
  // A short top feather removes the hard first row without washing out the whole field.
  const topFeather=ease(Math.max(0,Math.min(1,(y+topExtension+12)/(26+random(p.index*59)*10))));
  // Carry the existing grid to the page edge, keeping the header/copy quiet.
  const upperQuiet=y<0?.38+.62*ease(Math.max(0,1+y/Math.max(1,topExtension))):1;
  // A few stable outliers survive deep into the fade, keeping the left edge irregular and airy.
  const remnant=random(p.index*67+11)>.92?(.025+.075*random(p.index*71+19))*(1-envelope):0;
  // FIELD_INK quiets the background glyphs so the logo sits on a near-black page, as on resend.com.
  const backgroundFade=(envelope*(.35+.65*grain)+remnant*edgeFade)*upperQuiet*FIELD_INK;
  const seed=random(p.index*31)*Math.PI*2,baseline=p.startAlpha*(.12+.22*Math.max(0,Math.sin(seed))**6);
  const sampled=gallery?sculptureLight(x,y,gallery,feather):null;
  const surface=sampled?{opacity:sampled.opacity,coverage:sampled.opacity,light:sampled.dark*1.35,depth:sampled.opacity?sampled.depth:0}:shadeAt(x,y,faces,feather,relief,p.index,particleElapsed);
  const selected=random(p.index*43)>.28,ink=selected?(.80+.20*random(p.index*47)):.38;
  const accent=surface.light*ink;
  // One short pulse per cell, without a hold or repeating background scan.
  const pulseAge=Math.max(0,time-delay);
  const fallDuration=.35+.25*random(p.index*103+53);
  const pulseRise=ease(Math.max(0,Math.min(1,pulseAge/tileFade)));
  const pulseFall=ease(Math.max(0,Math.min(1,(pulseAge-tileFade)/fallDuration)));
  // Geometric coverage excludes the logo even when its turning faces dim.
  const scan=time>=delay?pulseRise*(1-pulseFall)*(1-surface.coverage):0;
  // Keep the sculpture's face lighting untouched, even during its dimming wave.
  const sparkle=sparkleLight(p.index,p.source.x/WIDTH,p.source.y/HEIGHT,sparkles)*(1-surface.coverage);
  const ripple=ambient?shockwaveLight(x,y,shocks,shockTime,width,height):0;
  const miniature=sculptureLight(x,y,sculptures,feather);
  const miniatureMask=miniature.opacity*(1-surface.coverage);
  const background=(baseline+(.42-baseline)*scan+sparkle)*(1-miniatureMask)+miniature.dark*(1-surface.coverage);
  const frontCoverage=ease(Math.max(0,Math.min(1,(miniature.depth-surface.depth*sceneScale+6)/12)))*surface.coverage*strength;
  const frontMask=miniature.opacity*frontCoverage;
  const alpha=(background*backgroundFade*(1-surface.opacity*strength)+accent*strength)*(1-frontMask)+miniature.dark*frontCoverage*backgroundFade;
  // Light surfaces need a distinct logo ink range, not a boost to the entire background.
  const coverage=surface.opacity*strength,faceTone=surface.opacity>0?surface.light/surface.opacity:0;
  const baseAlpha=baseline;
  const backgroundInk=.055+.23*(1-Math.exp(-4*Math.pow(baseAlpha,1.25)));
  // On a light surface, illuminated faces need less dark ink; shaded sides need
  // more. Preserve a broad tonal range instead of darkening every face equally.
  const illumination=Math.max(0,Math.min(1,(faceTone-.30)/.70));
  const logoInk=(.99-.54*Math.pow(illumination,.65))*(.97+.03*ink);
  const lightBackground=(backgroundInk+(.20-backgroundInk)*scan+sparkle*.72)*(1-miniatureMask)+miniature.light*(1-surface.coverage);
  const lightAlpha=(lightBackground*backgroundFade*(1-coverage)+logoInk*coverage)*(1-frontMask)+miniature.light*frontCoverage*backgroundFade;
  // Cross the logo gently as well, preserving its stronger face shading.
  const rippleInk=ripple*(backgroundFade*(1-coverage)+.35*coverage);
  return {index:p.index,kind:p.kind,x,y,z:0,angle:p.angle,scale:p.startScale*fit,alpha:Math.max(0,Math.min(.98,alpha+rippleInk))*topFeather,lightAlpha:Math.max(0,Math.min(.98,lightAlpha+rippleInk*.8))*topFeather,squeeze:1,clearance:1,moving:false};
 });
}
