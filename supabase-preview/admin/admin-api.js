const ADMIN_API = (() => {
  const db = window.CTD_SUPABASE;
  const slug = window.CTD_CONFIG.TOURNAMENT_SLUG;

  const statusToDb = status => ({
    SCHEDULED: 'scheduled',
    LIVE: 'live',
    FINAL: 'finished',
    POSTPONED: 'postponed',
    CANCELLED: 'cancelled'
  }[String(status || '').toUpperCase()] || String(status || '').toLowerCase());

  const statusToUi = status => ({
    scheduled: 'SCHEDULED',
    live: 'LIVE',
    finished: 'FINAL',
    postponed: 'POSTPONED',
    cancelled: 'CANCELLED'
  }[String(status || '').toLowerCase()] || String(status || '').toUpperCase());

  const stageToUi = stage =>
    String(stage || '').toLowerCase() === 'final' ? 'FINAL' : 'GROUP';

  function formatTime(value){
    if(!value) return '';
    return new Intl.DateTimeFormat('en-GB',{
      timeZone:'America/Santiago',
      hour:'2-digit',
      minute:'2-digit',
      hour12:false
    }).format(new Date(value));
  }

  function mapMatch(m){
    return {
      matchId: m.match_id,
      tournamentId: m.tournament_id,
      category: m.category_name,
      field: m.venue_name || '',
      stage: stageToUi(m.stage),
      startTime: formatTime(m.scheduled_at),

      homeTeamId: m.home_team_id,
      homeTeam: m.home_team_name || '',
      awayTeamId: m.away_team_id,
      awayTeam: m.away_team_name || '',

      homeScore: m.home_score,
      awayScore: m.away_score,
      status: statusToUi(m.status),

      refereeId: m.referee_id || '',
      refereeName: m.referee_name || '',

      yellowHome: m.home_yellow || 0,
      redHome: m.home_red || 0,
      yellowAway: m.away_yellow || 0,
      redAway: m.away_red || 0,

      homePenalties: m.home_penalties,
      awayPenalties: m.away_penalties,
      notes: m.notes || '',
      updatedAt: m.updated_at
    };
  }

  async function login(email,password){
    const {data,error}=await db.auth.signInWithPassword({email,password});
    if(error) throw error;
    return data;
  }

  async function session(){
    const {data,error}=await db.auth.getSession();
    if(error) throw error;
    return data.session;
  }

  async function adminData(){
    const current = await session();
    if(!current?.user) throw new Error('No active admin session.');

    const tournamentResult = await db
      .from('tournaments')
      .select('id,name')
      .eq('slug',slug)
      .single();

    if(tournamentResult.error) throw tournamentResult.error;

    const permissionResult = await db
      .from('tournament_admins')
      .select('role')
      .eq('tournament_id',tournamentResult.data.id)
      .eq('user_id',current.user.id)
      .maybeSingle();

    if(permissionResult.error) throw permissionResult.error;
    if(!permissionResult.data) throw new Error('This user is not authorized for this tournament.');

    const [matchesResult,refsResult] = await Promise.all([
      db.from('v_match_details')
        .select('*')
        .eq('tournament_slug',slug)
        .order('scheduled_at',{ascending:true})
        .order('venue_name',{ascending:true}),

      db.from('referees')
        .select('id,name,active')
        .eq('active',true)
        .order('name',{ascending:true})
    ]);

    if(matchesResult.error) throw matchesResult.error;
    if(refsResult.error) throw refsResult.error;

    return {
      role: permissionResult.data.role,
      matches: (matchesResult.data || []).map(mapMatch),
      referees: refsResult.data || [],
      updatedAt: new Date().toISOString()
    };
  }

  function parseNullableInt(value){
    if(value === '' || value === null || value === undefined) return null;
    const n = Number(value);
    if(!Number.isInteger(n) || n < 0) throw new Error('Scores and cards must be whole numbers ≥ 0.');
    return n;
  }

  async function saveMatch(payload,refereeId=''){
    const homeScore=parseNullableInt(payload.homeScore);
    const awayScore=parseNullableInt(payload.awayScore);
    const homePenalties=parseNullableInt(payload.homePenalties);
    const awayPenalties=parseNullableInt(payload.awayPenalties);

    const {data,error}=await db.rpc('save_match_result',{
      p_match_id:payload.matchId,
      p_home_score:homeScore,
      p_away_score:awayScore,
      p_status:statusToDb(payload.status),
      p_home_yellow:parseNullableInt(payload.yellowHome) ?? 0,
      p_home_red:parseNullableInt(payload.redHome) ?? 0,
      p_away_yellow:parseNullableInt(payload.yellowAway) ?? 0,
      p_away_red:parseNullableInt(payload.redAway) ?? 0,
      p_home_penalties:homePenalties,
      p_away_penalties:awayPenalties,
      p_referee_id:refereeId || null
    });

    if(error) throw error;
    return data || {ok:true};
  }

  async function logout(){
    const {error}=await db.auth.signOut();
    if(error) throw error;
    return {ok:true};
  }

  function onAuthStateChange(callback){
    return db.auth.onAuthStateChange(callback);
  }

  return {
    login,
    session,
    adminData,
    saveMatch,
    logout,
    onAuthStateChange
  };
})();
