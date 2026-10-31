// Lightweight shared layout math; importing controls must not load the renderer.
const WIDTH=800,HEIGHT=800,GLYPH_SCALE=WIDTH/230*.97/56;
export function glyphFitScale(width,height,columns,rows,requested){
 const base=GLYPH_SCALE*Math.min(width/WIDTH,height/HEIGHT);
 return Math.min(requested,Math.min(width/columns,height/rows)*.88/(56*base));
}
