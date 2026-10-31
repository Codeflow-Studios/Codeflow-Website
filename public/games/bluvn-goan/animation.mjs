// Visual timing is independent of the fixed-step flight simulation.
const sequences={
  idle:['stand','walk1','stand','walk2'],
  run:['walk1','stand','walk2','stand'],
  thrust:['walk1','stand','walk2','stand'],
  fall:['walk2','stand','walk1','stand'],
  board:['guard','stand','guard','walk1'],
};
export function animationState({over=false,hit=false,board=false,held=false,grounded=false}={}){
  return over?'over':hit?'hit':board?'board':held?'thrust':grounded?'run':'fall';
}
export function animationPose(state,age=0,reduced=false){
  age=Math.max(0,age);
  if(state==='over')return {frame:'guard',bob:0,tilt:reduced?.2:Math.min(1.1,age*1.8),squash:1,leg:0};
  if(state==='hit')return {frame:'guard',bob:0,tilt:reduced?0:Math.sin(age*35)*.17,squash:1,leg:0};
  if(reduced)return {frame:state==='board'?'guard':'stand',bob:0,tilt:0,squash:1,leg:0};
  const fps=state==='run'?8:state==='thrust'?7:state==='idle'?2.8:4.5;
  const sequence=sequences[state]||sequences.idle;
  const frame=state==='thrust'&&age<.14?'rise':sequence[Math.floor(age*fps)%sequence.length];
  const phase=age*Math.PI*2*(state==='idle'?1.1:state==='run'?4:2.5);
  return {frame,bob:Math.sin(phase)*(state==='idle'?1.2:2.3),tilt:state==='thrust'?-.09:state==='fall'?.08:Math.sin(phase)*.025,squash:1+Math.sin(phase)*.012,leg:Math.sin(phase)*.24};
}
