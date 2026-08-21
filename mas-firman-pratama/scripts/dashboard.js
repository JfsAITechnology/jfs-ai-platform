(async () => {
  const access = await window.JFSTenantAuth?.requireTenantAccess();
  if (!access) return;

  const fallback = window.JFS_CATALOG;
  let state = { schedule: { Online:null, Reguler:null, Privat:null, Platinum:null } };
  let catalog = { products: [], programs: fallback.programs };
  let crm = { contacts: [], bookings: [] };
  let knowledge = [];
  const $ = id => document.getElementById(id);
  const money = n => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
  const normalize = s => String(s||'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
  const stop = new Set(['yang','dan','atau','untuk','dari','dengan','ini','itu','apa','saya','mau','bisa','kak','mas','ada','nya','di','ke','berapa','kapan','kelas','berikutnya']);
  function tokens(s){return normalize(s).split(' ').filter(x=>x.length>2&&!stop.has(x));}
  function findKnowledge(question, limit=4){
    const qt=tokens(question); if(!qt.length) return [];
    return knowledge.map(item=>{
      const hay=normalize((item.title||'')+' '+(item.category||'')+' '+(item.content||''));
      let score=0; qt.forEach(t=>{if(hay.includes(t))score += (normalize(item.title).includes(t)?4:1);});
      if(normalize(question).includes(normalize(item.title||''))) score+=8;
      return {...item,_score:score};
    }).filter(x=>x._score>0).sort((a,b)=>b._score-a._score).slice(0,limit);
  }
  function scheduleAnswer(type){
    const value=state.schedule[type];
    if(value && String(value).trim() && !/belum|atur jadwal/i.test(String(value))) return `Jadwal ${type} AMC berikutnya: ${value}.`;
    return 'Sementara belum ada jadwal terbaru, nanti akan Saya info secepatnya jika sudah ada jadwal lagi.';
  }
  function isScheduleQuestion(q){return /(kapan|jadwal|tanggal|jadwalnya|berikutnya|kelas.*(lagi|selanjutnya))/i.test(q) && /(amc|kelas|online|reguler|privat|platinum)/i.test(q);}

  async function loadTenantData() {
    try {
      const [tenant, products, kb] = await Promise.all([JFS_TENANT_SERVICE.getTenant(),JFS_TENANT_SERVICE.getProducts(),JFS_TENANT_SERVICE.getKnowledge()]);
      catalog.products = products.map(p=>({id:p.id,sku:p.sku,name:p.name,image:p.image_url||p.image_path||'',description:p.description||'',price:Number(p.price||0),category:p.category||''}));
      knowledge=kb||[]; window.JFS_KNOWLEDGE=knowledge;
      if(tenant?.business_name) document.title='JFS AI — '+tenant.business_name;
      await loadCRM();
      toast('Supabase aktif · katalog, CRM, booking & Knowledge AI tersambung');
    } catch(err){console.error(err);catalog.products=fallback.products;knowledge=[];window.JFS_KNOWLEDGE=[];toast('Gagal membaca data tenant dari Supabase');}
    renderProducts();renderBooking();renderCRM();renderKnowledge();
  }
  async function loadCRM(){
    const supabase=await JFSTenantAuth.getSupabase();
    const [contactsRes,bookingsRes]=await Promise.all([
      supabase.from('jfs_contacts').select('id,name,phone,email,status,lead_score,lifecycle_stage,program_interest,created_at,updated_at').eq('tenant_id',JFSTenantAuth.tenantId).order('created_at',{ascending:false}),
      supabase.from('jfs_bookings').select('id,contact_id,service_name,booking_date,start_time,end_time,status,notes,created_at').eq('tenant_id',JFSTenantAuth.tenantId).order('created_at',{ascending:false})
    ]);
    if(contactsRes.error)throw contactsRes.error;if(bookingsRes.error)throw bookingsRes.error;
    crm.contacts=contactsRes.data||[];crm.bookings=bookingsRes.data||[];$('nlead').textContent=crm.contacts.length;$('nhot').textContent=crm.contacts.filter(x=>Number(x.lead_score||0)>=85).length;$('nbook').textContent=crm.bookings.length;
  }
  window.go=(id,btn)=>{document.querySelectorAll('.page').forEach(x=>x.classList.remove('on'));const p=$(id);if(p)p.classList.add('on');document.querySelectorAll('.nav button').forEach(x=>x.classList.remove('on'));if(btn)btn.classList.add('on');if(id==='products')renderProducts();if(id==='book')renderBooking();if(id==='leads'||id==='crm')renderCRM();if(id==='knowledge')renderKnowledge();window.scrollTo(0,0)};
  function renderProducts(){const products=catalog.products;$('prodGrid').innerHTML=products.length?products.map((p,i)=>`<div class="card product"><img src="${p.image}" alt="${p.name}"><h3>${p.name}</h3><div class="price">${money(p.price)}</div><button class="btn" onclick="detail(${i})">Lihat Detail</button></div>`).join(''):'<p class="muted">Belum ada produk aktif di Supabase.</p>'}
  window.detail=i=>{const p=catalog.products[i];if(!p)return;$('mt').textContent=p.name;$('mi').src=p.image;$('md').textContent=p.description;$('mp').textContent=money(p.price);$('modal').classList.add('show')};window.closeM=()=>$('modal').classList.remove('show');
  function renderBooking(){$('amcGrid').innerHTML=catalog.programs.slice(1).map(p=>`<div class="card amc"><img src="../assets/programs/amc-class.svg" alt="${p.name}"><h3>${p.name}</h3><p class="muted">Program ${p.type}</p><button class="btn" onclick="rprog.value='${p.name}'">Pilih</button></div>`).join('');$('scheduleCards').innerHTML=catalog.programs.map(p=>`<div class="card"><b>${p.name}</b><p class="muted">${state.schedule[p.type]||'Sementara belum ada jadwal terbaru.'}</p></div>`).join('')}
  function renderCRM(){const html=crm.contacts.length?crm.contacts.map(x=>`<div class="item"><b>${x.name||'-'}</b> · ${x.program_interest||'Belum memilih program'} · Score ${x.lead_score||0} · ${x.status||'lead'}<br><small>${x.phone||''}${x.email?' · '+x.email:''}</small></div>`).join(''):'<p class="muted">Belum ada contact/lead untuk tenant ini.</p>';$('leadList').innerHTML=html;$('crmList').innerHTML=html}
  window.register=async()=>{const n=$('rn').value.trim(),phone=$('rp').value.trim(),email='',pr=$('rprog').value;if(!n)return toast('Nama wajib diisi');if(!phone)return toast('WhatsApp wajib diisi');try{const supabase=await JFSTenantAuth.getSupabase();const{data,error}=await supabase.rpc('create_customer_booking',{p_tenant_code:'MAS-FIRMAN-PRATAMA',p_name:n,p_phone:phone,p_email:email,p_program_interest:pr,p_booking_date:new Date().toISOString().slice(0,10),p_start_time:null,p_end_time:null,p_notes:'Pendaftaran melalui dashboard tenant'});if(error)throw error;await loadCRM();renderCRM();$('rn').value='';$('rp').value='';toast('Pendaftaran tersimpan di Supabase');console.log('Booking created',data)}catch(err){console.error(err);toast('Pendaftaran gagal disimpan: '+(err.message||'error'))}};
  window.ask=()=>{const q=$('q').value.trim();if(!q)return;$('chat').innerHTML+=`<div class="msg me"></div>`;$('chat').lastElementChild.textContent=q;const z=normalize(q);let answer='Saya belum menemukan informasi tersebut di Knowledge Base Mas Firman. Silakan hubungi Admin untuk informasi yang belum tersedia.';
    if(isScheduleQuestion(q)){
      const typeMatch=z.match(/online|reguler|privat|platinum/);const type=typeMatch?typeMatch[0].replace(/^online$/,'Online').replace(/^reguler$/,'Reguler').replace(/^privat$/,'Privat').replace(/^platinum$/,'Platinum'):null;
      if(type) answer=scheduleAnswer(type); else {const types=['Online','Reguler','Privat','Platinum'];const available=types.filter(t=>state.schedule[t]);answer=available.length?`Jadwal AMC yang tersedia: ${available.map(t=>`${t}: ${state.schedule[t]}`).join('; ')}.`:'Sementara belum ada jadwal terbaru, nanti akan Saya info secepatnya jika sudah ada jadwal lagi.';}
    } else {
      const hits=findKnowledge(q,4);const productHit=catalog.products.find(p=>z.includes(normalize(p.name)));const programHit=catalog.programs.find(p=>z.includes(normalize(p.name))||z.includes(normalize(p.type)));
      if(productHit)answer=`${productHit.name}: ${productHit.description||'Informasi produk tersedia di katalog.'} Harga ${money(productHit.price)}.`;else if(programHit){const kbHit=hits.find(x=>normalize(x.title).includes(normalize(programHit.name)))||hits[0];answer=kbHit?kbHit.content:`${programHit.name}: ${scheduleAnswer(programHit.type)}`;}else if(hits.length){answer=hits[0].content;if(hits.length>1)answer+=`\n\nInformasi terkait: ${hits.slice(1,3).map(x=>x.title).join(', ')}.`}}
    $('chat').innerHTML+=`<div class="msg"></div>`;$('chat').lastElementChild.textContent=answer;$('q').value=''};
  function renderKnowledge(){const k=knowledge;$('kview').innerHTML=k.length?k.map(x=>`<div class="item"><b>${x.title}</b><small style="display:block;opacity:.65">${x.category||'general'}</small><p>${x.content}</p></div>`).join(''):'<div class="item">Knowledge tenant belum tersedia.</div>'}
  window.toast=m=>{const t=$('toast');t.textContent=m;t.style.display='block';setTimeout(()=>t.style.display='none',2200)};window.wa=text=>window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank','noopener');renderProducts();await loadTenantData();
})();
