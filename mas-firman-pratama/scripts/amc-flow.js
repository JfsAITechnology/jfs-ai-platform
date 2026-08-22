/* AMC Online flow enhancement layer.
   Loaded after dashboard.js through tenant.config.js.
   Uses existing Supabase/RLS and the existing dashboard structure. */
(function(){
  const TENANT='f0098e1c-da0c-4411-8720-9c99a3cfb115';
  const PRICE=4500000;
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const money=n=>'Rp '+Number(n||0).toLocaleString('id-ID');
  function addFlowUI(){
    const book=$('book'); if(!book||book.dataset.amcFlow==='1')return;
    book.dataset.amcFlow='1';
    const first=book.querySelector('.panel');
    const flow=document.createElement('div');
    flow.className='panel';
    flow.innerHTML=`<span class="tag">🎓 MEKANISME AMC ONLINE</span><h3>5 Langkah Mengikuti AMC</h3><div class="grid" id="amcSteps"></div><div class="card" style="margin-top:12px"><b>Biaya AMC Online: ${money(PRICE)}</b><p class="muted">Setelah pembayaran dan formulir lengkap, materi dikirim dan peserta masuk antrean. Estimasi antrean saat ini 3–4 bulan.</p></div>`;
    first?.parentNode.insertBefore(flow,first);
    const steps=[['1','Daftar & Pembayaran','Rp4.500.000'],['2','Isi Formulir Data Peserta','Lengkapi data setelah pembayaran'],['3','Materi Kelas Dikirim','Pelajari materi sebelum kelas'],['4','Menunggu Antrean Jadwal','Estimasi 3–4 bulan'],['5','Pelaksanaan Kelas AMC','09.00–15.00 · dibimbing Pak Firman · peserta satu per satu']];
    $('amcSteps').innerHTML=steps.map(x=>`<div class="card"><span class="tag">STEP ${x[0]}</span><h4>${x[1]}</h4><p class="muted">${x[2]}</p></div>`).join('');
    const select=$('rprog'); if(select&&!Array.from(select.options).some(o=>o.value==='AMC Online')){const o=document.createElement('option');o.textContent='AMC Online';o.value='AMC Online';select.insertBefore(o,select.firstChild)}
    const form=select?.closest('.panel');
    if(form&&!$('amcPaymentNote')){const n=document.createElement('div');n.id='amcPaymentNote';n.className='card';n.style.marginTop='12px';n.innerHTML='<b>Untuk AMC Online</b><p class="muted">Biaya Rp4.500.000. Setelah pendaftaran tercatat, status awal adalah menunggu pembayaran.</p>';form.appendChild(n)}
  }
  async function loadPublicSchedule(){
    try{
      const sb=window.JFSTenantAuth?.getSupabase?await window.JFSTenantAuth.getSupabase():window.JFS_SUPABASE;
      if(!sb)return;
      const {data,error}=await sb.from('jfs_amc_schedules').select('id,program_type,title,schedule_date,start_time,end_time,location,status,queue_estimate,notes').eq('tenant_id',TENANT).eq('is_public',true).in('status',['scheduled','published','open']).order('schedule_date',{ascending:true}).limit(20);
      if(error)throw error;
      const cards=$('scheduleCards'); if(!cards)return;
      const list=data||[];
      if(!list.length){cards.innerHTML='<div class="card"><b>Belum ada jadwal publik.</b><p class="muted">Estimasi antrean peserta baru: 3–4 bulan.</p></div>';return}
      const fmtDate=d=>d?new Date(d+'T00:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}):'Tanggal belum ditentukan';
      cards.innerHTML=list.map(s=>`<div class="card"><span class="tag">📅 ${esc(s.program_type)}</span><h3>${esc(s.title)}</h3><p>${fmtDate(s.schedule_date)} · ${(s.start_time||'09:00').slice(0,5)}–${(s.end_time||'15:00').slice(0,5)} WIB</p><p class="muted">Estimasi antrean: <b>${esc(s.queue_estimate||'3–4 bulan')}</b></p><p class="muted">Dibimbing langsung oleh Pak Firman · peserta satu per satu.</p></div>`).join('');
    }catch(e){console.warn('AMC schedule enhancement:',e)}
  }
  function overrideRegister(){
    if(window.__amcRegisterOverridden)return; window.__amcRegisterOverridden=true;
    window.register=async function(){
      const n=$('rn')?.value.trim(),phone=$('rp')?.value.trim(),pr=$('rprog')?.value||'AMC Online';
      if(!n)return window.toast?.('Nama wajib diisi'); if(!phone)return window.toast?.('WhatsApp wajib diisi');
      try{
        const sb=await window.JFSTenantAuth.getSupabase();
        const {data,error}=await sb.rpc('create_customer_booking',{p_tenant_code:'MAS-FIRMAN-PRATAMA',p_name:n,p_phone:phone,p_email:'',p_program_interest:pr,p_booking_date:new Date().toISOString().slice(0,10),p_start_time:null,p_end_time:null,p_notes:'Pendaftaran AMC dari dashboard'});
        if(error)throw error;
        const steps=data?.steps||[];
        const msg=steps.length?steps.map(s=>`${s.step}. ${s.name}`).join(' → '):'Pendaftaran → Pembayaran → Formulir → Materi → Antrean → Kelas';
        window.toast?.(`Pendaftaran tersimpan. Alur: ${msg}`);
        $('rn').value='';$('rp').value='';
        if(window.JFSTenantAuth?.getTenantAccess)location.hash='registration-success';
      }catch(e){console.error(e);window.toast?.('Pendaftaran gagal: '+(e.message||'error'))}
    };
  }
  function boot(){addFlowUI();overrideRegister();loadPublicSchedule();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else setTimeout(boot,0);
})();
