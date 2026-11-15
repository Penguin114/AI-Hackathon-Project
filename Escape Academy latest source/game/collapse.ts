export function collapseProgress(fraction:number){
  const t=Math.max(0,Math.min(1,fraction));
  return {
    pitch:Math.log1p(10000*t)/Math.log(10001),
    white:1-Math.sqrt(Math.max(0,1-t**4)),
    height:t,
  };
}
