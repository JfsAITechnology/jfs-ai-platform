/* JFS AI — Supabase-backed Tenant Store + Admin Gate */
(function(){
  'use strict';
  const SUPABASE_URL='https://evtkeyfjgqwarsmlzrkh.supabase.co';
  const SUPABASE_KEY='sb_publishable_7lGio_RVVgkVASYYyBHQIg_GvL-8ELD';
  const KEY='jfs_ai_tenants_cache_v4';
  const dateText=v=>v?new Date(String(v).slice(0,10)+'T00:00:00').toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}):'-';
  const toastSafe=m=>window.toast?window.toast(m):console.log(m);
  let cache=[];try{cache=JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){cache=[]}
  function saveCache(){localStorage.setItem(KEY,JSON.stringify(cache))}
  function projectUrl(t){
    const code=String(t.tenant_code||'').toUpperCase();
    const name=String(t.business_name||'').toLowerCase();
    if(code==='MAS-FIRMAN-PRATAMA'||name.includes('mas firman pratama')) return 'https://jfsaitechnology.github.io/jfs-ai-platform/mas-firman-pratama/demo.html';
    return '';
  }
  function normalize(t,sub){return{id:t.id,name:t.business_name,type:t.business_type||'UMKM',whatsapp:t.whatsapp||'',status:t.status||'inactive',plan:sub?.plan_name||'-',startedAt:sub?.start_date||null,expiresAt:sub?.end_date||null,subscriptionStatus:sub?.status||null,paymentStatus:sub?.payment_status||null,projectUrl:projectUrl(t)}}
  window.JFSTenantStore={key:KEY,all:()=>cache,get:id=>cache.find(t=>t.id===id),save:t=>{const i=cache.findIndex(x=>x.id===t.id);if(i>=0)cache[i]=t;else cache.push(t);saveCache();return t},seed:()=>cache};
  const gate=document.createElement('div');gate.id='jfs-admin-gate';gate.style.cssText='position:fixed;inset:0;z-index:2147483647;background:radial-gradient(circle at 80% 10%,#1687ff25,transparent 35%),#060b18;color:#fff;display:flex;align-items:center;justify-content:center;padding:20px;font-family:Arial,Helvetica,sans-serif';
  gate.innerHTML='<div style="width:min(430px,100%);background:#0d1630;border:1px solid #ffffff18;border-radius:18px;padding:30px;box-shadow:0 25px 80px #0008"><div style="text-align:center;margin-bottom:22px"><div style="font-size:28px;font-weight:800">JFS <span style="color:#12d7ff">AI</span></div><div style="font-size:10px;color:#91a0bd;letter-spacing:1.5px;margin-top:5px">TECHNOLOGY ADMIN PLATFORM</div></div><h2 style="font-size:20px;margin-bottom:7px">🔐 Admin Login</h2><p style="font-size:12px;color:#91a0bd;line-height:1.5;margin-bottom:18px">Login diperlukan untuk mengakses dashboard dan Tenant Management.</p><form id="jfsAdminForm"><input id="jfsAdminEmail" type="email" autocomplete="username" placeholder="Email admin" required style="width:100%;padding:12px;margin-bottom:10px;border-radius:8px;border:1px solid #ffffff18;background:#07101f;color:#fff"><input id="jfsAdminPassword" type="password" autocomplete="current-password" placeholder="Password" required style="width:100%;padding:12px;margin-bottom:12px;border-radius:8px;border:1px solid #ffffff18;background:#07101f;color:#fff"><button id="jfsAdminBtn" type="submit" style="width:100%;padding:12px;border:0;border-radius:8px;background:linear-gradient(135deg,#0879ff,#11a7ff);color:#fff;font-weight:700;cursor:pointer">Sign In</button><div id="jfsAdminMsg" style="font-size:11px;color:#ff8290;margin-top:12px;line-height:1.5"></div></form></div></div>';
  document.documentElement.style.overflow='hidden';document.body.appendChild(gate);
  function loadSupabase(){return new Promise((resolve,reject)=>{if(window.supabase)return resolve();const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';s.onload=resolve;s.onerror=()=>reject(new Error('Gagal memuat Supabase.'));document.head.appendChild(s)})}
  function loadScript(id,src){return new Promise((resolve,reject)=>{if(document.getElementById(id))return resolve();const s=document.createElement('script');s.id=id;s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error('Gagal memuat '+src));document.body.appendChild(s)})}
  function logout(){window.JFS_ADMIN_SUPABASE?.auth.signOut().finally(()=>location.reload())}
  function addLogout(){if(document.getElementById('jfsLogoutBtn'))return;const b=document.createElement('button');b.id='jfsLogoutBtn';b.className='btn danger';b.textContent='🚪 Logout Admin';b.type='button';b.onclick=logout;b.style.cssText='position:fixed;right:18px;bottom:18px;z-index:20';document.body.appendChild(b)}
  async function hydrate(){const c=window.JFS_ADMIN_SUPABASE;if(!c)return;const {data:tenants,error}=await c.from('tenants').select('id,tenant_code,business_name,business_type,whatsapp,status,ai_enabled').order('business_name');if(error)throw error;const ids=(tenants||[]).map(t=>t.id);let subs=[];if(ids.length){const r=await c.from('tenant_subscriptions').select('tenant_id,start_date,end_date,status,payment_status,subscription_plans(name)').in('tenant_id',ids).order('end_date',{ascending:false});if(r.error)throw r.error;subs=r.data||[]}cache=(tenants||[]).map(t=>{const s=subs.find(x=>x.tenant_id===t.id);return normalize(t,s?{...s,plan_name:s.subscription_plans?.name}:null)});saveCache();if(typeof window.renderTenants==='function'){window.renderTenants();window.renderTenants('tenantPageList')}}
  async function createTenantRemote(){const c=window.JFS_ADMIN_SUPABASE;if(!c)throw new Error('Sesi admin belum siap.');const name=document.getElementById('tname').value.trim(),type=document.getElementById('ttype').value,wa=document.getElementById('twa').value.trim();if(!name)return toastSafe('Nama bisnis harus diisi.');const base=name.toUpperCase().replace(/[^A-Z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'TENANT';let code=base;for(let i=1;;i++){const r=await c.from('tenants').select('id').eq('tenant_code',code).maybeSingle();if(r.error)throw r.error;if(!r.data)break;code=base+'-'+i}const ins=await c.from('tenants').insert({tenant_code:code,business_name:name,business_type:type,whatsapp:wa||null,status:'active',ai_enabled:true}).select('id,tenant_code,business_name,business_type,whatsapp,status,ai_enabled').single();if(ins.error)throw ins.error;closeModal();document.getElementById('tname').value='';document.getElementById('twa').value='';await hydrate();toastSafe('Tenant '+name+' berhasil dibuat di Supabase.')}
  function installCreateOverride(){window.createTenant=createTenantRemote}
  function installProjectLinks(){
    if(window.__JFS_PROJECT_LINKS_INSTALLED)return;
    const original=window.renderTenants;
    if(typeof original!=='function')return;
    window.renderTenants=function(target='tenantList'){
      original(target);
      const box=document.getElementById(target);if(!box)return;
      const data=JFSTenantStore.all();
      data.forEach(t=>{
        if(!t.projectUrl)return;
        const cards=[...box.querySelectorAll('.tenant')];
        const card=cards.find(c=>c.textContent.includes(t.name));
        if(card&&!card.querySelector('.jfs-project-link')){
          const a=document.createElement('a');a.className='btn primary jfs-project-link';a.href=t.projectUrl;a.target='_blank';a.rel='noopener';a.textContent='🚀 Buka Project';
          const actions=card.querySelector('.actions');if(actions)actions.appendChild(a);
        }
      });
    };
    window.__JFS_PROJECT_LINKS_INSTALLED=true;
  }
  async function remoteActivate(id){const t=JFSTenantStore.get(id);if(!t)return;const c=window.JFS_ADMIN_SUPABASE;if(!c)return toastSafe('Sesi admin belum siap.');try{const {data:plans,error:pe}=await c.from('subscription_plans').select('id,duration_months,price,name').eq('is_active',true).order('duration_months');if(pe)throw pe;if(!plans?.length)throw new Error('Belum ada paket subscription aktif.');const choice=prompt('Pilih masa subscription ('+plans.map(p=>p.duration_months+' bulan').join(', ')+'):',String(plans[0].duration_months));if(choice===null)return;const months=Number(choice),plan=plans.find(p=>p.duration_months===months);if(!plan)throw new Error('Paket tidak tersedia.');const {data,error}=await c.rpc('renew_tenant_subscription',{p_tenant_id:t.id,p_plan_id:plan.id,p_notes:'Diaktifkan/renew oleh admin JFS AI'});if(error)throw error;await hydrate();toastSafe(t.name+' ACTIVE sampai '+dateText(data.end_date))}catch(e){console.error('[JFS Subscription]',e);toastSafe('Gagal aktivasi: '+(e.message||e))}}
  async function requireAdmin(){await loadSupabase();const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);window.JFS_ADMIN_SUPABASE=client;const {data:{session}}=await client.auth.getSession();async function check(user){const r=await client.from('jfs_admins').select('user_id').eq('user_id',user.id).maybeSingle();return !r.error&&r.data?.user_id===user.id}if(session&&await check(session.user)){await unlock();return}if(session)await client.auth.signOut();document.getElementById('jfsAdminForm').addEventListener('submit',async e=>{e.preventDefault();const b=document.getElementById('jfsAdminBtn'),m=document.getElementById('jfsAdminMsg');b.disabled=true;b.textContent='Memeriksa...';m.textContent='';try{const r=await client.auth.signInWithPassword({email:document.getElementById('jfsAdminEmail').value.trim(),password:document.getElementById('jfsAdminPassword').value});if(r.error)throw r.error;if(!await check(r.data.user)){await client.auth.signOut();throw new Error('Akun berhasil login tetapi belum terdaftar sebagai admin JFS AI.')}await unlock()}catch(err){m.textContent=err.message||String(err)}finally{b.disabled=false;b.textContent='Sign In'}})}
  async function unlock(){document.documentElement.style.overflow='';gate.remove();window.JFS_ADMIN_READY=true;addLogout();installCreateOverride();installProjectLinks();await hydrate();await loadScript('jfs-core-services-script','core-services.js');await loadScript('jfs-subscription-alerts-script','subscription-alerts.js');window.activateTenant=remoteActivate;window.createTenant=createTenantRemote;await hydrate()}
  window.JFS_REFRESH_TENANTS=hydrate;
  requireAdmin().catch(e=>{const m=document.getElementById('jfsAdminMsg');if(m)m.textContent=e.message||String(e)});
})();