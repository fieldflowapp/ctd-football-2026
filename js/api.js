const CTD_API = (() => {
  const db = window.CTD_SUPABASE;
  const slug = window.CTD_CONFIG.TOURNAMENT_SLUG;

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
      homeLogo: m.home_team_logo_url || '',
      awayTeamId: m.away_team_id,
      awayTeam: m.away_team_name || '',
      awayLogo: m.away_team_logo_url || '',

      homeScore: m.home_score,
      awayScore: m.away_score,
      status: statusToUi(m.status),

      winnerTeamId: m.winner_team_id,
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

  function mapStanding(r){
    return {
      position: Number(r.rank_position),
      teamId: r.tournament_team_id,
      team: r.team_name,
      teamLogo: r.team_logo_url || '',
      played: r.played,
      won: r.won,
      drawn: r.drawn,
      lost: r.lost,
      goalsFor: r.goals_for,
      goalsAgainst: r.goals_against,
      goalDifference: r.goal_difference,
      points: r.points,
      fairPlay: r.fair_play_points,
      qualifiesFinal: !!r.qualifies_final
    };
  }

  async function getPublic(){
    const [
      tournamentResult,
      matchesResult,
      standingsResult
    ] = await Promise.all([
      db.from('tournaments')
        .select('id,name,short_name,sport,year,timezone,status')
        .eq('slug', slug)
        .single(),

      db.from('v_match_details')
        .select('*')
        .eq('tournament_slug', slug)
        .order('scheduled_at',{ascending:true})
        .order('venue_name',{ascending:true}),

      db.from('v_category_standings')
        .select('*')
        .eq('tournament_slug', slug)
        .order('category_name',{ascending:true})
        .order('rank_position',{ascending:true})
    ]);

    if(tournamentResult.error) throw tournamentResult.error;
    if(matchesResult.error) throw matchesResult.error;
    if(standingsResult.error) throw standingsResult.error;

    const matches = (matchesResult.data || []).map(mapMatch);
    const standings = {};

    for(const category of CTD_CONFIG.CATEGORIES){
      standings[category] = (standingsResult.data || [])
        .filter(r => r.category_name === category)
        .map(mapStanding);
    }

    return {
      app: {
        name: tournamentResult.data.name,
        shortName: tournamentResult.data.short_name,
        sport: tournamentResult.data.sport,
        logos: {
          SCHOOL: CTD_CONFIG.SCHOOL_LOGO,
          FIELDFLOW: CTD_CONFIG.FIELDFLOW_LOGO
        }
      },
      categories: CTD_CONFIG.CATEGORIES.slice(),
      fields: Object.values(CTD_CONFIG.CATEGORY_FIELD),
      matches,
      standings,
      finals: CTD_CONFIG.CATEGORIES.map(category => ({
        category,
        match: matches.find(m => m.category === category && m.stage === 'FINAL') || null
      })),
      updatedAt: new Date().toISOString()
    };
  }

  function subscribePublic(onChange){
    const channel = db
      .channel('ctd-football-2026-public')
      .on('postgres_changes',
        {event:'*',schema:'public',table:'matches'},
        onChange
      )
      .on('postgres_changes',
        {event:'*',schema:'public',table:'standings'},
        onChange
      )
      .on('postgres_changes',
        {event:'*',schema:'public',table:'match_referees'},
        onChange
      )
      .subscribe();

    return () => db.removeChannel(channel);
  }

  return {
    getPublic,
    subscribePublic
  };
})();
