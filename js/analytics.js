(function(){
  "use strict";
  const ENDPOINT="https://qhsvvlcgwdmxxappplzh.supabase.co/functions/v1/analytics-track";
  const TOURNAMENT="ctd-football-2026";
  const uuid=()=>crypto.randomUUID ? crypto.randomUUID() : ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16));
  let visitor=localStorage.getItem("ff_visitor_id"); if(!visitor){visitor=uuid();localStorage.setItem("ff_visitor_id",visitor);}
  let session=sessionStorage.getItem("ff_session_id"); if(!session){session=uuid();sessionStorage.setItem("ff_session_id",session);}
  const started=Date.now(); let active=0,lastTick=Date.now();
  const device=/Mobi|Android/i.test(navigator.userAgent)?"mobile":(/Tablet|iPad/i.test(navigator.userAgent)?"tablet":"desktop");
  const browser=/Edg/i.test(navigator.userAgent)?"Edge":/Chrome/i.test(navigator.userAgent)?"Chrome":/Safari/i.test(navigator.userAgent)?"Safari":/Firefox/i.test(navigator.userAgent)?"Firefox":"Other";
  const os=/Android/i.test(navigator.userAgent)?"Android":/iPhone|iPad/i.test(navigator.userAgent)?"iOS":/Windows/i.test(navigator.userAgent)?"Windows":/Mac OS/i.test(navigator.userAgent)?"macOS":"Other";
  let ref=""; try{ref=document.referrer?new URL(document.referrer).hostname:"";}catch(_){}
  const base={session_id:session,visitor_id:visitor,tournament_slug:TOURNAMENT,device_type:device,browser,os,locale:navigator.language||"",timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||"",referrer_host:ref,entry_path:location.pathname};
  function send(event_name,extra){
    const payload=Object.assign({},base,{event_name,page_path:location.pathname},extra||{});
    try{fetch(ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),keepalive:true}).catch(()=>{});}catch(_){}
  }
  send("page_view",{view_name:"fixture"});
  setInterval(()=>{const now=Date.now();if(!document.hidden&&document.hasFocus())active+=Math.min(15,Math.max(0,(now-lastTick)/1000));lastTick=now;send("heartbeat",{active_seconds:Math.round(active)});},15000);
  document.addEventListener("visibilitychange",()=>{lastTick=Date.now();if(document.hidden)send("heartbeat",{active_seconds:Math.round(active)});});
  window.addEventListener("pagehide",()=>send("session_end",{active_seconds:Math.round(active)}));
  document.addEventListener("click",e=>{
    const tab=e.target.closest(".tab"); if(tab){const name=(tab.textContent||"").trim().toLowerCase(); if(["fixture","standings","finals","referees","rules"].includes(name))send("view_change",{view_name:name});}
  },true);
  document.addEventListener("change",e=>{
    const el=e.target;
    if(!(el instanceof HTMLSelectElement))return;
    if(el.id==="filterSchool"&&el.value!=="ALL")send("school_filter",{school_slug:el.value,metadata:{label:el.options[el.selectedIndex]?.text||el.value}});
    if(el.id==="filterCategory"&&el.value!=="ALL")send("category_filter",{category_slug:el.value,metadata:{label:el.options[el.selectedIndex]?.text||el.value}});
  },true);
  window.FieldFlowAnalytics={track:(name,data)=>send(name,data)};
})();