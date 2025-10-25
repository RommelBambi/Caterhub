import Card from './Card'; import { COLORS } from '../theme';
export default function Stepper({ current }:{ current:number }){
  const items = ['Business','Owner','Menu','Compliance','Review'];
  return (
    <Card pad={16}>
      <div style={{display:'flex',alignItems:'center'}}>
        {items.map((t,i)=>{const idx=i+1; const done=current>idx; const active=current===idx; return (
          <div key={t} style={{display:'contents'}}>
            <div style={{flex:1, textAlign:'center', padding:'0 4px'}}>
              <div style={{width:32,height:32,borderRadius:16,background: (done||active)?COLORS.primary:COLORS.white,border:`1px solid ${(done||active)?COLORS.primary:COLORS.border}`,margin:'0 auto 6px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <span style={{color:(done||active)?'#fff':COLORS.textLight,fontWeight:900}}>{idx}</span>
              </div>
              <div style={{color:active?COLORS.primary: done?COLORS.text:COLORS.textLight, fontWeight: active?900:600}}>{t}</div>
            </div>
            {i<items.length-1 && <div style={{flex:1.1,height:2,background:done?COLORS.primary:COLORS.border,borderRadius:2}} />}
          </div>
        );})}
      </div>
    </Card>
  );
}
