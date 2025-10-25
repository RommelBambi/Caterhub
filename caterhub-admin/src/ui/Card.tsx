import { COLORS } from '../theme';
export default function Card({ children, pad=18 }: any){
  return (
    <div style={{background:COLORS.white,border:'1px solid '+COLORS.border,borderRadius:18,padding:pad,boxShadow:'0 6px 12px rgba(15,23,42,.06)'}}>
      {children}
    </div>
  );
}
