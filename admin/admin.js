const S={data:null,filterCategory:'ALL',filterStatus:'ACTIVE',cacheKey:'ctd_admin_cache_supabase_v1'};
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

function setConn(ok){
  const el=$('connection');
  el.textContent=ok?'Online':'Offline';
  el.className='connection '+(ok?'online':'offline');
}

function flash(msg,type='ok'){
  const el=$('flash');
  el.textContent=msg;
  el.className='flash '+type;
  setTimeout(()=>el.classList.add('hidden'),2500);
}

function showAdmin(){
  $('loginView').classList.add('hidden');
  $('adminView').classList.remove('hidden');
}

function showLogin(){
  $('adminView').classList.add('hidden');
  $('loginView').classList.remove('hidden');
}

async function loadLoginLogo(){
  const img=$('loginLogoImg');
  if(!img)return;

  try{
    const {data,error}=await CTD_SUPABASE
      .from('media_assets')
      .select('bucket_id,object_path,alt_text,display_name')
      .eq('asset_key','fieldflow-login')
      .eq('active',true)
      .maybeSingle();

    if(error)throw error;

    if(!data?.object_path){
      img.style.display='none';
      return;
    }

    let logoUrl='';

    if(data.bucket_id==='inline' || /^data:/i.test(data.object_path)){
      logoUrl=data.object_path;
    }else if(data.bucket_id==='external' || /^https?:\/\//i.test(data.object_path)){
      logoUrl=data.object_path;
    }else{
      const {data:urlData}=CTD_SUPABASE.storage
        .from(data.bucket_id||'logos')
        .getPublicUrl(data.object_path);
      logoUrl=urlData.publicUrl;
    }

    img.src=logoUrl;
    img.alt=data.alt_text||data.display_name||'FieldFlow';
    img.style.display='block';
  }catch(err){
    console.error('Unable to load FieldFlow login logo',err);
    img.style.display='none';
  }
}

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
  }catch(_){
    return false;
  }
}

