import { COLORS } from '../theme';
export default function Button({ label, onClick, variant='solid', size='md', full, danger, disabled, invert, shape='pill' }: any){
  const pv = size==='sm'?8:size==='lg'?14:10; const ph = size==='sm'?14:size==='lg'?20:16;
  const bg = variant==='solid' ? (danger?COLORS.danger:COLORS.primary) : 'transparent';
  const color = variant==='solid' ? '#fff' : (invert?'#fff': danger?COLORS.danger:COLORS.text);
  const borderC = variant==='outline' ? (invert?'#ffffff66': danger?COLORS.danger:COLORS.border) : 'transparent';
  const radius = shape==='square'?8:shape==='rounded'?14:999;
  return (
    <button onClick={disabled?undefined:onClick} disabled={disabled}
      style={{padding:`${pv}px ${ph}px`,borderRadius:radius,background:bg,color,border:`${variant==='outline'?1:0}px solid ${borderC}`,width:full?'100%':undefined,fontWeight:800,letterSpacing:.2}}>
      {label}
    </button>
  );
}
