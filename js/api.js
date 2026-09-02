const CTD_API = (() => {
  function apiUrls(){
    const urls = Array.isArray(window.CTD_CONFIG.API_URLS)
      ? window.CTD_CONFIG.API_URLS
      : [window.CTD_CONFIG.API_URL].filter(Boolean);

    const cleaned = [...new Set(
      urls
        .map(url => String(url || '').trim().replace(/\/+$/, ''))
        .filter(Boolean)
    )];

    if(!cleaned.length){
      throw new Error('No Apps Script API URL configured');
    }

    return cleaned;
  }

  function jsonp(url, timeoutMs = 15000){
    return new Promise((resolve, reject) => {
      const callbackName = `__ctd_jsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const script = document.createElement('script');
      let finished = false;

      const cleanup = () => {
        if(finished) return;
        finished = true;
        clearTimeout(timer);
        script.onerror = null;
        script.onload = null;
        if(script.parentNode) script.parentNode.removeChild(script);
        try { delete window[callbackName]; }
        catch(_) { window[callbackName] = undefined; }
      };

      window[callbackName] = payload => {
        cleanup();
        if(payload && payload.ok === false){
          reject(new Error(payload.error || 'Apps Script API error'));
          return;
        }
        resolve(payload && Object.prototype.hasOwnProperty.call(payload,'data') ? payload.data : payload);
      };

      script.onerror = () => {
        cleanup();
        reject(new Error(`JSONP load failed: ${url}`));
      };

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`JSONP timeout: ${url}`));
      }, timeoutMs);

      const sep = url.includes('?') ? '&' : '?';
      script.src = `${url}${sep}callback=${encodeURIComponent(callbackName)}&_=${Date.now()}`;
      script.async = true;
      script.referrerPolicy = 'no-referrer';
      document.head.appendChild(script);
    });
  }

  async function getPublic(){
    const errors = [];

    for(const baseUrl of apiUrls()){
      try{
        return await jsonp(`${baseUrl}?api=public`);
      }catch(error){
        errors.push(error.message || String(error));
      }
    }

    throw new Error(
      'Apps Script connection failed. ' +
      errors.join(' | ')
    );
  }

  return { getPublic };
})();
