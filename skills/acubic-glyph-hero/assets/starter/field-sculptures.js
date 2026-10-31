import {LIGHT_START} from './square-to-bars-timing.js';
const smooth=value=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};
const cubeVertices=[[-.65,-.65,-.65],[.65,-.65,-.65],[.65,.65,-.65],[-.65,.65,-.65],[-.65,-.65,.65],[.65,-.65,.65],[.65,.65,.65],[-.65,.65,.65]];
const cube=[[4,5,6,7],[1,0,3,2],[0,4,7,3],[5,1,2,6],[3,7,6,2],[0,1,5,4]].map(face=>face.map(i=>cubeVertices[i]));
const diamond=[];
for(let i=0;i<4;i++){
 const a=[.72*Math.cos(i*Math.PI/2),0,.72*Math.sin(i*Math.PI/2)];
 const b=[.72*Math.cos((i+1)*Math.PI/2),0,.72*Math.sin((i+1)*Math.PI/2)];
 diamond.push([[0,1.05,0],b,a],[[0,-1.05,0],a,b]);
}
const ring=[];
const torusPoint=(u,v)=>[(.78+.25*Math.cos(v))*Math.cos(u),(.78+.25*Math.cos(v))*Math.sin(u),.25*Math.sin(v)];
for(let i=0;i<24;i++)for(let j=0;j<10;j++){
 const u=i*Math.PI/12,v=j*Math.PI/5,du=Math.PI/12,dv=Math.PI/5;
 ring.push([torusPoint(u,v),torusPoint(u+du,v),torusPoint(u+du,v+dv),torusPoint(u,v+dv)]);
}
// Low-poly curved and angular forms share the same shaded-cell renderer.
function outward(polygon){
 const a=polygon[1].map((v,i)=>v-polygon[0][i]),b=polygon[2].map((v,i)=>v-polygon[0][i]);
 const normal=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const center=polygon.reduce((sum,p)=>sum.map((v,i)=>v+p[i]),[0,0,0]);
 return normal.reduce((sum,v,i)=>sum+v*center[i],0)<0?[...polygon].reverse():polygon;
}
const sphere=[];
const spherePoint=(u,v)=>[.85*Math.sin(v)*Math.cos(u),.85*Math.cos(v),.85*Math.sin(v)*Math.sin(u)];
for(let i=0;i<16;i++)for(let j=0;j<8;j++){
 const u=i*Math.PI/8,v=j*Math.PI/8,step=Math.PI/8;
 const a=spherePoint(u,v),b=spherePoint(u+step,v),c=spherePoint(u+step,v+step),d=spherePoint(u,v+step);
 sphere.push(outward(j===0?[a,c,d]:j===7?[a,b,c]:[a,b,c,d]));
}
const triangle=[[-.78,-.55],[.78,-.55],[0,.85]];
const prism=[...[-.48,.48].map(z=>outward(triangle.map(([x,y])=>[x,y,z])))];
for(let i=0;i<3;i++){
 const a=triangle[i],b=triangle[(i+1)%3];
 prism.push(outward([[...a,-.48],[...b,-.48],[...b,.48],[...a,.48]]));
}
const cylinder=[];
const circlePoint=(i,y)=>[.64*Math.cos(i*Math.PI/8),y,.64*Math.sin(i*Math.PI/8)];
for(let i=0;i<16;i++)cylinder.push(outward([circlePoint(i,-.75),circlePoint(i+1,-.75),circlePoint(i+1,.75),circlePoint(i,.75)]));
for(const y of [-.75,.75])cylinder.push(outward(Array.from({length:16},(_,i)=>circlePoint(i,y))));
const base=[[-.72,-.58,-.72],[.72,-.58,-.72],[.72,-.58,.72],[-.72,-.58,.72]];
const pyramid=[outward(base)];
for(let i=0;i<4;i++)pyramid.push(outward([base[i],base[(i+1)%4],[0,.95,0]]));
// Four solid rails retain a real opening as the frame turns.
const rectangularFrame=[
 {center:[-.68,0,0],size:[.20,1,.24]}, {center:[.68,0,0],size:[.20,1,.24]},
 {center:[0,.80,0],size:[.48,.20,.24]}, {center:[0,-.80,0],size:[.48,.20,.24]}
].flatMap(rail=>cube.map(face=>face.map(p=>p.map((v,i)=>v/.65*rail.size[i]+rail.center[i]))));
function rotate([x,y,z],yaw,pitch,roll){
 const ax=x*Math.cos(yaw)+z*Math.sin(yaw),az=z*Math.cos(yaw)-x*Math.sin(yaw);
 const by=y*Math.cos(pitch)-az*Math.sin(pitch),bz=y*Math.sin(pitch)+az*Math.cos(pitch);
 return [ax*Math.cos(roll)-by*Math.sin(roll),ax*Math.sin(roll)+by*Math.cos(roll),bz];
}
function project(mesh,cx,cy,scale,angles,cameraYaw=0){
 const faces=[];
 for(const polygon of mesh){
  const points=polygon.map(p=>rotate(rotate(p,...angles),cameraYaw,0,0));
  const a=points[1].map((v,i)=>v-points[0][i]),b=points[2].map((v,i)=>v-points[0][i]);
  const n=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const length=Math.hypot(...n);if(n[2]<=0||length===0)continue;
  const tone=Math.max(0,(-.45*n[0]+.55*n[1]+.70*n[2])/length);
  const corners=points.map(p=>({x:cx+p[0]*scale,y:cy-p[1]*scale}));
  faces.push({corners,tone,depth:points.reduce((sum,p)=>sum+p[2],0)/points.length,
   left:Math.min(...corners.map(p=>p.x)),right:Math.max(...corners.map(p=>p.x)),
   top:Math.min(...corners.map(p=>p.y)),bottom:Math.max(...corners.map(p=>p.y))});
 }
 return faces.sort((a,b)=>b.depth-a.depth);
}
export function sculptureFrame(time,width,height,enabled=true,scene={}){
 if(!enabled)return [];
 const unit=Math.min(width,height),elapsed=time-LIGHT_START-.4;
 const items=[
  {mesh:cube,x:.50,y:.17,size:.085,angles:[.5+time*.13,.38,.12]},
  {mesh:ring,x:.91,y:.48,size:.078,angles:[.28*Math.sin(time*.12),.65+.16*Math.sin(time*.10),time*.07]},
  {mesh:diamond,x:.53,y:.84,size:.085,angles:[time*-.15,.2+.12*Math.sin(time*.11),-.12]},
  {mesh:sphere,x:.88,y:.16,size:.078,angles:[time*.11,.28,time*.04]},
  {mesh:prism,x:.31,y:.32,size:.080,angles:[.7-time*.12,.34,.18]},
  {mesh:cylinder,x:.39,y:.65,size:.068,angles:[time*.10,.48,-.24]},
  {mesh:pyramid,x:.79,y:.86,size:.072,angles:[.6-time*.11,.22,.08]},
  {mesh:rectangularFrame,x:.69,y:.10,size:.065,angles:[time*.09,.30,.20]}
 ];
 return items.flatMap((item,i)=>{
  const fade=smooth((elapsed-i*.24)/.9);if(!fade)return [];
  const {yaw=0,cx:originX=width/2,cy:originY=height/2,distance=unit*2}=scene;
  // Different fixed depths create parallax as the camera circles the logo.
  const z=[-.16,.22,-.12,.17,-.24,.28,-.30,.08][i]*unit;
  const initialPerspective=distance/(distance-z);
  const local=[(item.x*width-originX)/initialPerspective,(originY-item.y*height)/initialPerspective,z];
  const [rx,ry,depth]=rotate(local,yaw,0,0),perspective=distance/(distance-depth);
  const cx=originX+rx*perspective,cy=originY-ry*perspective,scale=item.size*unit*perspective/initialPerspective;
  const depthFade=.70+.30*smooth((depth/unit+.6)/1.2);
  return [{fade:fade*depthFade,cx,cy,depth,radius:scale*1.35,faces:project(item.mesh,cx,cy,scale,item.angles,yaw)}];
 }).sort((a,b)=>b.depth-a.depth);
}
export function sculptureLight(x,y,items,feather){
 for(const item of items){
  if(Math.abs(x-item.cx)>item.radius+feather||Math.abs(y-item.cy)>item.radius+feather)continue;
  let opacity=0,dark=0,light=0;
  for(const face of item.faces){
   if(x<face.left-feather||x>face.right+feather||y<face.top-feather||y>face.bottom+feather)continue;
   let distance=Infinity;
   for(let i=0;i<face.corners.length;i++){
    const a=face.corners[i],b=face.corners[(i+1)%face.corners.length],dx=b.x-a.x,dy=b.y-a.y;
    distance=Math.min(distance,-(dx*(y-a.y)-dy*(x-a.x))/Math.hypot(dx,dy));
   }
   const amount=smooth((distance+feather)/(2*feather))*(1-opacity);
   opacity+=amount;dark+=amount*(.20+.43*face.tone);light+=amount*(.60-.33*face.tone);
   if(opacity>.999)break;
  }
  if(opacity>0)return {opacity:opacity*item.fade,dark:dark*item.fade,light:light*item.fade,depth:item.depth};
 }
 return {opacity:0,dark:0,light:0,depth:-Infinity};
}
