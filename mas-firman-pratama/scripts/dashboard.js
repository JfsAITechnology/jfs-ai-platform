(async () => {
  const access = await window.JFSTenantAuth?.requireTenantAccess();
  if (!access) return;

  const fallback = window.JFS_CATALOG;
  const KEY='jfs-firman-ui';
  let state=JSON.parse(localStorage.getItem(KEY)||'{}');
  state.schedule=state.schedule||{Online:'Jadwal Online belum diisi admin',Reguler:'29 Agustus 2026 · 09.00 WIB · Surabaya',Privat:'Atur jadwal dengan admin',Platinum:'Atur jadwal dengan admin'};
  state.leads=state.leads||[];
  let catalog={products:[],programs:fallback.programs};
  const $=id=>document.getElementById(id);
  const money=n=>'Rp '+Number(n||0).toLocaleString('id-ID');
  function save(){localStorage.setItem(KEY,JSON.stringify(state))}

  async function loadTenantData(){
    try {
      const [tenant, products, knowledge] = await Promise.all([
        JFS_TENANT_SERVICE.getTenant(),
        JFS_TENANT_SERVICE.getProducts(),
        JFS_TENANT_SERVICE.getKnowledge()
      ]);
      catalog.products=products.map(p=>({
        id:p.id, sku:p.sku, name:p.name, image:p.image_url||p.image_path||'',
        description:p.description||'', price:Number(p.price||0), category:p.category||''
      }));
      window.JFS_KNOWLEDGE=knowledge;
      if(tenant && tenant.business_name) document.title='JFS AI — '+tenant.business_name;
      toast('Terhubung ke Supabase · '+(catalog.products.length)+' produk aktif');
    } catch(err) {
      catalog.products=fallback.products;
      window.JFS_KNOWLEDGE=[];
      console.warn('Supabase tenant load failed; using safe UI fallback.',err);
      toast('Supabase belum dapat dibaca; mode kompatibilitas aktif');
    }
    renderProducts(); renderBooking(); renderLeads(); renderKnowledge();
  }

  window.go=(id,btn)=>{
    document.querySelectorAll('.page').forEach(x=>x.classList.remove('on'));
    const p=$(id); if(p)p.classList.add('on');
    document.querySelectorAll('.nav button').forEach(x=>x.classList.remove('on'));
    if(btn)btn.classList.add('on');
    if(id==='products')renderProducts(); if(id==='book')renderBooking(); if(id==='leads'||id==='crm')renderLeads(); if(id==='knowledge')renderKnowledge();
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
  function renderLeads(){
    const html=state.leads.length?state.leads.map(x=>`<div class="item"><b>${x.name}</b> · ${x.program} · Score ${x.score}</div>`).join(''):'<p class="muted">Belum ada lead di sesi browser ini. Modul CRM akan dipindahkan ke Supabase pada fase berikutnya.</p>';
    $('leadList').innerHTML=html;$('crmList').innerHTML=html;$('nlead').textContent=state.leads.length;$('nhot').textContent=state.leads.filter(x=>x.score>=85).length;$('nbook').textContent='—';
  }
  window.register=()=>{const n=$('rn').value.trim();const phone=$('rp').value.trim();if(!n)return toast('Nama wajib diisi');if(!phone)return toast('WhatsApp wajib diisi');const pr=$('rprog').value;state.leads.push({name:n,phone,program:pr,score:pr.includes('Platinum')?95:pr.includes('Privat')?85:75});save();renderLeads();toast('Pendaftaran dicatat sementara. CRM Supabase menyusul pada fase berikutnya.')};
  window.ask=()=>{const q=$('q').value.trim();if(!q)return;$('chat').innerHTML+=`<div class="msg me"></div>`;$('chat').lastElementChild.textContent=q;const z=q.toLowerCase();let a='Saya belum menemukan informasi tersebut di Knowledge Database. Silakan hubungi Admin.';for(const p of catalog.products){if(z.includes(p.name.toLowerCase())||(z.includes('harga')&&z.includes((p.name||'').toLowerCase().split(' ')[1])))a=`${p.name}: ${p.description} Harga ${money(p.price)}.`}for(const p of catalog.programs){if(z.includes(p.type.toLowerCase())||z.includes(p.name.toLowerCase()))a=`${p.name}: ${state.schedule[p.type]||'Jadwal belum diisi admin'}.`}$('chat').innerHTML+=`<div class="msg"></div>`;$('chat').lastElementChild.textContent=a;$('q').value=''};
  function renderKnowledge(){const k=window.JFS_KNOWLEDGE||[];$('kview').innerHTML=k.length?k.map(x=>`<div class="item"><b>${x.title}</b><p>${x.content}</p></div>`).join(''):'<div class="item">Knowledge tenant belum tersedia.</div>'}
  window.toast=m=>{const t=$('toast');t.textContent=m;t.style.display='block';setTimeout(()=>t.style.display='none',2200)};
  window.wa=text=>window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank');
  renderProducts(); renderLeads(); loadTenantData();
})();
