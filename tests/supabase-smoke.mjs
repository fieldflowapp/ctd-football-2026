// Production post-merge validation
const url = 'https://qhsvvlcgwdmxxappplzh.supabase.co';
const key = 'sb_publishable_AzlSdUYiNA5DM7BXGOe5OA_M8wrJGoO';
const slug = 'ctd-football-2026';

async function get(path) {
  const r = await fetch(url + '/rest/v1/' + path, {
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + key
    }
  });

  if (!r.ok) {
    throw new Error(path + ' -> ' + r.status + ' ' + await r.text());
  }

  return r.json();
}

const matches = await get(
  'v_match_details?tournament_slug=eq.' + slug + '&select=match_id,category_name,venue_name,status'
);

const standings = await get(
  'v_category_standings?tournament_slug=eq.' + slug + '&select=category_name,rank_position,team_name'
);

if (matches.length !== 14) {
  throw new Error('Expected 14 matches, received ' + matches.length);
}

if (standings.length !== 8) {
  throw new Error('Expected 8 standing rows, received ' + standings.length);
}

const categories = new Set(matches.map(x => x.category_name));
if (!categories.has('Intermedia') || !categories.has('Senior')) {
  throw new Error('Missing tournament categories');
}

console.log('Supabase public smoke test passed');
console.log({ matches: matches.length, standings: standings.length });
