const URL='https://evtkeyfjgqwarsmlzrkh.supabase.co',KEY='sb_publishable_7lGio_RVVgkVASYYyBHQIg_GvL-8ELD';
export const supabase=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,storageKey:'jfs-rekap-auth'}});
export async function session(){return (await supabase.auth.getSession()).data.session}
export function login(next=location.href){location.href='rekap-login.html?next='+encodeURIComponent(next)}
function accessError(message){
  const box=document.createElement('div');
  box.style.cssText='position:fixed;inset:0;z-index:999999;display:grid;place-items:center;padding:20px;background:#0d1117;color:#fff;font:15px Arial;text-align:center;visibility:visible';
  box.innerHTML='<div style="max-width:520px;background:#151a22;border:1px solid #334155;border-radius:18px;padding:24px;box-shadow:0 20px 60px #0008"><div style="font-size:20px;font-weight:800;margin-bottom:10px">Rekap Muatan belum dapat dibuka</div><div style="color:#cbd5e1;line-height:1.6">'+message+'</div><button id="rekap-retry" style="margin-top:18px;padding:11px 16px;border:0;border-radius:9px;background:#2563eb;color:#fff;font-weight:800">Coba Lagi</button></div>';
  document.body.appendChild(box); document.getElementById('rekap-retry').onclick=()=>location.reload();
}
export async function requireAccess(){
  try{
    const s=await Promise.race([session(),new Promise((_,rej)=>setTimeout(()=>rej(new Error('TIMEOUT_SESSION')),10000))]);
    if(!s){login();return false}
    const r=await Promise.race([
      supabase.rpc('jfs_get_my_app_subscription',{p_app_code:'REKAP-MUATAN'}),
      new Promise((_,rej)=>setTimeout(()=>rej(new Error('TIMEOUT_SUBSCRIPTION')),10000))
    ]);
    if(r.error)throw r.error;
    if(r.data?.[0]?.status==='expired'){location.href='rekap-subscription.html';return false}
    return true;
  }catch(e){
    console.error('Rekap Muatan access check failed',e);
    const msg=e?.message==='TIMEOUT_SESSION'||e?.message==='TIMEOUT_SUBSCRIPTION'?'Koneksi ke layanan login/subscription terlalu lama. Periksa internet lalu coba lagi.':'Pemeriksaan akses gagal: '+(e?.message||'kesalahan tidak diketahui')+'.';
    accessError(msg); return false;
  }
}