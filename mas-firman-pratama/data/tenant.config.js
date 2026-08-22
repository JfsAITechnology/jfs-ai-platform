// Static tenant identity only. Business data lives in Supabase.
window.JFS_TENANT = Object.freeze({
  id: 'mas-firman-pratama',
  slug: 'mas-firman-pratama',
  supabaseTenantId: 'f0098e1c-da0c-4411-8720-9c99a3cfb115',
  tenantCode: 'MAS-FIRMAN-PRATAMA',
  name: 'Mas Firman Pratama',
  brand: 'JFS AI Technology',
  website: 'https://masfirmanpratama.com/'
});

// Enhancement layer: keeps the existing dashboard structure and adds the AMC 5-step flow.
(function(){
  const s=document.createElement('script');
  s.src='../scripts/amc-flow.js?v=20260822';
  s.defer=true;
  document.head.appendChild(s);
})();
