import test from 'node:test';
import assert from 'node:assert/strict';
import {thresholdImage,autoThreshold,hasTransparency} from '../showcase/engine/image-shape.js';
import {extrudeContours} from '../showcase/engine/contour-mesh.js';
import {galleryForm,sculptureLight} from '../showcase/engine/field-sculptures.js';
function raster(width,height,fn){const data=new Uint8ClampedArray(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width;x++)data.set(fn(x,y),(y*width+x)*4);return {width,height,data};}
const donut=raster(80,60,(x,y)=>{const d=Math.hypot(x-40,y-30);return d<24&&d>11?[0,0,0,255]:[255,255,255,255];});
test('automatic threshold traces a hole; disabling holes fills the center',()=>{
 const t=autoThreshold(donut.data),result=thresholdImage(donut,{threshold:t,smoothing:0});
 assert.equal(result.parts,1);assert.equal(result.holes,1);assert.equal(result.contours.length,2);
 const filled=thresholdImage(donut,{threshold:t,keepHoles:false,smoothing:0});assert.equal(filled.contours.length,1);
 const mesh=extrudeContours(result.contours,.5);
 const scene=galleryForm('custom',0,500,500,mesh,{yaw:0,tilt:0});
 assert.equal(sculptureLight(255,255,scene,1).opacity,0,'hole remains empty in the renderer');
});
test('alpha extraction ignores RGB, inversion reverses selection, cleanup removes specks',()=>{
 const image=raster(60,60,(x,y)=>[255,255,255,(x>12&&x<48&&y>12&&y<48)||(x===2&&y===2)?255:0]);
 assert(hasTransparency(image.data));
 const a=thresholdImage(image,{channel:'alpha',threshold:128,cleanup:4,smoothing:0});assert.equal(a.parts,1);assert.equal(a.mask[2*60+2],0);assert.equal(a.mask[30*60+30],1);
 const inv=thresholdImage(image,{channel:'alpha',invert:true,threshold:128,cleanup:4,smoothing:0});assert.equal(inv.mask[30*60+30],0);assert.equal(inv.mask[0],1);
});
test('separate islands survive, largest-only removes other components, empty input is actionable',()=>{
 const image=raster(80,60,(x,y)=>[(x>10&&x<25&&y>10&&y<40)||(x>50&&x<70&&y>10&&y<40)?0:255,0,0,255]);
 const result=thresholdImage(image,{threshold:1,smoothing:0});assert.equal(result.parts,2);assert.equal(result.contours.length,2);assert(extrudeContours(result.contours).length>0);
 assert.equal(thresholdImage(image,{threshold:1,largest:true}).parts,1);
 assert.throws(()=>thresholdImage(raster(20,20,()=>[255,255,255,255])),/No silhouette/);
});
test('multi-contour extrusion is watertight and area excludes holes in either winding',()=>{
 const outer=[[.1,.1],[.9,.1],[.9,.7],[.1,.7]],hole=[[.3,.25],[.7,.25],[.7,.55],[.3,.55]];
 for(const contours of [[outer,hole],[[...hole].reverse(),[...outer].reverse()]]){
  const mesh=extrudeContours(contours,.6),edges=new Map();let capArea=0;
  for(const {vertices:p} of mesh){
   for(let i=0;i<p.length;i++){const key=[p[i].join(','),p[(i+1)%p.length].join(',')].sort().join('|');edges.set(key,(edges.get(key)||0)+1);}
   if(p.length===3&&p.every(p=>p[2]===.3)){const [a,b,c]=p;capArea+=Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2;}
  }
  assert([...edges.values()].every(n=>n===2));assert(Math.abs(capArea-(.48-.12)*(1.7/.8)**2)<1e-8);
 }
});
test('smoothing and complex contours stay bounded and reject crossing rings',()=>{
 for(let smoothing=0;smoothing<=3;smoothing++)assert(extrudeContours(thresholdImage(donut,{smoothing}).contours).length<600);
 assert.throws(()=>extrudeContours([[[.1,.1],[.8,.7],[.1,.7],[.8,.1]]]),/small|cross/);
 assert.throws(()=>extrudeContours([[[.1,.1],[.6,.1],[.6,.6],[.1,.6]],[[.4,.4],[.8,.4],[.8,.7],[.4,.7]]]),/overlap/);
});
test('custom orientation, size, and speed affect projected geometry predictably',()=>{
 const mesh=extrudeContours([[[.1,.1],[.8,.1],[.8,.7],[.1,.7]]]);
 const a=galleryForm('custom',0,500,500,mesh,{speed:0}),b=galleryForm('custom',50,500,500,mesh,{speed:0});assert.deepEqual(a,b);
 const c=galleryForm('custom',0,500,500,mesh,{scale:.5,speed:0});assert.equal(c[0].radius,a[0].radius/2);
 assert.notDeepEqual(galleryForm('custom',5,500,500,mesh),a);
});

test('filling holes removes nested cutouts rather than turning an inner island into a new hole',()=>{
 const image=raster(80,60,(x,y)=>{const d=Math.hypot(x-40,y-30);const ink=(d<24&&d>15)||d<7;return ink?[0,0,0,255]:[255,255,255,255];});
 const result=thresholdImage(image,{keepHoles:false,smoothing:0});assert.equal(result.contours.length,1);assert.equal(result.mask[30*80+40],1);
});
