/* JFS AI — Tenant data bridge. Database is the source of truth; localStorage is cache only. */
(function(){'use strict';
const SUPABASE_URL='https://evtkeyfjgqwarsmlzrkh.supabase.co';
const SUPABASE_KEY='sb_publishable_7lGio_RVVgkVASYYyBHQIg_GvL-8ELD';
const KEY='jfs_ai_tenants_cache_v7';
const FIRMAN={whatsapp1:'6281230633464',whatsapp2:'6285706050689',projectUrl:'https://jfsaitechnology.github.io/jfs-ai-platform/mas-firman-pratama/demo.html'};
let cache=[];try{cache=JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){}
function save(){try{localStorage.setItem(KEY,JSON.stringify(cache))}catch(e){}}
function isFirman(t){return String(t?.tenant_code||'').toUpperCase()==='MAS-FIRMAN-PRATAMA'||String(t?.business_name||'').toLowerCase().includes('mas firman pratama')}
function normalize(t){return{id:t.id,name:t.business_name,type:t.business_type||'UMKM',whatsapp:t.whatsapp||'',whatsapp1:isFirman(t)?FIRMAN.whatsapp1:(t.whatsapp||''),whatsapp2:isFirman(t)?FIRMAN.whatsapp2:'',status:t.status||'inactive',aiEnabled:!!t.ai_enabled,plan:t.plan_name||'-',startedAt:t.start_date||null,expiresAt:t.end_date||null,subscriptionStatus:t.subscription_status||null,paymentStatus:t.payment_status||null,projectUrl:isFirman(t)?FIRMAN.projectUrl:''}}
window.JFSTenantStore={all:()=>cache,get:id=>cache.find(t=>t.id===id),save:t=>{const i=cache.findIndex(x=>x.id===t.id);i>=0?cache[i]=t:cache.push(t);save();return t}};
function waButtons(t){if(!isFirman(t))return '';return '<div class="jfs-wa-buttons" style="display:flex;gap:7px;flex-wrap:wrap;margin-top:10px"><a class="btn wa" target="_blank" rel="noopener" href="https://wa.me/6281230633464?text=Halo%20Admin%20Mas%20Firman,%20saya%20ingin%20informasi%20lebih%20lanjut.">🟢 WA Admin 1</a><a class="btn wa" target="_blank" rel="noopener" href="https://wa.me/6285706050689?text=Halo%20Admin%20Mas%20Firman,%20saya%20ingin%20informasi%20lebih%20lanjut.">🟢 WA Admin 2</a></div>'}
window.installFirmanWhatsApp=function(){document.querySelectorAll('.tenant').forEach(card=>{if(!card.textContent.toLowerCase().includes('mas firman pratama'))return;card.querySelector('.jfs-wa-buttons')?.remove();card.insertAdjacentHTML('beforeend',waButtons({business_name:'Mas Firman Pratama'}))})};
async function rpc(path,body){const r=await fetch(SUPABASE_URL+'/rest/v1/rpc/'+path,{method:'POST',headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY,'Content-Type':'application/json'},body:JSON.stringify(body||{})});const text=await r.text();let data;try{data=JSON.parse(text)}catch(e){throw new Error('Supabase response bukan JSON: '+text.slice(0,180))}if(!r.ok)throw new Error(data?.message||data?.hint||data?.details||JSON.stringify(data));return data}
window.JFS_REFRESH_TENANTS=async function(){
  try{
    const data=await rpc('get_platform_tenants');
    cache=(Array.isArray(data)?data:[]).map(normalize);
    save();
    if(typeof window.renderTenants==='function')window.renderTenants();
    setTimeout(window.installFirmanWhatsApp,100);
    window.dispatchEvent(new CustomEvent('jfs-tenants-updated',{detail:cache}));
    return true;
  }catch(e){
    console.error('[JFS Tenant] gagal memuat tenant dari Supabase:',e);
    if(typeof window.renderTenants==='function')window.renderTenants();
    window.dispatchEvent(new CustomEvent('jfs-tenants-error',{detail:{message:e.message}}));
    return false;
  }
};
window.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{window.installFirmanWhatsApp();window.JFS_REFRESH_TENANTS?.()},300));
})();