async function refresh(silent=false){
  try{
    const data=await ADMIN_API.adminData();
    S.data=data;
    localStorage.setItem(S.cacheKey,JSON.stringify({at:Date.now(),data}));
    setConn(true);
    render();

    const settingsLink=$('superAdminSettingsLink');
    if(settingsLink){
      settingsLink.classList.toggle('hidden',data.role!=='super_admin');
    }

    $('updatedText').textContent=
      String(data.role||'admin').toUpperCase()+
      ' · Updated '+
      new Date().toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit',second:'2-digit'});

    if(!silent)flash('Tournament updated');
  }catch(e){
    setConn(false);

    if(/session|auth|jwt|not authorized/i.test(e.message||'')){
      showLogin();
      $('loginError').textContent=e.message||'Session expired.';
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
  ].map(([l,v])=>'<div class="metric"><div class="label">'+l+'</div><div class="value">'+v+'</div></div>').join('');
}

function n(v,d=''){
  return v===null||v===undefined?d:v;
}

function refereeOptions(selected){
  const refs=S.data?.referees||[];

  return '<option value="">No referee</option>'+
    refs.map(r=>'<option value="'+esc(r.id)+'" '+(r.id===selected?'selected':'')+'>'+esc(r.name||r.id)+'</option>').join('');
}

function teamAdminLabel(name,logo){
  return '<span class="admin-team-with-logo">'+
    (logo?'<img class="admin-team-logo" src="'+esc(logo)+'" alt="">':'')+
    '<span>'+esc(name)+'</span>'+
  '</span>';
}

function card(m){
  const id=esc(m.matchId);
  const final=m.status==='FINAL';
  const isFinalStage=m.stage==='FINAL';

  let html='';
  html+='<article class="match '+(final?'finalized':'')+'" data-id="'+id+'">';
  html+='<div class="match-head"><div class="meta">';
  html+='<span class="pill">'+esc(m.startTime)+'</span>';
  html+='<span class="pill">'+esc(m.field)+'</span>';
  html+='<span class="pill">'+esc(m.category)+'</span>';
  html+='<span class="pill">'+esc(m.stage)+'</span>';
  html+='<span class="pill '+String(m.status||'').toLowerCase()+'">'+esc(m.status)+'</span>';
  html+='</div><strong>'+id.slice(0,8)+'</strong></div>';

  html+='<div class="match-body">';
  html+='<div class="team-name">'+esc(m.homeTeam)+'</div>';
  html+='<div class="score-box">';
  html+='<input data-k="homeScore" type="number" min="0" inputmode="numeric" value="'+esc(n(m.homeScore,''))+'">';
  html+='<div class="score-sep">:</div>';
  html+='<input data-k="awayScore" type="number" min="0" inputmode="numeric" value="'+esc(n(m.awayScore,''))+'">';
  html+='</div>';
  html+='<div class="team-name away">'+esc(m.awayTeam)+'</div>';
  html+='</div>';

  html+='<div class="match-controls">';
  html+='<div class="field"><label>Home 🟨</label><input data-k="yellowHome" type="number" min="0" value="'+n(m.yellowHome,0)+'"></div>';
  html+='<div class="field"><label>Home 🟥</label><input data-k="redHome" type="number" min="0" value="'+n(m.redHome,0)+'"></div>';
  html+='<div class="field"><label>Away 🟨</label><input data-k="yellowAway" type="number" min="0" value="'+n(m.yellowAway,0)+'"></div>';
  html+='<div class="field"><label>Away 🟥</label><input data-k="redAway" type="number" min="0" value="'+n(m.redAway,0)+'"></div>';

  if(isFinalStage){
    html+='<div class="field"><label>Pen. Home</label><input data-k="homePenalties" type="number" min="0" value="'+esc(n(m.homePenalties,''))+'"></div>';
    html+='<div class="field"><label>Pen. Away</label><input data-k="awayPenalties" type="number" min="0" value="'+esc(n(m.awayPenalties,''))+'"></div>';
  }

  html+='<div class="field"><label>Status</label><select data-k="status">';
  html+='<option '+(m.status==='SCHEDULED'?'selected':'')+'>SCHEDULED</option>';
  html+='<option '+(m.status==='LIVE'?'selected':'')+'>LIVE</option>';
  html+='<option '+(m.status==='FINAL'?'selected':'')+'>FINAL</option>';
  html+='</select></div>';

  html+='<div class="field"><label>Referee</label><select data-ref>'+refereeOptions(m.refereeId)+'</select></div>';
  html+='<div class="save-wrap"><button class="btn save-btn" data-save type="button">Save</button></div>';
  html+='</div>';

  html+='<div class="match-msg" data-msg>'+(final?'Finished · controls hidden on mobile':'')+'</div>';
  html+='</article>';

  return html;
}

function render(){
  if(!S.data)return;

  renderSummary();
  const ms=filtered();

  $('matches').innerHTML=
    ms.length
      ? ms.map(card).join('')
      : '<div class="loading">No matches in this filter.</div>';

  document.querySelectorAll('[data-save]').forEach(
    b=>b.addEventListener('click',()=>saveCard(b.closest('.match')))
  );
}

function readCard(el){
  const matchId=el.dataset.id;
  const current=(S.data?.matches||[]).find(m=>m.matchId===matchId);

  const p={
    matchId,
    stage:current?.stage||'GROUP'
  };

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

  try{
    await ADMIN_API.saveMatch(p,ref);
    setConn(true);
    msg.textContent='Saved ✓';
    flash('Match saved');
    await refresh(true);
  }catch(e){
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

  const email=$('email').value.trim();
  const password=$('password').value;
  const btn=e.currentTarget.querySelector('button');

  $('loginError').textContent='';
  btn.disabled=true;
  btn.textContent='Signing in…';

  try{
    await ADMIN_API.login(email,password);
    showAdmin();
    await refresh(true);
  }catch(err){
    $('loginError').textContent=err.message||'Access denied';
  }finally{
    btn.disabled=false;
    btn.textContent='Sign in';
  }
});

$('categoryFilter').addEventListener('change',e=>{
  S.filterCategory=e.target.value;
  render();
});

$('statusFilter').addEventListener('change',e=>{
  S.filterStatus=e.target.value;
  render();
});

$('refreshBtn').addEventListener('click',()=>refresh());

$('logoutBtn').addEventListener('click',async()=>{
  try{await ADMIN_API.logout()}catch(_){}
  localStorage.removeItem(S.cacheKey);
  S.data=null;
  showLogin();
});

document.addEventListener('DOMContentLoaded',async()=>{
  $('schoolLogo').src=CTD_CONFIG.SCHOOL_LOGO;
  await loadLoginLogo();

  hydrate();

  try{
    const session=await ADMIN_API.session();

    if(session){
      showAdmin();
      await refresh(true);
    }else{
      showLogin();
    }
  }catch(e){
    showLogin();
  }

  ADMIN_API.onAuthStateChange((event,session)=>{
    if(event==='SIGNED_OUT'||!session){
      showLogin();
    }
  });
});
