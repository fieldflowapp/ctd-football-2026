let DATA=null, VIEW='fixture', FILTERED=[], TIMER=null, UNSUBSCRIBE=null, REALTIME_TIMER=null;
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const safeScore=v=>{if(v===null||v===undefined||v==='')return 0;const n=Number(v);return Number.isFinite(n)?n:0};
const unique=a=>[...new Set(a.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b)));

async function loadTournament(silent=false){
  try{
    if(!silent)$('content').innerHTML='<div class="empty">Loading tournament...</div>';
    DATA=await CTD_API.getPublic();
    buildFilters();
    applyFilters(false);
    updateClock();
    render();
  }catch(error){
    if(!silent || !DATA){
      $('content').innerHTML=`<div class="error"><strong>Unable to connect to tournament data.</strong><br><br>${esc(error.message||error)}</div>`;
    }
  }
}

function fillSelect(id,values,label){
  const select=$(id), current=select.value||'ALL';
  select.innerHTML=`<option value="ALL">${esc(label)}</option>`+values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
  if([...select.options].some(o=>o.value===current))select.value=current;
}

function buildFilters(){
  const matches=DATA?.matches||[];
  fillSelect('filterCategory',unique(matches.map(m=>m.category)),'All categories');
  fillSelect('filterSchool',unique(matches.flatMap(m=>[m.homeTeam,m.awayTeam]).filter(v=>v&&!/^1st |^2nd /i.test(v))),'All schools');
  fillSelect('filterField',unique(matches.map(m=>m.field)),'All fields');
  fillSelect('filterReferee',unique(matches.map(m=>m.refereeName)),'All referees');
}

function applyFilters(renderNow=true){
  if(!DATA)return;
  const category=$('filterCategory').value;
  const school=$('filterSchool').value;
  const field=$('filterField').value;
  const referee=$('filterReferee').value;
  const status=$('filterStatus').value;

  FILTERED=(DATA.matches||[]).filter(m=>{
    if(category!=='ALL'&&m.category!==category)return false;
    if(school!=='ALL'&&m.homeTeam!==school&&m.awayTeam!==school)return false;
    if(field!=='ALL'&&m.field!==field)return false;
    if(referee!=='ALL'&&m.refereeName!==referee)return false;
    if(status!=='ALL'&&m.status!==status)return false;
    return true;
  });

  $('resultCount').textContent=`${FILTERED.length} match${FILTERED.length===1?'':'es'} shown`;
  if(renderNow)render();
}

function clearFilters(){
  ['filterCategory','filterSchool','filterField','filterReferee','filterStatus'].forEach(id=>$(id).value='ALL');
  applyFilters();
}

function showView(view,button){
  VIEW=view;
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  button.classList.add('active');
  $('filterPanel').style.display=view==='fixture'?'block':'none';
  render();
}

function render(){
  if(!DATA)return;
  if(VIEW==='fixture')renderFixture();
  if(VIEW==='tables')renderTables();
  if(VIEW==='finals')renderFinals();
  if(VIEW==='referees')renderReferees();
}

function renderFixture(){
  const categories=CTD_CONFIG.CATEGORIES.filter(cat=>FILTERED.some(m=>m.category===cat));
  if(!categories.length){
    $('content').innerHTML='<div class="empty">No matches match the selected filters.</div>';
    return;
  }

  $('content').innerHTML=categories.map(cat=>`
    <section>
      <div class="section-title">
        <div><h2>${esc(cat)}</h2><p>${esc(CTD_CONFIG.CATEGORY_FIELD[cat]||'')}</p></div>
      </div>
      ${FILTERED.filter(m=>m.category===cat).map(m=>matchCard(m)).join('')}
    </section>
  `).join('');
}

function renderTables(){
  $('content').innerHTML=CTD_CONFIG.CATEGORIES.map(cat=>`
    <section>
      <div class="section-title">
        <div><h2>${esc(cat)}</h2><p>Top 2 qualify for the Final.</p></div>
      </div>
      ${standingsTable(DATA.standings?.[cat]||[])}
    </section>
  `).join('');
}

function renderFinals(){
  $('content').innerHTML=(DATA.finals||[]).map(item=>`
    <section>
      <div class="section-title">
        <div><h2>${esc(item.category)} Final</h2><p>${esc(CTD_CONFIG.CATEGORY_FIELD[item.category]||'')} · 13:40</p></div>
      </div>
      ${item.match?matchCard(item.match,true):'<div class="empty">Final pending.</div>'}
    </section>
  `).join('');
}

