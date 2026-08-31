const CTD_API = (() => {
  function apiUrl(){
    const url = String(window.CTD_CONFIG.API_URL || "");
    if(!url) throw new Error("API_URL not configured");
    return url.replace(/\/+$/,"");
  }

  async function getPublic(){
    const response = await fetch(
      `${apiUrl()}?api=public&_=${Date.now()}`,
      { method:"GET", cache:"no-store", redirect:"follow" }
    );

    if(!response.ok) throw new Error(`API HTTP ${response.status}`);
    const json = await response.json();
    if(json && json.ok === false) throw new Error(json.error || "API error");
    return json.data || json;
  }

  return { getPublic };
})();
