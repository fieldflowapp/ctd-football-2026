window.CTD_CONFIG = {
  TOURNAMENT_NAME: "Charles T. Darling Football Tournament 2026",
  TOURNAMENT_SLUG: "ctd-football-2026",

  SUPABASE_URL: "https://qhsvvlcgwdmxxappplzh.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_AzlSdUYiNA5DM7BXGOe5OA_M8wrJGoO",

  REFRESH_SECONDS: 60,

  SCHOOL_LOGO: "https://drive.google.com/thumbnail?id=17GaYbEA3Nj54f0pueVQtphAfG05kObnp&sz=w1000",
  FIELDFLOW_LOGO: "https://drive.google.com/thumbnail?id=1F0ws2MvbVbn0R1G2qmgWKgz0P42BmZaB&sz=w1000",

  CATEGORIES: ["Intermedia", "Senior"],
  CATEGORY_FIELD: {
    Intermedia: "P1",
    Senior: "P2"
  }
};

window.CTD_SUPABASE = supabase.createClient(
  window.CTD_CONFIG.SUPABASE_URL,
  window.CTD_CONFIG.SUPABASE_PUBLISHABLE_KEY
);
