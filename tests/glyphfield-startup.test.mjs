import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../showcase/engine/hero-worker.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
function harness({throwRaf=false,reduced=false}={}){
 const messages=[],timers=new Map(),frames=new Map();let counter=0,now=0;
 const ctx={setTransform(){},clearRect(){},fill(){}};
 const scope={createField:()=>[{}],framePoints:()=>[],heroLayout:()=>({zoom:1,panX:0,panY:0}),glyphFitScale:()=>1,PATHS:[],COLORS:[],timeline:time=>({phase:'test',progress:1,time}),INTRO_HOLD:2.6,TRANSITION:.5,SHOCK_DURATION:1,extrudeShape:()=>[],Path2D:class{},postMessage:m=>messages.push(m),performance:{now:()=>now},setTimeout:fn=>{const id=++counter;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id),requestAnimationFrame:fn=>{if(throwRaf)throw Error('Unsupported worker rAF');const id=++counter;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id)};
 vm.createContext(scope);vm.runInContext(source,scope);
 const send=m=>scope.onmessage({data:m});
 send({type:'init',canvas:{getContext:()=>ctx},playing:!reduced,reduced,light:false});
 send({type:'settings',columns:128,rows:64});
 return {messages,timers,frames,send,advance(){now+=60;const pending=[...timers.values()];timers.clear();pending.forEach(fn=>fn());}};
}
test('first valid resize renders immediately even if worker rAF never calls back',()=>{
 const h=harness();assert.equal(h.messages.some(m=>m.type==='ready'),false);assert.equal(h.timers.size,0);
 h.send({type:'resize',width:800,height:600,extend:0,topExtension:0,dpr:1,extraRows:0});
 assert.equal(h.messages.filter(m=>m.type==='ready').length,1);
 h.advance();assert.equal(h.messages.filter(m=>m.type==='ready').length,1);assert.equal(h.timers.size,1);
 h.send({type:'visible',visible:false});assert.equal(h.timers.size,0);assert.equal(h.frames.size,0);
});
test('unsupported rAF uses a bounded timer and reduced motion needs no animation callback',()=>{
 const h=harness({throwRaf:true});h.send({type:'resize',width:800,height:600,extend:0,topExtension:0,dpr:1});
 assert(h.messages.some(m=>m.type==='ready'));h.advance();assert.equal(h.timers.size,1);
 h.send({type:'play',playing:false});h.advance();assert.equal(h.timers.size,0);
 const still=harness({reduced:true});still.send({type:'resize',width:800,height:600,extend:0,topExtension:0,dpr:1});
 assert(still.messages.some(m=>m.type==='ready'));assert.equal(still.timers.size,0);
});
