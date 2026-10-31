export const SHOCK_DURATION=2.8;
const smooth=value=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};

// Distances use CSS pixels so the ring stays circular on wide and tall fields.
export function shockwaveLight(x,y,shocks,time,width,height){
 const unit=Math.min(width,height);
 let light=0;
 for(const shock of shocks){
  const age=time-shock.time;
  if(age<0||age>=SHOCK_DURATION)continue;
  const distance=Math.hypot(x-shock.x*width,y-shock.y*height);
  const radius=age*unit*.48,thickness=unit*(.028+.012*age/SHOCK_DURATION);
  const offset=(distance-radius)/thickness;
  const crest=Math.exp(-.5*offset*offset);
  const wake=Math.exp(-.5*((offset+1.6)/1.2)**2);
  const fade=smooth(age/.18)*(1-smooth(age/SHOCK_DURATION));
  light+=(.32*crest-.055*wake)*fade;
 }
 return Math.max(-.10,Math.min(.38,light));
}
