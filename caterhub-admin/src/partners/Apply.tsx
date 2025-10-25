import { useMemo, useState } from 'react';
import Stepper from '../ui/Stepper';
import Card from '../ui/Card';
import Field from '../ui/Field';
import Button from '../ui/Button';
import { submitPartnerApplication } from './api';

type StepKey = 'hero'|'step1'|'step2'|'step3'|'step4'|'step5'|'success';

export default function Apply(){
  const [step,setStep] = useState<StepKey>('hero');
  const [form,setForm] = useState<any>({ businessName:'', city:'', address:'', pricePerHead:'', ownerName:'', ownerPhone:'', ownerEmail:'' });
  const current = useMemo(()=> step==='hero'?0: step==='success'?6: Number(step.replace('step','')), [step]);

  return (
    <div style={{ padding: 18 }}>
      {step!=='hero' && step!=='success' && <Stepper current={current} />}
      {step==='hero' && (
        <Card pad={24}>
          <h2 style={{ marginTop:0 }}>Register your caterer with CaterHub</h2>
          <p>Join the marketplace trusted by event planners and companies.</p>
          <Button label="Get Started" shape="square" onClick={()=>setStep('step1')} />
        </Card>
      )}
      {step==='step1' && (
        <Card pad={22}>
          <h3>Business profile</h3>
          <Field label="Business name *" value={form.businessName} onChange={(v:any)=>setForm((s:any)=>({...s,businessName:v}))} />
          <Field label="City *" value={form.city} onChange={(v:any)=>setForm((s:any)=>({...s,city:v}))} />
          <Field label="Address *" value={form.address} onChange={(v:any)=>setForm((s:any)=>({...s,address:v}))} />
          <Field label="Owner name *" value={form.ownerName} onChange={(v:any)=>setForm((s:any)=>({...s,ownerName:v}))} />
          <Field label="Owner email *" value={form.ownerEmail} onChange={(v:any)=>setForm((s:any)=>({...s,ownerEmail:v}))} />
          <Field label="Owner phone" value={form.ownerPhone} onChange={(v:any)=>setForm((s:any)=>({...s,ownerPhone:v}))} />
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:16 }}>
            <Button label="← Back" variant="outline" shape="square" onClick={()=>setStep('hero')} />
            <Button label="Next →" shape="square" onClick={()=>setStep('step5')} />
          </div>
        </Card>
      )}
      {step==='step5' && (
        <Card pad={22}>
          <h3>Review your application</h3>
          <Button label="Submit application" shape="square" onClick={async()=>{
            await submitPartnerApplication(form);
            setStep('success');
          }} />
        </Card>
      )}
      {step==='success' && (
        <Card pad={24}>
          <h2>Thanks for applying!</h2>
          <p>We’ve received your details.</p>
          <Button label="Back to start" variant="outline" shape="square" onClick={()=>setStep('hero')} />
        </Card>
      )}
    </div>
  );
}