function teamWithLogo(name,logo){
  return '<span class="team-with-logo">'+
    (logo?'<img class="team-logo" src="'+esc(logo)+'" alt="">':'')+
    '<span>'+esc(name)+'</span>'+
  '</span>';
}

function renderReferees(){
  const assigned=(DATA.matches||[]).filter(m=>m.refereeName);
  const refs=unique(assigned.map(m=>m.refereeName));

  if(!refs.length){
    $('content').innerHTML='<div class="empty">No referee assignments yet.</div>';
    return;
  }

  $('content').innerHTML=refs.map(ref=>{
    const list=assigned.filter(m=>m.refereeName===ref);
    return `
      <section>
        <div class="section-title">
          <div><h2>${esc(ref)}</h2><p>${list.length} assigned match${list.length===1?'':'es'}</p></div>
        </div>
        ${list.map(m=>matchCard(m)).join('')}
      </section>
    `;
  }).join('');
}

function matchCard(m,isFinal=false){
  const isFinished=m.status==='FINAL';
  const showScore=isFinished||m.status==='LIVE';
  const hs=showScore?safeScore(m.homeScore):'–';
  const as=showScore?safeScore(m.awayScore):'–';

  const penalties=
    m.stage==='FINAL' &&
    isFinished &&
    m.homeScore===m.awayScore &&
    m.homePenalties!==null &&
    m.homePenalties!==undefined
      ? `<div class="small">Penalties ${safeScore(m.homePenalties)} – ${safeScore(m.awayPenalties)}</div>`
      : '';

  return `
    <article class="match-card ${isFinal?'final-card':''}">
      <div class="meta">
        <span class="badge">${esc(m.startTime)}</span>
        <span class="badge">${esc(m.field)}</span>
        <span class="badge">${esc(m.stage)}</span>
        <span class="badge ${String(m.status||'').toLowerCase()}">${esc(m.status)}</span>
        ${m.refereeName?`<span class="badge">Ref: ${esc(m.refereeName)}</span>`:''}
      </div>
      <div class="match-grid">
        <div class="team">${teamWithLogo(m.homeTeam,m.homeLogo)}</div>
        <div>
          <div class="score">${hs} : ${as}</div>
          ${penalties}
        </div>
        <div class="team">${teamWithLogo(m.awayTeam,m.awayLogo)}</div>
      </div>
    </article>
  `;
}

function standingsTable(rows){
  if(!rows.length)return '<div class="empty">No standings available.</div>';

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Pos.</th><th class="left">Team</th><th>PJ</th><th>PG</th><th>PE</th><th>PP</th><th>GF</th><th>GC</th><th>DG</th><th>Pts</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r=>`
            <tr class="${r.qualifiesFinal?'qualify':''}">
              <td><strong>${r.position}</strong></td>
              <td class="left"><strong>${teamWithLogo(r.team,r.teamLogo)}</strong></td>
              <td>${r.played}</td><td>${r.won}</td><td>${r.drawn}</td><td>${r.lost}</td>
              <td>${r.goalsFor}</td><td>${r.goalsAgainst}</td>
              <td>${r.goalDifference>0?'+':''}${r.goalDifference}</td>
              <td><strong>${r.points}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function updateClock(){
  $('lastUpdated').textContent=new Date().toLocaleTimeString('es-CL',{
    hour:'2-digit',
    minute:'2-digit',
    second:'2-digit'
  });
}

function scheduleRealtimeReload(){
  clearTimeout(REALTIME_TIMER);
  REALTIME_TIMER=setTimeout(()=>loadTournament(true),120);
}

document.addEventListener('DOMContentLoaded',()=>{
  $('schoolLogo').src=CTD_CONFIG.SCHOOL_LOGO;
  $('ffLogo').src=CTD_CONFIG.FIELDFLOW_LOGO;

  loadTournament();

  UNSUBSCRIBE=CTD_API.subscribePublic(scheduleRealtimeReload);

  TIMER=setInterval(
    ()=>loadTournament(true),
    Math.max(30,Number(CTD_CONFIG.REFRESH_SECONDS||60))*1000
  );
});

window.addEventListener('beforeunload',()=>{
  if(UNSUBSCRIBE)UNSUBSCRIBE();
  if(TIMER)clearInterval(TIMER);
  if(REALTIME_TIMER)clearTimeout(REALTIME_TIMER);
});
