// Local-only raster processing. Coordinates share the editor's 400 × 300 space.
export function autoThreshold(data, channel='luminance') {
 const histogram=new Uint32Array(256);let total=0,sum=0;
 for(let i=0;i<data.length;i+=4){
  if(channel!=='alpha'&&data[i+3]<16)continue;
  const v=channel==='alpha'?data[i+3]:Math.round(.2126*data[i]+.7152*data[i+1]+.0722*data[i+2]);
  histogram[v]++;total++;sum+=v;
 }
 let left=0,leftSum=0,best=-1,threshold=128;
 for(let t=0;t<255;t++){
  left+=histogram[t];leftSum+=t*histogram[t];const right=total-left;if(!left||!right)continue;
  const delta=leftSum/left-(sum-leftSum)/right,score=left*right*delta*delta;
  if(score>best){best=score;threshold=t;}
 }
 return Math.max(1,Math.min(254,threshold));
}
export function hasTransparency(data){for(let i=3;i<data.length;i+=4)if(data[i]<250)return true;return false;}
const signedArea=points=>points.reduce((a,p,i)=>{const q=points[(i+1)%points.length];return a+p[0]*q[1]-q[0]*p[1];},0)/2;
function simplifyLine(points,tolerance){
 if(points.length<3)return points;
 const a=points[0],b=points.at(-1),dx=b[0]-a[0],dy=b[1]-a[1],len=dx*dx+dy*dy;
 let max=tolerance*tolerance,index=-1;
 for(let i=1;i<points.length-1;i++){
  const p=points[i],t=len?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/len)):0;
  const d=(p[0]-a[0]-t*dx)**2+(p[1]-a[1]-t*dy)**2;if(d>max){max=d;index=i;}
 }
 return index<0?[a,b]:[...simplifyLine(points.slice(0,index+1),tolerance).slice(0,-1),...simplifyLine(points.slice(index),tolerance)];
}
export function simplifyLoop(points,tolerance=.0015){
 if(points.length<5)return points.map(p=>[...p]);
 let far=1;for(let i=2;i<points.length;i++)if(Math.hypot(points[i][0]-points[0][0],points[i][1]-points[0][1])>Math.hypot(points[far][0]-points[0][0],points[far][1]-points[0][1]))far=i;
 return [...simplifyLine(points.slice(0,far+1),tolerance).slice(0,-1),...simplifyLine([...points.slice(far),points[0]],tolerance).slice(0,-1)];
}
export function smoothLoops(loops,amount=1){
 return loops.map(loop=>{
  let p=loop;
  for(let step=0;step<amount;step++)p=p.flatMap((a,i)=>{const b=p[(i+1)%p.length];return [[a[0]*.75+b[0]*.25,a[1]*.75+b[1]*.25],[a[0]*.25+b[0]*.75,a[1]*.25+b[1]*.75]];});
  return simplifyLoop(p,.0015);
 });
}
export function thresholdImage({data,width,height},{threshold=128,channel='luminance',invert=false,cleanup=12,smoothing=1,keepHoles=true,largest=false}={}){
 if(!width||!height||width*height>512*512||data.length!==width*height*4)throw Error('Use a smaller image preview.');
 const mask=new Uint8Array(width*height);
 for(let i=0;i<mask.length;i++){
  const at=i*4,alpha=data[at+3],value=channel==='alpha'?alpha:.2126*data[at]+.7152*data[at+1]+.0722*data[at+2];
  const inside=channel==='alpha'?value>threshold:value<=threshold;
  mask[i]=(invert?!inside:inside)&&(channel==='alpha'||alpha>16)?1:0;
 }
 if(!keepHoles){
  const exterior=new Uint8Array(mask.length),queue=[];
  const visit=i=>{if(!mask[i]&&!exterior[i]){exterior[i]=1;queue.push(i);}};
  for(let x=0;x<width;x++){visit(x);visit((height-1)*width+x);}
  for(let y=0;y<height;y++){visit(y*width);visit(y*width+width-1);}
  for(let q=0;q<queue.length;q++){const i=queue[q],x=i%width,y=Math.floor(i/width);if(x)visit(i-1);if(x<width-1)visit(i+1);if(y)visit(i-width);if(y<height-1)visit(i+width);}
  for(let i=0;i<mask.length;i++)if(!exterior[i])mask[i]=1;
 }
 // Four-connected components remove isolated specks without joining diagonal shapes.
 const seen=new Uint8Array(mask.length),components=[];
 for(let start=0;start<mask.length;start++)if(mask[start]&&!seen[start]){
  const ids=[start];seen[start]=1;
  for(let q=0;q<ids.length;q++){
   const i=ids[q],x=i%width,y=Math.floor(i/width);
   for(const n of [x?i-1:-1,x<width-1?i+1:-1,y?i-width:-1,y<height-1?i+width:-1])if(n>=0&&mask[n]&&!seen[n]){seen[n]=1;ids.push(n);}
  }
  components.push(ids);
 }
 components.sort((a,b)=>b.length-a.length);let kept=0;
 for(let i=0;i<components.length;i++)if(components[i].length<cleanup||(largest&&i>0))for(const id of components[i])mask[id]=0;else kept++;
 if(!kept)throw Error('No silhouette found. Adjust the threshold or try Invert.');
 if(kept>16)throw Error('Too many fragments. Increase cleanup or keep only the largest part.');
 const edges=[],out=new Map();
 function edge(x,y,xx,yy,dir){const id=edges.length,a=y*(width+1)+x,b=yy*(width+1)+xx;edges.push({a,b,dir,used:false});if(!out.has(a))out.set(a,[]);out.get(a).push(id);}
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(mask[y*width+x]){
  if(y===0||!mask[(y-1)*width+x])edge(x,y,x+1,y,0);
  if(x===width-1||!mask[y*width+x+1])edge(x+1,y,x+1,y+1,1);
  if(y===height-1||!mask[(y+1)*width+x])edge(x+1,y+1,x,y+1,2);
  if(x===0||!mask[y*width+x-1])edge(x,y+1,x,y,3);
 }
 const loops=[];
 for(let start=0;start<edges.length;start++)if(!edges[start].used){
  let id=start;const loop=[];
  do{
   const e=edges[id];e.used=true;loop.push([e.a%(width+1)/width,Math.floor(e.a/(width+1))/height*.75]);
   if(e.b===edges[start].a)break;
   const next=(out.get(e.b)||[]).filter(n=>!edges[n].used);
   // Turn right at diagonal contacts; never weld two islands at a single pixel.
   next.sort((a,b)=>[1,0,3,2].indexOf((edges[a].dir-e.dir+4)%4)-[1,0,3,2].indexOf((edges[b].dir-e.dir+4)%4));
   if(!next.length)throw Error('Could not trace this silhouette. Try another threshold.');id=next[0];
  }while(loop.length<=edges.length);
  if(Math.abs(signedArea(loop))*width*height/.75>=Math.max(2,cleanup)&& (keepHoles||signedArea(loop)>0))loops.push(simplifyLoop(loop,.65/width));
 }
 if(loops.length>32)throw Error('Too many cutouts. Increase cleanup or turn off Preserve holes.');
 const contours=smoothing?smoothLoops(loops,Math.min(3,smoothing)):loops;
 return {contours,mask,width,height,parts:kept,holes:loops.filter(p=>signedArea(p)<0).length};
}
