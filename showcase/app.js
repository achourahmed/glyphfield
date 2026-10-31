import {installDrawing} from './drawing.js';
import {glyphFitScale} from './engine/grid-settings.js';
const art=document.querySelector('#hero-art'),canvas=document.querySelector('#hero-logo');
const motion=document.querySelector('#motion'),replay=document.querySelector('#replay'),phase=document.querySelector('#phase');
const preference=matchMedia('(prefers-reduced-motion: reduce)');
const forms={mark:['ACubic','Three rotating bars.'],volume:['Cube','A rotating cube.'],orbit:['Torus','A rotating ring.'],sphere:['Sphere','A shaded sphere.'],custom:['Your form','Your drawn outline, extruded and rotating.']};
let worker=null,paused=false,failed=false,form='mark',sizeKey='';
const defaults={columns:236,rows:100,glyphScale:1,contrast:1};
const display={...defaults};
try{
 const saved=JSON.parse(localStorage.getItem('glyphfield-display-v1'));
 if(saved){for(const [key,min,max] of [['columns',64,300],['rows',32,140],['glyphScale',.5,3],['contrast',.4,1.4]])if(Number.isFinite(saved[key]))display[key]=Math.max(min,Math.min(max,saved[key]));}
 const theme=localStorage.getItem('glyphfield-theme');if(['light','dark'].includes(theme))document.documentElement.dataset.theme=theme;
}catch{}
function saveDisplay(){try{localStorage.setItem('glyphfield-display-v1',JSON.stringify(display));}catch{}}
function updateFit(){
 const r=art.getBoundingClientRect();if(!r.width||!r.height)return;
 const fitted=glyphFitScale(r.width,r.height,display.columns,display.rows,display.glyphScale);
 document.querySelector('#size-hint').textContent=fitted<display.glyphScale-.01?'At grid limit. Lower columns or rows for larger glyphs.':'Independent of density.';
}
function rangePaint(input){input.style.setProperty('--fill',((Number(input.value)-Number(input.min))/(Number(input.max)-Number(input.min))*100)+'%');}
function syncDisplay(){
 for(const [id,key,percent] of [['columns','columns',false],['rows','rows',false],['size','glyphScale',true],['contrast','contrast',true]]){
  const input=document.querySelector('#'+id);input.value=Math.round(display[key]*(percent?100:1));
  document.querySelector('#'+id+'-value').textContent=input.value+(percent?'%':'');rangePaint(input);
 }
 updateFit();
}
const post=message=>{if(worker&&!failed)worker.postMessage(message);};
function controls(){
 motion.disabled=preference.matches||failed;replay.disabled=failed;
 motion.textContent=preference.matches?'Still view':paused?'Play':'Pause';
 motion.setAttribute('aria-pressed',String(paused));
 if(preference.matches)phase.textContent='Still view';
}
function fallback(error){
 failed=true;worker?.terminate();worker=null;art.classList.remove('ready');
 document.querySelectorAll('[data-form],input[type=range],#draw-open').forEach(e=>e.disabled=true);
 phase.textContent='Static preview';document.querySelector('#render-status').hidden=false;controls();
 if(error)console.warn('Using static glyph preview:',error.message||error);
}
function resize(){
 if(failed)return;const r=art.getBoundingClientRect();if(!r.width||!r.height)return;
 const dpr=Math.min(2,Math.max(1.5,devicePixelRatio||1)),key=[r.width,r.height,dpr].join(':');if(key===sizeKey)return;sizeKey=key;
 post({type:'resize',width:r.width,height:r.height,extend:0,topExtension:0,dpr,extraRows:0});updateFit();
}
try{
 if(!canvas.transferControlToOffscreen)throw Error('OffscreenCanvas unavailable');
 worker=new Worker(new URL('./engine/hero-worker.js',import.meta.url),{type:'module'});
 worker.addEventListener('error',fallback);
 worker.addEventListener('messageerror',fallback);
 worker.addEventListener('message',({data})=>{
  if(data.type==='ready')art.classList.add('ready');
  if(data.type==='phase')phase.textContent=preference.matches?'Still view':data.phase==='ACubic blocks'?'In motion':'Forming';
 });
 const offscreen=canvas.transferControlToOffscreen();
 worker.postMessage({type:'init',canvas:offscreen,playing:!preference.matches,reduced:preference.matches,light:document.documentElement.dataset.theme==='light'},[offscreen]);
 post({type:'settings',...display});
 new ResizeObserver(resize).observe(art);
 new IntersectionObserver(entries=>post({type:'inview',inView:entries[0].isIntersecting}),{rootMargin:'60px'}).observe(art);
 document.addEventListener('visibilitychange',()=>post({type:'visible',visible:!document.hidden}));
 window.addEventListener('resize',resize);document.fonts.ready.then(resize);
 resize();
}catch(error){fallback(error);}
preference.addEventListener('change',()=>{paused=false;post({type:'reduced',reduced:preference.matches});controls();});
controls();
const themeButton=document.querySelector('#theme');
function themeLabel(){
 const light=document.documentElement.dataset.theme==='light';themeButton.setAttribute('aria-label',`Switch to ${light?'dark':'light'} theme`);
 document.querySelector('meta[name="theme-color"]').content=light?'#f6f6f7':'#0c0c0e';
}
themeLabel();
themeButton.addEventListener('click',event=>{
 const light=document.documentElement.dataset.theme!=='light';document.documentElement.dataset.theme=light?'light':'dark';
 event.currentTarget.setAttribute('aria-label',`Switch to ${light?'dark':'light'} theme`);post({type:'theme',light});
 themeLabel();try{localStorage.setItem('glyphfield-theme',light?'light':'dark');}catch{}
});
document.querySelectorAll('[data-form]').forEach(button=>button.addEventListener('click',()=>{
 form=button.dataset.form;document.querySelectorAll('[data-form]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
 document.querySelector('#figure-number').textContent=forms[form][0];document.querySelector('#figure-caption').textContent=forms[form][1];
 art.setAttribute('aria-label',`${forms[form][0]} revealed through the shading of a stationary glyph field.`);
 paused=false;post({type:'settings',form});post({type:'play',playing:!preference.matches});controls();
}));
motion.addEventListener('click',()=>{paused=!paused;post({type:'play',playing:!paused});phase.textContent=paused?'Paused':'In motion';controls();});
replay.addEventListener('click',()=>{paused=false;post({type:'replay'});controls();});
for(const [id,setting,divisor] of [['contrast','contrast',100],['size','glyphScale',100],['columns','columns',1],['rows','rows',1]]){
 document.querySelector('#'+id).addEventListener('input',event=>{
  display[setting]=Number(event.target.value)/divisor;syncDisplay();saveDisplay();post({type:'settings',[setting]:display[setting]});
 });
}
syncDisplay();
document.querySelectorAll('input[type=range]').forEach(input=>{rangePaint(input);input.addEventListener('input',()=>rangePaint(input));});
document.querySelector('#settings-reset').addEventListener('click',()=>{Object.assign(display,defaults);syncDisplay();saveDisplay();post({type:'settings',...display});});
const settingsDialog=document.querySelector('#settings-dialog');
document.querySelector('#settings-open').addEventListener('click',()=>{settingsDialog.showModal();document.querySelector('#settings-title').focus();});
document.querySelector('#settings-close').addEventListener('click',()=>settingsDialog.close());
settingsDialog.addEventListener('click',event=>{const r=settingsDialog.getBoundingClientRect();if(event.target===settingsDialog&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))settingsDialog.close();});
const theaterButton=document.querySelector('#theater');
function theater(enabled){
 document.body.classList.toggle('theater',enabled);theaterButton.setAttribute('aria-pressed',String(enabled));
 theaterButton.setAttribute('aria-label',enabled?'Exit theater view':'Enter theater view');theaterButton.querySelector('span').textContent=enabled?'Exit theater':'Theater';
}
theaterButton.addEventListener('click',()=>theater(!document.body.classList.contains('theater')));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!document.querySelector('dialog[open]')){theater(false);}});
document.querySelector('#copy').addEventListener('click',async()=>{
 const text=document.querySelector('#prompt').textContent,status=document.querySelector('#copy-status');
 try{await navigator.clipboard.writeText(text);status.textContent='Prompt copied.';}catch{status.textContent='Select the prompt above to copy it.';}
});
window.addEventListener('pagehide',event=>{
 if(event.persisted)post({type:'visible',visible:false});
 else worker?.terminate();
});
window.addEventListener('pageshow',()=>post({type:'visible',visible:!document.hidden}));

const skillDialog=document.querySelector('#skill-dialog');
document.querySelector('#skill-open').addEventListener('click',()=>skillDialog.showModal());
document.querySelector('#skill-close').addEventListener('click',()=>skillDialog.close());
installDrawing({apply:({points,depth},select)=>{
 const customButton=document.querySelector('[data-form="custom"]');customButton.hidden=false;
 post({type:'settings',outline:points,depth});
 if(select)customButton.click();
}});
