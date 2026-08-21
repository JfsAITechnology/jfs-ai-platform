(async () => {
  const access = await window.JFSTenantAuth?.requireTenantAccess();
  if (!access) return;

  const fallback = window.JFS_CATALOG;
  let state = { schedule: { Online:'Jadwal Online belum diisi admin', Reguler:'29 Agustus 2026 · 09.00 WIB · Surabaya', Privat:'Atur jadwal dengan admin', Platinum:'Atur jadwal dengan admin' } };
  let catalog = { products: [], programs: fallback.programs };
  let crm = { contacts: [], bookings: [] };
  const $ = id => document.getElementById(id);
  const money = n => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

  async function loadTenantData() {
    try {
      const [tenant, products, knowledge] = await Promise.all([
        JFS_TENANT_SERVICE.getTenant(),
        JFS_TENANT_SERVICE.getProducts(),
        JFS_TENANT_SERVICE.getKnowledge()
      ]);
      catalog.products = products.map(p => ({ id:p.id, sku:p.sku, name:p.name, image:p.image_url||p.image_path||'', description:p.description||'', price:Number(p.price||0), category:p.category||'' }));
      window.JFS_KNOWLEDGE = knowledge;
      if (tenant?.business_name) document.title = 'JFS AI — ' + tenant.business_name;
      await loadCRM();
      toast('Supabase aktif · katalog, CRM & booking tersambung');
    } catch (err) {
      console.error(err);
      catalog.products = fallback.products;
      window.JFS_KNOWLEDGE = [];
      toast('Gagal membaca data tenant dari Supabase');
    }
    renderProducts(); renderBooking(); renderCRM(); renderKnowledge();
  }

  async function loadCRM() {
    const supabase = await JFSTenantAuth.getSupabase();
    const [contactsRes, bookingsRes] = await Promise.all([
      supabase.from('jfs_contacts').select('id,name,phone,email,status,lead_score,lifecycle_stage,program_interest,created_at,updated_at').eq('tenant_id', JFSTenantAuth.tenantId).order('created_at', { ascending:false }),
      supabase.from('jfs_bookings').select('id,contact_id,service_name,booking_date,start_time,end_time,status,notes,created_at').eq('tenant_id', JFSTenantAuth.tenantId).order('created_at', { ascending:false })
    ]);
    if (contactsRes.error) throw contactsRes.error;
    if (bookingsRes.error) throw bookingsRes.error;
    crm.contacts = contactsRes.data || [];
    crm.bookings = bookingsRes.data || [];
    $('nlead').textContent = crm.contacts.length;
    $('nhot').textContent = crm.contacts.filter(x => Number(x.lead_score || 0) >= 85).length;
    $('nbook').textContent = crm.bookings.length;
  }

  window.go = (id, btn) => {
    document.querySelectorAll('.page').forEach(x => x.classList.remove('on'));
    const p=$(id); if(p)p.classList.add('on');
    document.querySelectorAll('.nav button').forEach(x=>x.classList.remove('on'));
    if(btn)btn.classList.add('on');
    if(id==='products')renderProducts(); if(id==='book')renderBooking(); if(id==='leads'||id==='crm')renderCRM(); if(id==='knowledge')renderKnowledge();
    window.scrollTo(0,0);
  };

  function renderProducts(){
    const products=catalog.products;
    $('prodGrid').innerHTML=products.length?products.map((p,i)=>`<div class="card product"><img src="${p.image}" alt="${p.name}"><h3>${p.name}</h3><div class="price">${money(p.price)}</div><button class="btn" onclick="detail(${i})">Lihat Detail</button></div>`).join(''):'<p class="muted">Belum ada produk aktif di Supabase.</p>';
  }
  window.detail=i=>{const p=catalog.products[i];if(!p)return;$('mt').textContent=p.name;$('mi').src=p.image;$('md').textContent=p.description;$('mp').textContent=money(p.price);$('modal').classList.add('show')};
  window.closeM=()=>$('modal').classList.remove('show');

  function renderBooking(){
    $('amcGrid').innerHTML=catalog.programs.slice(1).map(p=>`<div class="card amc"><img src="../assets/programs/amc-class.svg" alt="${p.name}"><h3>${p.name}</h3><p class="muted">Program ${p.type}</p><button class="btn" onclick="rprog.value='${p.name}'">Pilih</button></div>`).join('');
    $('scheduleCards').innerHTML=catalog.programs.map(p=>`<div class="card"><b>${p.name}</b><p class="muted">${state.schedule[p.type]||'Jadwal belum tersedia'}</p></div>`).join('');
  }

  function renderCRM(){
    const html = crm.contacts.length ? crm.contacts.map(x=>`<div class="item"><b>${x.name||'-'}</b> · ${x.program_interest||'Belum memilih program'} · Score ${x.lead_score||0} · ${x.status||'lead'}<br><small>${x.phone||''}${x.email?' · '+x.email:''}</small></div>`).join('') : '<p class="muted">Belum ada contact/lead untuk tenant ini.</p>';
    $('leadList').innerHTML=html;
    $('crmList').innerHTML=html;
  }

  window.register = async () => {
    const n=$('rn').value.trim(), phone=$('rp').value.trim(), email='';
    const pr=$('rprog').value;
    if(!n)return toast('Nama wajib diisi'); if(!phone)return toast('WhatsApp wajib diisi');
    try {
      const supabase = await JFSTenantAuth.getSupabase();
      const { data, error } = await supabase.rpc('create_customer_booking', {
        p_tenant_code: 'MAS-FIRMAN-PRATAMA', p_name:n, p_phone:phone, p_email:email,
        p_program_interest:pr, p_booking_date:new Date().toISOString().slice(0,10),
        p_start_time:null, p_end_time:null, p_notes:'Pendaftaran melalui dashboard tenant'
      });
      if(error) throw error;
      await loadCRM(); renderCRM();
      $('rn').value=''; $('rp').value='';
      toast('Pendaftaran tersimpan di Supabase');
      console.log('Booking created', data);
    } catch(err) { console.error(err); toast('Pendaftaran gagal disimpan: '+(err.message||'error')); }
  };

  window.ask=()=>{const q=$('q').value.trim();if(!q)return;$('chat').innerHTML+=`<div class="msg me"></div>`;$('chat').lastElementChild.textContent=q;const z=q.toLowerCase();let a='Saya belum menemukan informasi tersebut di Knowledge Database. Silakan hubungi Admin.';for(const p of catalog.products){if(z.includes(p.name.toLowerCase())||(z.includes('harga')&&z.includes((p.name||'').toLowerCase().split(' ')[1])))a=`${p.name}: ${p.description} Harga ${money(p.price)}.`}for(const p of catalog.programs){if(z.includes(p.type.toLowerCase())||z.includes(p.name.toLowerCase()))a=`${p.name}: ${state.schedule[p.type]||'Jadwal belum diisi admin'}.`}$('chat').innerHTML+=`<div class="msg"></div>`;$('chat').lastElementChild.textContent=a;$('q').value=''};
  function renderKnowledge(){const k=window.JFS_KNOWLEDGE||[];$('kview').innerHTML=k.length?k.map(x=>`<div class="item"><b>${x.title}</b><p>${x.content}</p></div>`).join(''):'<div class="item">Knowledge tenant belum tersedia.</div>'}
  window.toast=m=>{const t=$('toast');t.textContent=m;t.style.display='block';setTimeout(()=>t.style.display='none',2200)};
  window.wa=text=>window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank','noopener');
  renderProducts();
  await loadTenantData();
})();
