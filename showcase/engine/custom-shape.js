// A bounded, simple outline becomes a watertight extruded mesh. No 3D dependency.
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const area=p=>p.reduce((sum,a,i)=>{const b=p[(i+1)%p.length];return sum+a[0]*b[1]-b[0]*a[1];},0)/2;
function intersects(a,b,c,d){
 const ab1=cross(a,b,c),ab2=cross(a,b,d),cd1=cross(c,d,a),cd2=cross(c,d,b);
 const on=(p,q,r)=>Math.abs(cross(p,q,r))<1e-8&&r[0]>=Math.min(p[0],q[0])-1e-8&&r[0]<=Math.max(p[0],q[0])+1e-8&&r[1]>=Math.min(p[1],q[1])-1e-8&&r[1]<=Math.max(p[1],q[1])+1e-8;
 return (ab1*ab2<0&&cd1*cd2<0)||on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b);
}
export function extrudeShape(input,depth=.45){
 if(!Array.isArray(input)||input.length<3||input.length>1600||!Number.isFinite(depth))throw Error('Draw one closed outline first.');
 let points=[];
 for(const point of input){
  if(!Array.isArray(point)||point.length!==2||!point.every(Number.isFinite)||point.some(v=>Math.abs(v)>2))throw Error('Please draw inside the drawing area.');
  if(!points.length||distance(point,points.at(-1))>.004)points.push([...point]);
 }
 if(points.length>2&&distance(points[0],points.at(-1))<.02)points.pop();
 // Remove the least significant corners. A 64-vertex budget bounds worker cost.
 while(points.length>3){
  let best=-1,error=Infinity;
  for(let i=0;i<points.length;i++){
   const a=points[(i+points.length-1)%points.length],b=points[i],c=points[(i+1)%points.length];
   const e=Math.abs(cross(a,b,c))/Math.max(1e-8,distance(a,c));
   if(e<error){error=e;best=i;}
  }
  if(points.length<=64&&error>.0015)break;
  points.splice(best,1);
 }
 if(points.length<3)throw Error('Give the outline a little more area.');
 for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){
  if(j===i+1||(i===0&&j===points.length-1))continue;
  if(intersects(points[i],points[(i+1)%points.length],points[j],points[(j+1)%points.length]))throw Error('The outline crosses itself. Undo a point or draw a single loop.');
 }
 const min=[0,1].map(k=>Math.min(...points.map(p=>p[k]))),max=[0,1].map(k=>Math.max(...points.map(p=>p[k])));
 const span=Math.max(max[0]-min[0],max[1]-min[1]);
 if(span<.08||Math.abs(area(points))<.003)throw Error('Give the outline a little more area.');
 points=points.map(([x,y])=>[(x-(min[0]+max[0])/2)/span*1.7,-(y-(min[1]+max[1])/2)/span*1.7]);
 if(area(points)<0)points.reverse();
 const remaining=points.map((_,i)=>i),triangles=[];
 while(remaining.length>3){
  let clipped=false;
  for(let i=0;i<remaining.length;i++){
   const a=remaining[(i+remaining.length-1)%remaining.length],b=remaining[i],c=remaining[(i+1)%remaining.length];
   if(cross(points[a],points[b],points[c])<=1e-9)continue;
   if(remaining.some(k=>k!==a&&k!==b&&k!==c&&cross(points[a],points[b],points[k])>=-1e-9&&cross(points[b],points[c],points[k])>=-1e-9&&cross(points[c],points[a],points[k])>=-1e-9))continue;
   triangles.push([a,b,c]);remaining.splice(i,1);clipped=true;break;
  }
  if(!clipped)throw Error('This outline is too tangled. Try a simpler loop.');
 }
 triangles.push(remaining);
 const half=Math.max(.08,Math.min(1,depth))/2,n=points.length;
 const boundary=(a,b)=>(a+1)%n===b||(b+1)%n===a;
 const mesh=[];
 for(const triangle of triangles)for(const sign of [1,-1]){
  const ids=sign===1?triangle:[...triangle].reverse();
  mesh.push({vertices:ids.map(i=>[...points[i],half*sign]),edges:ids.map((id,i)=>boundary(id,ids[(i+1)%3]))});
 }
 for(let i=0;i<n;i++){
  const a=points[i],b=points[(i+1)%n];
  mesh.push({vertices:[[...a,half],[...a,-half],[...b,-half],[...b,half]],edges:[true,true,true,true]});
 }
 return mesh;
}
