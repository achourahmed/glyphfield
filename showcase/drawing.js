import {extrudeShape} from './engine/custom-shape.js';

export function installDrawing({apply}){
 const dialog=document.querySelector('#draw-dialog'),pad=document.querySelector('#draw-pad');
 const create=document.querySelector('#draw-create'),status=document.querySelector('#draw-status');
 const depth=document.querySelector('#draw-depth'),depthValue=document.querySelector('#draw-depth-value');
 const undo=document.querySelector('#draw-undo'),redo=document.querySelector('#draw-redo'),clear=document.querySelector('#draw-clear');
 const snap=document.querySelector('#draw-snap'),help=document.querySelector('#draw-help');
 const storageKey='glyphfield-drawing-v1';
 let points=[],activePointer=null,keyboard=[.5,.375],saved=null,mode='freehand',dragIndex=-1;
 let history=[],future=[],initialized=false;
 const copy=p=>p.map(point=>[...point]);
 try{const value=JSON.parse(localStorage.getItem(storageKey));if(value){extrudeShape(value.points,value.depth);saved=value;}}catch{}
 const pointString=p=>`${(p[0]*400).toFixed(2)} ${(p[1]*400).toFixed(2)}`;
 function checkpoint(){history.push(copy(points));if(history.length>40)history.shift();future=[];}
 function render(){
  const path=points.length?'M'+points.map(pointString).join(' L'):'';
  document.querySelector('#draw-line').setAttribute('d',path);
  document.querySelector('#draw-fill').setAttribute('d',points.length>2?path+' Z':'');
  document.querySelector('#draw-empty').style.display=points.length?'none':'';
  const dots=document.querySelector('#draw-points');dots.replaceChildren();
  for(const p of points.length<=32?points:points.length?[points[0],points.at(-1)]:[]){
   const circle=document.createElementNS('http://www.w3.org/2000/svg','circle');
   circle.setAttribute('cx',p[0]*400);circle.setAttribute('cy',p[1]*400);circle.setAttribute('r',mode==='corners'?'3':'2');dots.append(circle);
  }
  create.disabled=points.length<3;undo.disabled=!history.length;redo.disabled=!future.length;clear.disabled=!points.length;
  depthValue.textContent=depth.value+'%';depth.style.setProperty('--fill',((Number(depth.value)-8)/92*100)+'%');
  const cursor=document.querySelector('#draw-cursor');cursor.setAttribute('cx',keyboard[0]*400);cursor.setAttribute('cy',keyboard[1]*400);
 }
 function setMode(value){
  mode=value;
  document.querySelector('#mode-freehand').setAttribute('aria-pressed',String(mode==='freehand'));
  document.querySelector('#mode-corners').setAttribute('aria-pressed',String(mode==='corners'));
  help.textContent=mode==='freehand'?'Drag to sketch. A new stroke replaces the outline.':'Click corners. Drag a point to refine it.';
  render();
 }
 document.querySelector('#mode-freehand').addEventListener('click',()=>setMode('freehand'));
 document.querySelector('#mode-corners').addEventListener('click',()=>setMode('corners'));
 function add(point){
  if(points.length>=1500)return;
  if(!points.length||Math.hypot(point[0]-points.at(-1)[0],point[1]-points.at(-1)[1])*400>2){points.push(point);render();}
 }
 function coords(event){
  const r=pad.getBoundingClientRect();
  let result=[(event.clientX-r.left)/r.width,(event.clientY-r.top)/r.height*.75];
  if(snap.checked)result=result.map(v=>Math.round((v-.025)/.05)*.05+.025);
  return result.map((v,i)=>Math.max(.02,Math.min(i===0?.98:.73,v)));
 }
 pad.addEventListener('pointerdown',event=>{
  if(event.button!==0||activePointer!==null)return;
  event.preventDefault();pad.focus();pad.classList.remove('keyboard');activePointer=event.pointerId;
  pad.setPointerCapture(event.pointerId);checkpoint();const point=coords(event);
  status.textContent='The dotted edge closes your outline.';
  if(mode==='freehand'){points=[];add(point);}
  else{
   dragIndex=points.findIndex(p=>Math.hypot(p[0]-point[0],p[1]-point[1])*400<9);
   if(dragIndex<0){add(point);dragIndex=points.length-1;}
  }
 });
 pad.addEventListener('pointermove',event=>{
  if(event.pointerId!==activePointer)return;
  const point=coords(event);
  if(mode==='freehand')add(point);else if(dragIndex>=0){points[dragIndex]=point;render();}
 });
 const finish=event=>{if(event.pointerId===activePointer){activePointer=null;dragIndex=-1;if(pad.hasPointerCapture(event.pointerId))pad.releasePointerCapture(event.pointerId);render();}};
 pad.addEventListener('pointerup',finish);pad.addEventListener('pointercancel',finish);pad.addEventListener('lostpointercapture',()=>{activePointer=null;dragIndex=-1;});
 function undoChange(){if(history.length){future.push(copy(points));points=history.pop();status.textContent='Change undone.';render();}}
 function redoChange(){if(future.length){history.push(copy(points));points=future.pop();status.textContent='Change restored.';render();}}
 pad.addEventListener('keydown',event=>{
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();event.shiftKey?redoChange():undoChange();return;}
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Backspace','Enter'].includes(event.key))return;
  event.preventDefault();pad.classList.add('keyboard');const step=event.shiftKey?.05:.015;
  if(event.key==='ArrowLeft')keyboard[0]-=step;if(event.key==='ArrowRight')keyboard[0]+=step;
  if(event.key==='ArrowUp')keyboard[1]-=step;if(event.key==='ArrowDown')keyboard[1]+=step;
  keyboard=keyboard.map((v,i)=>Math.max(.02,Math.min(i===0?.98:.73,v)));
  if(event.key===' '){checkpoint();add([...keyboard]);}if(event.key==='Backspace')undoChange();if(event.key==='Enter'&&!create.disabled)create.click();render();
 });
 undo.addEventListener('click',undoChange);redo.addEventListener('click',redoChange);
 clear.addEventListener('click',()=>{checkpoint();points=[];status.textContent='Ready for a new outline.';render();});
 depth.addEventListener('input',render);
 document.querySelector('#draw-open').addEventListener('click',()=>{
  if(!initialized){points=saved?copy(saved.points):[];depth.value=saved?String(Math.round(saved.depth*100)):'45';initialized=true;}
  status.textContent='One closed outline, without holes.';setMode(mode);dialog.showModal();document.querySelector('#draw-title').focus();
 });
 document.querySelector('#draw-close').addEventListener('click',()=>dialog.close());
 create.addEventListener('click',()=>{
  try{
   const amount=Number(depth.value)/100;extrudeShape(points,amount);saved={points:copy(points),depth:amount};
   try{localStorage.setItem(storageKey,JSON.stringify(saved));}catch{}
   apply(saved,true);dialog.close();
  }catch(error){status.textContent=error.message;}
 });
 if(saved)apply(saved,false);render();
}
