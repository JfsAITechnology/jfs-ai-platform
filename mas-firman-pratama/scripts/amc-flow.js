/* AMC Online flow enhancement layer.
   Loaded after dashboard.js through tenant.config.js.
   Uses existing Supabase/RLS and the existing dashboard structure. */
(function(){
  const TENANT='f0098e1c-da0c-4411-8720-9c99a3cfb115';
  const PRICE=4500000;
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const money=n=>'Rp '+Number(n||0).toLocaleString('id-ID');
  const isAdmin=()=>['owner','admin'].includes(String(window.JFSTenantAuth?.getTenantAccess?window.__JFS_ACCESS_ROLE||'':'').toLowerCase());
  function addFlowUI(){
    const book=$('book'); if(!book||book.dataset.amcFlow==='1')return;
    book.dataset.amcFlow='1';
    const first=book.querySelector('.panel');
    const flow=document.createElement('div'); flow.className='panel';
    flow.innerHTML=`<span class="tag">🎓 MEKANISME AMC ONLINE</span><h3>5 Langkah Mengikuti AMC</h3><div class="grid" id="amcSteps"></div><div class="card" style="margin-top:12px"><b>Biaya AMC Online: ${money(PRICE)}</b><p class="muted">Setelah pembayaran dan formulir lengkap, materi dikirim dan peserta masuk antrean. Estimasi antrean saat ini 3–4 bulan.</p></div>`;
    first?.parentNode.insertBefore(flow,first);
    const steps=[['1','Daftar & Pembayaran','Rp4.500.000'],['2','Isi Formulir Data Peserta','Lengkapi data setelah pembayaran'],['3','Materi Kelas Dikirim','Pelajari materi sebelum kelas'],['4','Menunggu Antrean Jadwal','Estimasi 3–4 bulan'],['5','Pelaksanaan Kelas AMC','09.00–15.00 · dibimbing Pak Firman · peserta satu per satu']];
    $('amcSteps').innerHTML=steps.map(x=>`<div class="card"><span class="tag">STEP ${x[0]}</span><h4>${x[1]}</h4><p class="muted">${x[2]}</p></div>`).join('');
    const select=$('rprog'); if(select&&!Array.from(select.options).some(o=>o.value==='AMC Online')){const o=document.createElement('option');o.textContent='AMC Online';o.value='AMC Online';select.insertBefore(o,select.firstChild)}
    const form=select?.closest('.panel'); if(form&&!$('amcPaymentNote')){const n=document.createElement('div');n.id='amcPaymentNote';n.className='card';n.style.marginTop='12px';n.innerHTML='<b>Untuk AMC Online</b><p class="muted">Biaya Rp4.500.000. Setelah pendaftaran tercatat, status awal adalah menunggu pembayaran.</p>';form.appendChild(n)}
  }
  async function loadPublicSchedule(){
    try{
      const sb=window.JFSTenantAuth?.getSupabase?await window.JFSTenantAuth.getSupabase():window.JFS_SUPABASE; if(!sb)return;
      const {data,error}=await sb.from('jfs_amc_schedules').select('id,program_type,title,schedule_date,start_time,end_time,location,status,queue_estimate,notes').eq('tenant_id',TENANT).eq('is_public',true).in('status',['scheduled','published','open']).order('schedule_date',{ascending:true}).limit(20); if(error)throw error;
      const cards=$('scheduleCards'); if(!cards)return; const list=data||[];
      if(!list.length){cards.innerHTML='<div class="card"><b>Belum ada jadwal publik.</b><p class="muted">Estimasi antrean peserta baru: 3–4 bulan.</p></div>';return}
      const fmtDate=d=>d?new Date(d+'T00:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}):'Tanggal belum ditentukan';
      cards.innerHTML=list.map(s=>`<div class="card"><span class="tag">📅 ${esc(s.program_type)}</span><h3>${esc(s.title)}</h3><p>${fmtDate(s.schedule_date)} · ${(s.start_time||'09:00').slice(0,5)}–${(s.end_time||'15:00').slice(0,5)} WIB</p><p class="muted">Estimasi antrean: <b>${esc(s.queue_estimate||'3–4 bulan')}</b></p><p class="muted">Dibimbing langsung oleh Pak Firman · peserta satu per satu.</p></div>`).join('');
    }catch(e){console.warn('AMC schedule enhancement:',e)}
  }
  async function renderAdminSchedules(){
    const listEl=$('scheduleAdminList'); if(!listEl)return;
    try{
      const sb=await window.JFSTenantAuth.getSupabase();
      const {data,error}=await sb.from('jfs_amc_schedules').select('id,program_type,title,schedule_date,start_time,end_time,location,meeting_url,status,queue_estimate,notes').eq('tenant_id',TENANT).order('schedule_date',{ascending:true}).order('start_time',{ascending:true});
      if(error)throw error; const rows=data||[];
      if(!rows.length){listEl.innerHTML='<div class="item">Belum ada jadwal.</div>';return}
      const fmt=d=>d?new Date(d+'T00:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}):'Tanggal belum ditentukan';
      listEl.innerHTML=rows.map(s=>`<div class="item"><b>${esc(s.program_type)}</b> · ${esc(s.title)}<br><small>${fmt(s.schedule_date)} · ${(s.start_time||'09:00').slice(0,5)}–${(s.end_time||'15:00').slice(0,5)} · Status: <b>${esc(s.status)}</b></small><p class="muted">Estimasi antrean: <b>${esc(s.queue_estimate||'3–4 bulan')}</b></p><p>${esc(s.notes||'')}</p><button class="btn" onclick="amcEditSchedule('${s.id}')">Edit</button> <button class="btn" onclick="amcDeleteSchedule('${s.id}')">Hapus</button></div>`).join('');
    }catch(e){listEl.innerHTML='<div class="item">Gagal memuat jadwal: '+esc(e.message)+'</div>'}
  }
  function addQueueField(){
    if($('scheduleQueue'))return; const notes=$('scheduleNotes'); if(!notes)return;
    const input=document.createElement('input'); input.id='scheduleQueue'; input.className='input'; input.placeholder='Estimasi antrean, mis. 3–4 bulan'; input.value='3–4 bulan'; notes.parentNode.insertBefore(input,notes);
  }
  window.amcEditSchedule=async id=>{const sb=await window.JFSTenantAuth.getSupabase();const{data,error}=await sb.from('jfs_amc_schedules').select('*').eq('id',id).eq('tenant_id',TENANT).single();if(error)return window.toast?.(error.message);addQueueField();$('scheduleId').value=data.id;$('scheduleType').value=data.program_type;$('scheduleTitle').value=data.title||'';$('scheduleDate').value=data.schedule_date||'';$('scheduleStart').value=data.start_time?data.start_time.slice(0,5):'';$('scheduleEnd').value=data.end_time?data.end_time.slice(0,5):'';$('scheduleLocation').value=data.location||'';$('scheduleUrl').value=data.meeting_url||'';$('scheduleStatus').value=data.status||'draft';$('scheduleQueue').value=data.queue_estimate||'3–4 bulan';$('scheduleNotes').value=data.notes||'';$('scheduleFormTitle').textContent='Edit Jadwal AMC';window.go('scheduleAdmin')};
  window.amcDeleteSchedule=async id=>{if(!confirm('Hapus jadwal ini?'))return;const sb=await window.JFSTenantAuth.getSupabase();const{error}=await sb.from('jfs_amc_schedules').delete().eq('id',id).eq('tenant_id',TENANT);if(error)return window.toast?.(error.message);await renderAdminSchedules();await loadPublicSchedule();window.toast?.('Jadwal dihapus')};
  function overrideSave(){
    if(window.__amcSaveOverridden)return; window.__amcSaveOverridden=true; addQueueField();
    const oldReset=window.resetScheduleForm; window.resetScheduleForm=()=>{oldReset?.();if($('scheduleQueue'))$('scheduleQueue').value='3–4 bulan'};
    window.saveSchedule=async()=>{const role=String(window.__JFS_ACCESS_ROLE||'').toLowerCase();if(role&& !['owner','admin'].includes(role))return window.toast?.('Akses ditolak');const title=$('scheduleTitle')?.value.trim();if(!title)return window.toast?.('Judul kelas wajib diisi');try{const sb=await window.JFSTenantAuth.getSupabase();const payload={tenant_id:TENANT,program_type:$('scheduleType').value,title,schedule_date:$('scheduleDate').value||null,start_time:$('scheduleStart').value||null,end_time:$('scheduleEnd').value||null,location:$('scheduleLocation').value.trim()||null,meeting_url:$('scheduleUrl').value.trim()||null,status:$('scheduleStatus').value,queue_estimate:$('scheduleQueue')?.value.trim()||'3–4 bulan',notes:$('scheduleNotes').value.trim()||null,updated_at:new Date().toISOString()};let r;if($('scheduleId').value)r=await sb.from('jfs_amc_schedules').update(payload).eq('id',$('scheduleId').value).eq('tenant_id',TENANT);else r=await sb.from('jfs_amc_schedules').insert(payload);if(r.error)throw r.error;window.resetScheduleForm?.();await renderAdminSchedules();await loadPublicSchedule();if(typeof window.renderBooking==='function')window.renderBooking();window.toast?.('Jadwal AMC berhasil disimpan') }catch(e){window.toast?.('Gagal menyimpan jadwal: '+e.message)}};
  }
  function overrideRegister(){
    if(window.__amcRegisterOverridden)return; window.__amcRegisterOverridden=true;
    window.register=async function(){const n=$('rn')?.value.trim(),phone=$('rp')?.value.trim(),pr=$('rprog')?.value||'AMC Online';if(!n)return window.toast?.('Nama wajib diisi');if(!phone)return window.toast?.('WhatsApp wajib diisi');try{const sb=await window.JFSTenantAuth.getSupabase();const{data,error}=await sb.rpc('create_customer_booking',{p_tenant_code:'MAS-FIRMAN-PRATAMA',p_name:n,p_phone:phone,p_email:'',p_program_interest:pr,p_booking_date:new Date().toISOString().slice(0,10),p_start_time:null,p_end_time:null,p_notes:'Pendaftaran AMC dari dashboard'});if(error)throw error;const steps=data?.steps||[];window.toast?.(`Pendaftaran tersimpan. Biaya awal ${money(data?.amount||PRICE)}. Alur: ${steps.map(s=>s.name).join(' → ')}`);$('rn').value='';$('rp').value='';}catch(e){console.error(e);window.toast?.('Pendaftaran gagal: '+(e.message||'error'))}};
  }
  function boot(){addFlowUI();addQueueField();overrideSave();overrideRegister();loadPublicSchedule();setTimeout(renderAdminSchedules,250);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else setTimeout(boot,0);
})();
