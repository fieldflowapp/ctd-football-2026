const S={token:sessionStorage.getItem('ctd_admin_token')||'',data:null,filterCategory:'ALL',filterStatus:'ACTIVE',cacheKey:'ctd_admin_cache_v1'};
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

function setConn(ok){const el=$('connection');el.textContent=ok?'Online':'Offline';el.className=`connection ${ok?'online':'offline'}`}
function flash(msg,type='ok'){const el=$('flash');el.textContent=msg;el.className=`flash ${type}`;setTimeout(()=>el.classList.add('hidden'),2500)}
function showAdmin(){$('loginView').classList.add('hidden');$('adminView').classList.remove('hidden')}
function showLogin(){$('adminView').classList.add('hidden');$('loginView').classList.remove('hidden')}

function hydrate(){
  try{
    const raw=localStorage.getItem(S.cacheKey);
    if(!raw)return false;
    const parsed=JSON.parse(raw);
    if(!parsed?.data)return false;
    S.data=parsed.data;
    showAdmin();
    render();
    $('updatedText').textContent='Cached data · refreshing…';
    return true;
  }catch(_){return false}
}

async function refresh(silent=false){
  try{
    if(!S.token)throw new Error('No session');
    const data=await ADMIN_API.adminData(S.token);
    S.data=data;
    localStorage.setItem(S.cacheKey,JSON.stringify({at:Date.now(),data}));
    setConn(true);
    render();
    $('updatedText').textContent=`Updated ${new Date().toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}`;
    if(!silent)flash('Tournament updated');
  }catch(e){
    setConn(false);
    if(/session|token|unauthor/i.test(e.message||'')){
      sessionStorage.removeItem('ctd_admin_token');
      S.token='';
      showLogin();
      $('loginError').textContent='Session expired. Enter PIN again.';
      return;
    }
    if(!silent)flash(e.message||'Unable to refresh','error');
  }
}

function filtered(){
  const list=S.data?.matches||[];
  return list.filter(m=>{
    if(S.filterCategory!=='ALL'&&m.category!==S.filterCategory)return false;
    if(S.filterStatus==='FINAL'&&m.status!=='FINAL')return false;
    if(S.filterStatus==='ACTIVE'&&m.status==='FINAL')return false;
    return true;
  });
}

function renderSummary(){
  const ms=S.data?.matches||[];
  $('summary').innerHTML=[
    ['Total',ms.length],
    ['Scheduled',ms.filter(m=>m.status==='SCHEDULED').length],
    ['Live',ms.filter(m=>m.status==='LIVE').length],
    ['Finished',ms.filter(m=>m.status==='FINAL').length]
  ].map(([l,v])=>`<div class="metric"><div class="label">${l}</div><div class="value">${v}</div></div>`).join('');
}

function n(v,d=''){return v===null||v===undefined?d:v}

function refereeOptions(selected){
  const refs=S.data?.referees||[];
  return `<option value="">No referee</option>`+refs.map(r=>`<option value="${esc(r.id)}" ${r.id===selected?'selected':''}>${esc(r.name||r.id)}</option>`).join('');
}

function card(m){
  const id=esc(m.matchId);
  const final=m.status==='FINAL';
  const finals=m.stage==='FINAL';
  return `<article class="match ${final?'finalized':''}" data-id="${id}">
    <div class="match-head">
      <div class="meta">
        <span class="pill">${esc(m.startTime)}</span>
        <span class="pill">${esc(m.field)}</span>
        <span class="pill">${esc(m.category)}</span>
        <span class="pill">${esc(m.stage)}</span>
        <span class="pill ${String(m.status||'').toLowerCase()}">${esc(m.status)}</span>
      </div>
      <strong>${id}</strong>
    </div>
    <div class="match-body">
      <div class="team-name">${esc(m.homeTeam)}</div>
      <div class="score-box">
        <input data-k="homeScore" type="number" min="0" inputmode="numeric" value="${esc(n(m.homeScore,''))}">
        <div class="score-sep">:</div>
        <input data-k="awayScore" type="number" min="0" inputmode="numeric" value="${esc(n(m.awayScore,''))}">
      </div>
      <div class="team-name away">${esc(m.awayTeam)}</div>
    </div>
    <div class="match-controls">
      <div class="field"><label>Home 🟨</label><input data-k="yellowHome" type="number" min="0" value="${n(m.yellowHome,0)}"></div>
      <div class="field"><label>Home 🟥</label><input data-k="redHome" type="number" min="0" value="${n(m.redHome,0)}"></div>
      <div class="field"><label>Away 🟨</label><input data-k="yellowAway" type="number" min="0" value="${n(m.yellowAway,0)}"></div>
      <div class="field"><label>Away 🟥</label><input data-k="redAway" type="number" min="0" value="${n(m.redAway,0)}"></div>
      ${finals?`<div class="field"><label>Pen. Home</label><input data-k="homePenalties" type="number" min="0" value="${esc(n(m.homePenalties,''))}"></div><div class="field"><label>Pen. Away</label><input data-k="awayPenalties" type="number" min="0" value="${esc(n(m.awayPenalties,''))}"></div>`:''}
      <div class="field"><label>Status</label><select data-k="status"><option ${m.status==='SCHEDULED'?'selected':''}>SCHEDULED</option><option ${m.status==='LIVE'?'selected':''}>LIVE</option><option ${m.status==='FINAL'?'selected':''}>FINAL</option></select></div>
      <div class="field"><label>Referee</label><select data-ref>${refereeOptions(m.refereeId)}</select></div>
      <div class="save-wrap"><button class="btn save-btn" data-save type="button">Save</button></div>
    </div>
    <div class="match-msg" data-msg>${final?'Finished · controls hidden on mobile':''}</div>
  </article>`;
}

