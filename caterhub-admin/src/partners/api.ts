const BASE = import.meta.env.VITE_API_BASE as string;
export async function submitPartnerApplication(form: any){
  const body = {
    ownerName: form.ownerName,
    businessName: form.businessName,
    email: form.ownerEmail,
    phone: form.ownerPhone,
    address: `${form.address}, ${form.city}`,
  };
  const r = await fetch(`${BASE}/cater-applications`, {
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error('Submit failed');
  return r.json();
}
