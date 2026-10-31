// Light existing grid cells; no extra particles, glow layers or moving glyphs.
import {ROTATION_START} from './square-to-bars-timing.js';
const clamp=value=>Math.max(0,Math.min(1,value));
const smooth=value=>{const t=clamp(value);return t*t*(3-2*t);};
const random=seed=>{let n=Math.imul(seed+137,0x45d9f3b);n=Math.imul(n^(n>>>16),0x45d9f3b);return((n^(n>>>16))>>>0)/4294967296;};

export function sparkleFrame(time,enabled=true){
 const start=ROTATION_START+1.2;
 if(!enabled||time<start)return null;
 const elapsed=time-start,cycle=Math.floor(elapsed/24),age=elapsed-cycle*24;
 // One short pass, then a long rest. Each pass gets its own gentle arc.
 const direction=cycle%2===0?1:-1;
 return {time,fade:smooth(elapsed/2),comet:age>=0&&age<5?{
  age,direction,x:direction>0?.38+.10*random(cycle*7):.54+.10*random(cycle*7),
  y:cycle%2===0?.08+.10*random(cycle*11+3):.76+.05*random(cycle*11+3),
  bend:(random(cycle*17)-.5)*.045
 }:null};
}

export function sparkleLight(index,x,y,frame){
 if(!frame||y<0||y>1)return 0;
 let stars=0,comet=0;
 // Only about 0.35% of cells are stars; a few are visible at any one time.
 if(random(index*29)>.9965){
  const period=14+9*random(index*31),age=(frame.time+period*random(index*37))%period;
  if(age<5.5)stars=.34*Math.sin(Math.PI*age/5.5)**2;
 }
 const c=frame.comet;
 if(c){
  const u=(x-c.x)/(.22*c.direction);
  if(u>=0&&u<=1){
   const pathY=c.y+.09*u+c.bend*Math.sin(Math.PI*u);
   const distance=Math.abs(y-pathY);
   if(distance<.026){
    // Cells brighten as the head arrives, then linger in a soft short tail.
    const since=c.age-u*3.2;
    const pulse=smooth((since+.15)/.3)*(1-smooth(Math.max(0,since)/1.25));
    comet=.58*pulse*Math.exp(-.5*(distance/.009)**2)*smooth(c.age/.5)*(1-smooth((c.age-4.1)/.9));
   }
  }
 }
 return Math.max(stars,comet)*frame.fade;
}
