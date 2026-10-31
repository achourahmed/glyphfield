import earcut,{deviation} from './vendor/earcut.js';

export const polygonArea=p=>p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1];},0)/2;
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function inside(p,ring){let hit=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){
 const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;
}return hit;}
function crossing(a,b,c,d){return cross(a,b,c)*cross(a,b,d)<-1e-14&&cross(c,d,a)*cross(c,d,b)<-1e-14;}
export function extrudeContours(input,depth=.45){
 if(!Array.isArray(input)||!input.length||input.length>32||!Number.isFinite(depth))throw Error('Draw or import a silhouette first.');
 let rings=input.map(loop=>{
  if(!Array.isArray(loop)||loop.length<3||loop.length>4096)throw Error('Each outline needs at least three points.');
  let p=[];for(const q of loop){
   if(!Array.isArray(q)||q.length!==2||!q.every(Number.isFinite)||q.some(v=>Math.abs(v)>2))throw Error('Keep the outline inside the drawing area.');
   if(!p.length||dist(q,p.at(-1))>1e-5)p.push([...q]);
  }
  if(dist(p[0],p.at(-1))<1e-5)p.pop();
  return p;
 });
 // A global budget keeps imported outlines cheap enough for glyph sampling.
 while(rings.reduce((n,p)=>n+p.length,0)>192){
  let chosen=null,min=Infinity;
  rings.forEach((p,r)=>{if(p.length<=3)return;for(let i=0;i<p.length;i++){
   const a=p[(i+p.length-1)%p.length],b=p[i],c=p[(i+1)%p.length],e=Math.abs(cross(a,b,c))/Math.max(1e-8,dist(a,c));
   if(e<min){min=e;chosen=[r,i];}
  }});
  if(!chosen)break;rings[chosen[0]].splice(chosen[1],1);
 }
 for(const ring of rings){
  if(ring.length<3||Math.abs(polygonArea(ring))<.00002)throw Error('A contour is too small. Increase cleanup or remove it.');
  for(let i=0;i<ring.length;i++)for(let j=i+2;j<ring.length;j++){
   if(i===0&&j===ring.length-1)continue;
   if(crossing(ring[i],ring[(i+1)%ring.length],ring[j],ring[(j+1)%ring.length]))throw Error('The outline crosses itself. Move or remove a point.');
  }
 }
 for(let r=0;r<rings.length;r++)for(let s=r+1;s<rings.length;s++)for(let i=0;i<rings[r].length;i++)for(let j=0;j<rings[s].length;j++)if(crossing(rings[r][i],rings[r][(i+1)%rings[r].length],rings[s][j],rings[s][(j+1)%rings[s].length]))throw Error('Two outlines overlap. Reduce smoothing or edit their points.');
 const all=rings.flat(),xs=all.map(p=>p[0]),ys=all.map(p=>p[1]);
 const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),span=Math.max(maxX-minX,maxY-minY);
 if(span<.08)throw Error('Make the shape a little larger.');
 rings=rings.map(p=>p.map(([x,y])=>[(x-(minX+maxX)/2)/span*1.7,-(y-(minY+maxY)/2)/span*1.7]));
 const sizes=rings.map(p=>Math.abs(polygonArea(p)));
 const parents=rings.map((p,i)=>{let parent=-1;for(let j=0;j<rings.length;j++)if(i!==j&&sizes[j]>sizes[i]&&inside(p[0],rings[j])&&(parent<0||sizes[j]<sizes[parent]))parent=j;return parent;});
 const level=i=>parents[i]<0?0:1+level(parents[i]);
 const levels=rings.map((_,i)=>level(i));
 rings=rings.map((p,i)=>{const positive=levels[i]%2===0;return (polygonArea(p)>0)===positive?p:[...p].reverse();});
 const half=Math.max(.08,Math.min(1,depth))/2,mesh=[];
 for(let r=0;r<rings.length;r++)if(levels[r]%2===0){
  const group=[rings[r],...rings.filter((_,i)=>parents[i]===r)],vertices=group.flat(),holes=[],boundary=new Set();let offset=0;
  for(let k=0;k<group.length;k++){
   const p=group[k];if(k)holes.push(offset);
   for(let i=0;i<p.length;i++){const a=offset+i,b=offset+(i+1)%p.length;boundary.add([a,b].sort((a,b)=>a-b).join(':'));}offset+=p.length;
  }
  const flat=vertices.flat(),triangles=earcut(flat,holes);
  if(!triangles.length||deviation(flat,holes,2,triangles)>.001)throw Error('Could not build this outline. Try less smoothing or a simpler silhouette.');
  for(let i=0;i<triangles.length;i+=3){
   let t=triangles.slice(i,i+3);if(cross(...t.map(k=>vertices[k]))<0)t.reverse();
   for(const sign of [1,-1]){const ids=sign===1?t:[...t].reverse();mesh.push({vertices:ids.map(id=>[...vertices[id],half*sign]),edges:ids.map((id,i)=>boundary.has([id,ids[(i+1)%3]].sort((a,b)=>a-b).join(':')))});}
  }
 }
 for(const ring of rings)for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length];mesh.push({vertices:[[...a,half],[...a,-half],[...b,-half],[...b,half]],edges:[true,true,true,true]});}
 return mesh;
}