function render(){
  if(!S.data)return;
  renderSummary();
  const ms=filtered();
  $('matches').innerHTML=ms.length?ms.map(card).join(''):'<div class="loading">No matches in this filter.</div>';
  document.querySelectorAll('[data-save]').forEach(b=>b.addEventListener('click',()=>saveCard(b.closest('.match'))));
}

function readCard(el){
  const matchId=el.dataset.id;
  const p={matchId};
  el.querySelectorAll('[data-k]').forEach(i=>p[i.dataset.k]=i.value);
  return p;
}

async function saveCard(el){
  const btn=el.querySelector('[data-save]');
  const msg=el.querySelector('[data-msg]');
  const p=readCard(el);
  const ref=el.querySelector('[data-ref]')?.value||'';
  btn.disabled=true;
  el.classList.add('saving');
  btn.textContent='Saving…';
  msg.textContent='Saving changes…';
  const original=JSON.parse(JSON.stringify(S.data));
  try{
    const m=S.data.matches.find(x=>x.matchId===p.matchId);
    if(m){
      Object.assign(m,p,{
        homeScore:p.homeScore===''?null:Number(p.homeScore),
        awayScore:p.awayScore===''?null:Number(p.awayScore),
        yellowHome:Number(p.yellowHome||0),
        redHome:Number(p.redHome||0),
        yellowAway:Number(p.yellowAway||0),
        redAway:Number(p.redAway||0),
        homePenalties:p.homePenalties===''?null:Number(p.homePenalties),
        awayPenalties:p.awayPenalties===''?null:Number(p.awayPenalties),
        refereeId:ref,
        refereeName:(S.data.referees||[]).find(r=>r.id===ref)?.name||''
      });
    }
    localStorage.setItem(S.cacheKey,JSON.stringify({at:Date.now(),data:S.data}));
    await ADMIN_API.saveMatch(S.token,p,ref);
    setConn(true);
    msg.textContent='Saved ✓';
    flash(`${p.matchId} saved`);
    setTimeout(()=>refresh(true),150);
  }catch(e){
    S.data=original;
    setConn(false);
    msg.textContent=e.message||'Save failed';
    flash(e.message||'Save failed','error');
  }finally{
    btn.disabled=false;
    el.classList.remove('saving');
    btn.textContent='Save';
  }
}

$('loginForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const pin=$('pin').value.trim();
  const btn=e.currentTarget.querySelector('button');
  $('loginError').textContent='';
  btn.disabled=true;
  btn.textContent='Checking…';
  try{
    const r=await ADMIN_API.login(pin);
    if(!r?.token)throw new Error('Invalid login response');
    S.token=r.token;
    sessionStorage.setItem('ctd_admin_token',S.token);
    showAdmin();
    hydrate();
    await refresh(true);
  }catch(err){
    $('loginError').textContent=err.message||'Access denied';
  }finally{
    btn.disabled=false;
    btn.textContent='Enter Admin';
  }
});

$('categoryFilter').addEventListener('change',e=>{S.filterCategory=e.target.value;render()});
$('statusFilter').addEventListener('change',e=>{S.filterStatus=e.target.value;render()});
$('refreshBtn').addEventListener('click',()=>refresh());
$('logoutBtn').addEventListener('click',async()=>{
  const token=S.token;
  sessionStorage.removeItem('ctd_admin_token');
  S.token='';
  showLogin();
  try{if(token)await ADMIN_API.logout(token)}catch(_){ }
});

document.addEventListener('DOMContentLoaded',()=>{
  $('schoolLogo').src=CTD_CONFIG.SCHOOL_LOGO;
  if(S.token){hydrate();showAdmin();refresh(true)}else showLogin();
});
