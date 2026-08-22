(() => {
  const TENANT='MAS-FIRMAN-PRATAMA';
  const money=n=>'Rp '+Number(n||0).toLocaleString('id-ID');
  const esc=s=>String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
  async function sb(){return window.JFSTenantAuth.getSupabase()}
  function ensurePortal(){
    const book=document.getElementById('book'); if(!book||document.getElementById('amcParticipantPanel')) return;
    const panel=document.createElement('div'); panel.id='amcParticipantPanel'; panel.className='panel'; panel.style.marginTop='18px';
    panel.innerHTML=`<h3>📋 Formulir Lengkap & Akses Materi Peserta</h3><p class="muted">Gunakan nomor WhatsApp untuk melanjutkan peserta yang sudah terdaftar. Setelah pembayaran diverifikasi, formulir lengkap dan materi akan terbuka sesuai status.</p><div class="row"><input id="pfPhone" class="input" placeholder="Nomor WhatsApp peserta"><button class="btn" id="pfLoad">🔎 Cek Status Peserta</button></div><div id="pfResult"></div>`;
    book.querySelector('.panel')?.appendChild(panel);
    document.getElementById('pfLoad').onclick=loadParticipant;
  }
  function wa(phone,text){
    let p=String(phone||'').replace(/\D/g,''); if(p.startsWith('0'))p='62'+p.slice(1); if(!p)return;
    window.open('https://wa.me/'+p+'?text='+encodeURIComponent(text),'_blank','noopener');
  }
  async function loadParticipant(){
    const phone=document.getElementById('pfPhone').value.trim(); const out=document.getElementById('pfResult');
    if(!phone){out.innerHTML='<div class="item">Nomor WhatsApp wajib diisi.</div>';return;}
    out.innerHTML='<div class="item">Memuat status peserta…</div>';
    try{
      const s=await sb();
      const {data,error}=await s.from('jfs_amc_participants').select('*').eq('tenant_id',window.JFSTenantAuth.tenantId).eq('phone',phone).order('created_at',{ascending:false}).limit(1).maybeSingle();
      if(error)throw error;
      if(!data){out.innerHTML='<div class="item">Peserta belum ditemukan. Silakan gunakan formulir Daftar AMC terlebih dahulu.</div>';return;}
      const {data:pay}=await s.from('jfs_amc_payments').select('*').eq('participant_id',data.id).order('created_at',{ascending:false}).limit(1).maybeSingle();
      const {data:del}=await s.from('jfs_amc_material_deliveries').select('*').eq('participant_id',data.id).order('created_at',{ascending:false});
      const steps=['Daftar & Bayar','Formulir Peserta','Materi AMC','Menunggu Antrean','Kelas AMC']; const current=Math.max(1,Number(data.current_step||1));
      const stepHtml=steps.map((x,i)=>`<span style="display:inline-block;padding:6px 9px;margin:3px;border-radius:8px;background:${i+1<=current?'#dff7e8':'#f1f3f5'}">${i+1}. ${x}</span>`).join('');
      const paid=pay?.status==='verified'||data.payment_status==='paid';
      let materialHtml=del?.length?del.map(d=>`<div class="item"><b>${esc(d.material_title||'Materi AMC')}</b><br><small>Status: ${esc(d.status||'pending')}</small>${d.material_url?`<br><a class="btn" href="${esc(d.material_url)}" target="_blank" rel="noopener">📚 Buka Materi</a>`:''}</div>`).join(''):'<div class="item">Materi akan muncul setelah pembayaran diverifikasi dan pengiriman materi dibuat oleh admin.</div>';
      out.innerHTML=`<div class="card" style="margin-top:14px"><h3>${esc(data.full_name)}</h3><p class="muted">Program: ${esc(data.program_type)} · Pembayaran: <b>${paid?'TERVERIFIKASI':'BELUM TERVERIFIKASI'}</b></p><div>${stepHtml}</div><hr><h4>Formulir Peserta</h4><div class="grid"><input id="pfName" class="input" value="${esc(data.full_name)}" placeholder="Nama lengkap"><input id="pfEmail" class="input" value="${esc(data.email||'')}" placeholder="Email"><input id="pfCity" class="input" value="${esc(data.city||'')}" placeholder="Kota"><input id="pfAddress" class="input" value="${esc(data.address||'')}" placeholder="Alamat"><input id="pfBirth" type="date" class="input" value="${esc(data.birth_date||'')}"><input id="pfOccupation" class="input" value="${esc(data.occupation||'')}" placeholder="Pekerjaan"><select id="pfGender" class="select"><option value="">Jenis kelamin</option><option ${data.gender==='Laki-laki'?'selected':''}>Laki-laki</option><option ${data.gender==='Perempuan'?'selected':''}>Perempuan</option></select></div><button class="btn" id="pfSave">💾 Simpan Formulir</button><hr><h4>📚 Materi Peserta</h4>${materialHtml}<hr><h4>📅 Jadwal</h4><p class="muted">${data.schedule_id?'Jadwal sudah ditetapkan. Silakan cek informasi terbaru dari admin.':'Masih dalam antrean. Estimasi saat ini mengikuti jadwal publik AMC.'}</p><button class="btn" id="pfWA">💬 Hubungi Admin via WhatsApp</button></div>`;
      document.getElementById('pfSave').onclick=()=>saveParticipant(data.id,phone);
      document.getElementById('pfWA').onclick=()=>wa(phone,'Halo Admin Mas Firman, saya '+data.full_name+' ingin menanyakan status pendaftaran AMC saya.');
    }catch(e){console.error(e);out.innerHTML='<div class="item">Gagal memuat peserta: '+esc(e.message)+'</div>';}
  }
  async function saveParticipant(id,phone){
    const s=await sb(); const payload={full_name:document.getElementById('pfName').value.trim(),email:document.getElementById('pfEmail').value.trim()||null,city:document.getElementById('pfCity').value.trim()||null,address:document.getElementById('pfAddress').value.trim()||null,birth_date:document.getElementById('pfBirth').value||null,occupation:document.getElementById('pfOccupation').value.trim()||null,gender:document.getElementById('pfGender').value||null,registration_status:'form_completed',current_step:3,updated_at:new Date().toISOString()};
    const {error}=await s.from('jfs_amc_participants').update(payload).eq('id',id).eq('tenant_id',window.JFSTenantAuth.tenantId); if(error){window.toast?.('Formulir gagal disimpan: '+error.message);return;} await s.from('jfs_analytics_events').insert({tenant_id:window.JFSTenantAuth.tenantId,event_type:'participant_form_completed',channel:'dashboard',metadata:{participant_id:id}}); window.toast?.('Formulir lengkap tersimpan.'); loadParticipant();
  }
  window.amcParticipantFlow={ensurePortal,loadParticipant};
  const old=window.register;
  window.register=async()=>{await old?.(); setTimeout(ensurePortal,300);};
  window.addEventListener('load',()=>setTimeout(ensurePortal,500));
})();
