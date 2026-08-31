const CTD_API = (() => {
  function apiUrl(){
    const url = String(window.CTD_CONFIG.API_URL || "");
    if(!url) throw new Error("API_URL not configured");
    return url.replace(/\/+$/,"");
  }

  function jsonp(url, timeoutMs = 12000){
    return new Promise((resolve, reject) => {
      const callbackName = `__ctd_jsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const script = document.createElement('script');
      let done = false;

      const cleanup = () => {
        if(done) return;
        done = true;
        clearTimeout(timer);
        if(script.parentNode) script.parentNode.removeChild(script);
        try { delete window[callbackName]; } catch(_) { window[callbackName] = undefined; }
      };

      window[callbackName] = payload => {
        cleanup();
        if(payload && payload.ok === false){
          reject(new Error(payload.error || 'API error'));
          return;
        }
        resolve(payload && payload.data ? payload.data : payload);
      };

      script.onerror = () => {
        cleanup();
        reject(new Error('JSONP connection failed'));
      };

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('JSONP timeout'));
      }, timeoutMs);

      const sep = url.includes('?') ? '&' : '?';
      script.src = `${url}${sep}callback=${encodeURIComponent(callbackName)}&_=${Date.now()}`;
      script.async = true;
      document.head.appendChild(script);
    });
  }

  function getPublic(){
    return jsonp(`${apiUrl()}?api=public`);
  }

  return { getPublic };
})();
