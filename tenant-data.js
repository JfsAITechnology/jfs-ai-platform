/* JFS AI — tenant bridge with RLS-backed tenant loading. */
(function(){
'use strict';
const SUPABASE_URL='https://evtkeyfjgqwarsmlzrkh.supabase.co';
const SUPABASE_KEY='sb_publishable_7lGio_RVVgkVASYYyBHQIg_GvL-8ELD';
const KEY='jfs_ai_tenants_cache_v12';
const FIRMAN={name:'Mas Firman Pratama',tenantCode:'MAS-FIRMAN-PRATAMA',projectUrl:'https://jfsaitechnology.github.io/jfs-ai-platform/mas-firman-pratama/app/dashboard.html'};
let cache=[];
try{cache=JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){cache=[]}
if(!Array.isArray(cache))cache=[];
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(cache))}catch(e){}};
const normalize=t=>({id:t.id,tenantCode:t.tenant_code||'',name:t.business_name||'',type:t.business_type||'UMKM',status:String(t.status||'inactive').toUpperCase(),projectUrl:(t.tenant_code||'')===FIRMAN.tenantCode?FIRMAN.projectUrl:''});
window.JFSTenantStore={all:()=>cache.slice(),get:id=>cache.find(t=>t.id===id),save:t=>{const i=cache.findIndex(x=>x.id===t.id);i>=0?cache[i]=t:cache.push(t);save();return t}};
async function getClient(){
 if(window.JFS_ADMIN_SUPABASE)return window.JFS_ADMIN_SUPABASE;
 const mod=await import('https://esm.sh/@supabase/supabase-js@2');
 return mod.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
}
function isFirman(card){return /mas firman pratama/i.test(card.textContent||'')||/MAS-FIRMAN-PRATAMA/i.test(card.textContent||'')}
function launcher(){return `<a class="btn primary jfs-firman-launcher" href="${FIRMAN.projectUrl}" data-jfs-firman="1">🚀 Buka Dashboard Mas Firman</a>`}
function install(){
 document.querySelectorAll('#tenantList .tenant,#dashTenants .tenant,.tenant').forEach(card=>{if(!isFirman(card)||card.querySelector('[data-jfs-firman]'))return;const target=card.querySelector('.actions')||card;target.insertAdjacentHTML('beforeend',launcher())});
 document.querySelectorAll('#tenants .head,#dashboard .panel .head').forEach(head=>{if(!/Tenant Management/i.test(head.textContent)||head.querySelector('[data-jfs-firman]'))return;if(!cache.some(t=>t.tenantCode===FIRMAN.tenantCode))return;const w=document.createElement('div');w.style.cssText='display:flex;gap:7px;flex-wrap:wrap;margin-left:auto';w.innerHTML=launcher();head.appendChild(w)});
}
function installLogo(){const src='/jfs-ai-platform/jfs-ai-logo.svg?v=20260831';document.querySelectorAll('.logo').forEach(el=>{el.innerHTML=`<img src="${src}" alt="JFS AI Technology" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:50%">`;el.style.background='transparent';el.style.border='0'});document.querySelectorAll('link[rel="icon"]').forEach(el=>el.href=src)}
function installSSO(){document.querySelectorAll('a[data-jfs-firman]').forEach(a=>{if(a.dataset.ssoBound)return;a.dataset.ssoBound='1';a.addEventListener('click',async e=>{e.preventDefault();const target=a.href;try{const sb=await getClient();const {data}=await sb.auth.getSession();if(data?.session)sessionStorage.setItem('jfs-main-sso',JSON.stringify({access_token:data.session.access_token,refresh_token:data.session.refresh_token,user_id:data.session.user?.id||null,created_at:Date.now()}))}catch(err){console.warn('[JFS SSO]',err)}location.href=target})})}
window.JFS_REFRESH_TENANTS=async()=>{
 try{
  const sb=await getClient();
  const {data:{session}}=await sb.auth.getSession();
  if(!session){cache=[];save();return false;}
  const {data,error}=await sb.from('tenants').select('id,tenant_code,business_name,business_type,status').order('business_name');
  if(error)throw error;
  cache=(data||[]).map(normalize);save();install();installLogo();installSSO();return true;
 }catch(e){console.warn('[JFS Tenant] RLS-backed load failed',e);return false}
};
window.installFirmanWhatsApp=install;
document.addEventListener('DOMContentLoaded',()=>{install();installLogo();installSSO();setTimeout(window.JFS_REFRESH_TENANTS,500);const obs=new MutationObserver(()=>{install();installLogo();installSSO()});obs.observe(document.body,{childList:true,subtree:true});setTimeout(()=>obs.disconnect(),30000)});
})();
