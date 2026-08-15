/* JFS AI — Subscription alerts + live overview */
(function(){
  function start(){
    const client=window.JFS_ADMIN_SUPABASE;
    if(!client||!document.getElementById('rows')) return;
    const rows=document.getElementById('rows');
    const panel=rows.closest('.table')?.parentElement;
    if(!panel) return;
    const alertBox=document.createElement('div');
    alertBox.id='subscriptionAlerts';
    alertBox.style.cssText='margin:0 0 14px;padding:13px 15px;border-radius:10px;border:1px solid #2563eb33;background:#eff6ff;color:#1e3a8a;font-size:13px;line-height:1.5;display:none';
    panel.insertBefore(alertBox,panel.querySelector('.table'));
    const money=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(v||0));
    const fmt=v=>v?new Date(v+'T00:00:00').toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}):'-';
    async function load(){
      try{
        const [{data:tenants,error:te},{data:subs,error:se},{data:plans,error:pe}]=await Promise.all([
          client.from('tenants').select('id,business_name,business_type,whatsapp,status'),
          client.from('tenant_subscriptions').select('id,tenant_id,plan_id,start_date,end_date,status,payment_status,amount,notes').order('end_date',{ascending:false}),
          client.from('subscription_plans').select('id,name,duration_months,price').eq('is_active',true).order('duration_months',{ascending:true})
        ]);
        if(te)throw te;if(se)throw se;if(pe)throw pe;
        const byTenant={};(subs||[]).forEach(s=>{if(!byTenant[s.tenant_id])byTenant[s.tenant_id]=s});
        const planById={};(plans||[]).forEach(p=>planById[p.id]=p);
        const today=new Date();today.setHours(0,0,0,0);
        let warnings=[];
        const data=(tenants||[]).map(t=>{const s=byTenant[t.id],p=s?planById[s.plan_id]:null;let days=null,status='EXPIRED';if(s){const end=new Date(s.end_date+'T00:00:00');days=Math.ceil((end-today)/86400000);status=s.status;if(days<=0&&status==='active')status='EXPIRED';if(status==='active'&&days<=7)warnings.push({name:t.business_name,days});}return {t,s,p,days,status}});
        const soon=data.filter(x=>x.days!==null&&x.days>=0&&x.days<=30).length;
        const active=data.filter(x=>x.status==='active'&&x.days>0).length;
        const expired=data.filter(x=>x.status==='expired'||x.status==='EXPIRED'||x.days<=0).length;
        const stats=document.querySelectorAll('.value');
        if(stats.length>=4){stats[0].textContent=data.length;stats[1].textContent=active;stats[2].textContent=soon;stats[3].textContent=expired}
        if(warnings.length){warnings.sort((a,b)=>a.days-b.days);alertBox.innerHTML='🔔 <b>Peringatan subscription:</b> '+warnings.map(x=>x.days<=1?`${x.name} berakhir ${x.days===0?'hari ini':'besok'}`:`${x.name} berakhir ${x.days} hari lagi`).join(' • ');alertBox.style.display='block'}
        rows.innerHTML=data.map(x=>{const s=x.s,p=x.p;const cls=x.status.toLowerCase();const label=p?p.name:'Belum ada subscription';return `<tr><td><b>${x.t.business_name}</b><div class="muted">${x.t.business_type||'-'}</div></td><td>${x.t.id}</td><td>${label}<div class="muted">${s?money(s.amount):'-'} • ${s?.payment_status||'-'}</div></td><td>${fmt(s?.start_date)}</td><td>${fmt(s?.end_date)}${x.days!==null?`<div class="muted">${x.days>0?x.days+' hari lagi':'sudah berakhir'}</div>`:''}</td><td><span class="badge ${cls}">${x.status}</span></td><td><button class="btn primary" onclick="location.href='index.html#tenants'">Kelola</button></td></tr>`}).join('')||'<tr><td colspan="7" class="muted" style="text-align:center;padding:25px">Belum ada tenant di Supabase.</td></tr>';
        const planCards=document.querySelectorAll('.plan');(plans||[]).forEach((p,i)=>{if(planCards[i]){planCards[i].querySelector('.price').textContent=money(p.price);planCards[i].querySelector('.muted').textContent=p.duration_months+' bulan'}});
      }catch(e){console.error('[JFS Subscription Alerts]',e);alertBox.style.display='block';alertBox.textContent='⚠️ Data subscription live gagal dimuat: '+(e.message||e)}
    }
    load();
  }
  const timer=setInterval(()=>{if(window.JFS_ADMIN_SUPABASE){clearInterval(timer);start()}},100);
  setTimeout(()=>clearInterval(timer),15000);
})();
