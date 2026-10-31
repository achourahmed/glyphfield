import test from 'node:test';
import assert from 'node:assert/strict';
import {extrudeShape} from '../showcase/engine/custom-shape.js';
import {createField,framePoints,glyphFitScale} from '../showcase/engine/square-to-bars-model.js';
import {galleryForm,sculptureLight} from '../showcase/engine/field-sculptures.js';
const square=[[.1,.1],[.9,.1],[.9,.7],[.1,.7]];
const concave=[[.1,.1],[.9,.1],[.9,.3],[.4,.3],[.4,.7],[.1,.7]];
test('extrudes both winding directions into a closed mesh with paired edges',()=>{
 for(const outline of [square,[...square].reverse(),concave]){
  const mesh=extrudeShape(outline,.6),edges=new Map();
  for(const {vertices} of mesh)for(let i=0;i<vertices.length;i++){
   const a=vertices[i].join(','),b=vertices[(i+1)%vertices.length].join(',');
   const key=[a,b].sort().join('|');edges.set(key,(edges.get(key)||0)+1);
  }
  assert([...edges.values()].every(n=>n===2));
  assert.equal(Math.max(...mesh.flatMap(f=>f.vertices.map(p=>p[2]))),.3);
 }
});
test('rejects crossing, tiny and invalid outlines without breaking the renderer',()=>{
 for(const outline of [[[0,0],[1,1],[0,1],[1,0]],[[0,0],[.001,0],[0,.001]],[[NaN,0],[1,1],[0,1]],[]])assert.throws(()=>extrudeShape(outline));
});
test('caps keep a concave notch and rendering stays finite through a full turn',()=>{
 const mesh=extrudeShape(concave,.45);
 const triangleArea=f=>{const [a,b,c]=f.vertices;return Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2;};
 const front=mesh.filter(f=>f.vertices.every(p=>p[2]===.225));
 assert(Math.abs(front.reduce((sum,f)=>sum+triangleArea(f),0)-.28*(1.7/.8)**2)<1e-8);
 for(let t=0;t<36;t+=3){
  const scene=galleryForm('custom',t,700,500,mesh);
  let seen=0;
  for(let y=90;y<420;y+=12)for(let x=150;x<550;x+=12){
   const sample=sculptureLight(x,y,scene,1);
   assert(Number.isFinite(sample.opacity)&&Number.isFinite(sample.dark)&&Number.isFinite(sample.light));
   assert(sample.opacity>=0&&sample.opacity<=1);if(sample.opacity>.8)seen++;
  }
  assert(seen>10);
 }
});
test('long freehand outlines have a bounded face count',()=>{
 const outline=Array.from({length:1200},(_,i)=>[.5+.4*Math.cos(i*Math.PI/600),.4+.3*Math.sin(i*Math.PI/600)]);
 assert(extrudeShape(outline).length<=188);
});

test('custom forms preserve fixed glyph positions and finite lighting in still and moving views',()=>{
 const field=createField(),mesh=extrudeShape(concave,.7);
 const still=framePoints(field,1,{form:'custom',customMesh:mesh,width:640,height:480,time:4,ambient:false});
 const turned=framePoints(field,1,{form:'custom',customMesh:mesh,width:640,height:480,time:10,ambient:true});
 assert(still.some(p=>p.alpha>.3));
 for(let i=0;i<field.length;i++){
  assert.equal(still[i].x,turned[i].x);assert.equal(still[i].y,turned[i].y);
  for(const p of [still[i],turned[i]])for(const key of ['alpha','lightAlpha'])assert(Number.isFinite(p[key])&&p[key]>=0&&p[key]<=.98);
 }
});

test('density changes alter counts while preserving glyph size and bounds',()=>{
 const sparse=createField(0,80,40),dense=createField(0,300,140);
 assert.equal(sparse.length,3200);assert.equal(dense.length,42000);
 assert.equal(sparse[0].startScale,dense[0].startScale);
 for(const p of [...sparse,...dense]){assert(p.source.x>0&&p.source.x<800);assert(p.source.y>0&&p.source.y<800);}
 assert.equal(createField(0,NaN,Infinity).length,23600);
 const marks=framePoints(sparse,1,{columns:80,rows:40,width:1000,height:700,time:8});
 assert(marks.some(p=>p.alpha>.2));assert(marks.every(p=>Number.isFinite(p.alpha)&&Number.isFinite(p.lightAlpha)));
});
test('larger marks fit inside cells and gain room at lower density',()=>{
 for(const [w,h,c,r] of [[1000,600,236,100],[375,500,80,40],[1800,900,300,140]]){
  const fit=glyphFitScale(w,h,c,r,3),base=createField()[0].startScale*Math.min(w/800,h/800);
  assert(fit<=3);assert(base*fit*56<=Math.min(w/c,h/r)*.88+1e-8);
 }
 assert(glyphFitScale(1000,600,80,40,3)>glyphFitScale(1000,600,236,100,3));
});
