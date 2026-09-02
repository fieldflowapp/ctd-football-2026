const ADMIN_API=(()=>{
  const urls=()=>{
    const arr=Array.isArray(window.CTD_CONFIG.API_URLS)
      ? window.CTD_CONFIG.API_URLS
      : [window.CTD_CONFIG.API_URL].filter(Boolean);
    return [...new Set(arr.map(x=>String(x||'').trim().replace(/\/+$/,'')).filter(Boolean))];
  };

  function jsonp(base,params={},timeout=12000){
    return new Promise((resolve,reject)=>{
      const cb=`__ff_admin_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const s=document.createElement('script');
      let done=false;
      const finish=(err,data)=>{
        if(done)return;
        done=true;
        clearTimeout(timer);
        s.onerror=null;
        if(s.parentNode)s.parentNode.removeChild(s);
        try{delete window[cb]}catch(_){window[cb]=undefined}
        err?reject(err):resolve(data);
      };
      window[cb]=payload=>{
        if(payload&&payload.ok===false)return finish(new Error(payload.error||'API error'));
        finish(null,payload&&Object.prototype.hasOwnProperty.call(payload,'data')?payload.data:payload);
      };
      s.onerror=()=>finish(new Error('Connection failed'));
      const timer=setTimeout(()=>finish(new Error('API timeout')),timeout);
      const qs=new URLSearchParams({...params,callback:cb,_:Date.now()});
      s.src=`${base}?${qs.toString()}`;
      s.async=true;
      s.referrerPolicy='no-referrer';
      document.head.appendChild(s);
    });
  }

  async function call(params){
    let last;
    for(const base of urls()){
      try{return await jsonp(base,params)}catch(e){last=e}
    }
    throw last||new Error('Apps Script unavailable');
  }

  const resultParams=(p,refereeId='')=>({
    matchId:p.matchId,
    homeScore:p.homeScore,
    awayScore:p.awayScore,
    status:p.status,
    yellowHome:p.yellowHome,
    redHome:p.redHome,
    yellowAway:p.yellowAway,
    redAway:p.redAway,
    homePenalties:p.homePenalties??'',
    awayPenalties:p.awayPenalties??'',
    refereeId:refereeId||''
  });

  async function saveMatch(token,p,refereeId){
    try{
      return await call({api:'saveMatch',token,...resultParams(p,refereeId)});
    }catch(error){
      if(!/unknown api route/i.test(error.message||''))throw error;
      await call({api:'saveResult',token,...resultParams(p)});
      await call({api:'saveReferee',token,matchId:p.matchId,refereeId:refereeId||''});
      return {ok:true,legacyFallback:true};
    }
  }

  return{
    login:pin=>call({api:'adminLogin',pin}),
    adminData:token=>call({api:'admin',token}),
    saveMatch,
    logout:token=>call({api:'adminLogout',token})
  };
})();
