/* JFS AI — Shared Tenant Data
   Dipakai bersama oleh Dashboard dan Subscription Management.
   Data demo awal: Fibo Laundry dan ARANE Elektronik.
*/
(function(){
  const KEY = 'jfs_ai_tenants_v2';
  const seed = [
    {
      id:'FIBO001', name:'Fibo Laundry', type:'Laundry',
      whatsapp:'08132217400', status:'TRIAL',
      plan:'Trial 3 Hari', startedAt:Date.now(), expiresAt:Date.now()+3*86400000
    },
    {
      id:'ARANE001', name:'ARANE Elektronik', type:'Elektronik',
      whatsapp:'+6282143454936', status:'ACTIVE',
      plan:'3 Bulan', startedAt:'2026-08-14', expiresAt:'2026-11-12'
    }
  ];

  function load(){
    try{
      const saved = JSON.parse(localStorage.getItem(KEY));
      if(Array.isArray(saved) && saved.length) return saved;
    }catch(e){}
    localStorage.setItem(KEY, JSON.stringify(seed));
    return seed;
  }
  function save(data){ localStorage.setItem(KEY, JSON.stringify(data)); }
  function syncStatus(t){
    if(t.status === 'ACTIVE' && t.expiresAt){
      const d = new Date(t.expiresAt).getTime();
      if(!isNaN(d) && Date.now() > d) t.status='EXPIRED';
    }
    if(t.status === 'TRIAL' && t.expiresAt && Date.now() > new Date(t.expiresAt).getTime()) t.status='EXPIRED';
    return t;
  }
  window.JFSTenantStore = {
    key:KEY,
    all:function(){ const d=load().map(syncStatus); save(d); return d; },
    get:function(id){ return this.all().find(t=>t.id===id); },
    save:function(t){ const d=this.all(); const i=d.findIndex(x=>x.id===t.id); if(i>=0)d[i]=t;else d.push(t); save(d); return t; },
    seed:function(){ save(seed); return seed; }
  };
})();
