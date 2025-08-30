export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const debug = url.searchParams.get('debug') === '1';
    
    const body = await request.json();
    const { year, club } = body;

    if (!year || typeof year !== 'number') {
      return new Response(JSON.stringify({ error: 'year is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Missing Supabase configuration' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const clubInt = club ? parseInt(club) : null;

    // Get events for the year to scope our queries
    const yearEventsResponse = await fetch(
      `${supabaseUrl}/rest/v1/events?select=eventid,eventform,eventdistance&eventyear=eq.${year}`,
      {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!yearEventsResponse.ok) {
      throw new Error('Failed to fetch events for year');
    }

    const yearEvents = await yearEventsResponse.json();
    const yearEventIds = yearEvents.map((e: any) => e.eventid);

    if (yearEventIds.length === 0) {
      return new Response(JSON.stringify({
        clubs: [],
        runners: [],
        forms: [],
        distances: []
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get clubs for the year (always all clubs regardless of club filter)
    const clubsResponse = await fetch(
      `${supabaseUrl}/rest/v1/results?select=clubparticipation&eventid=in.(${yearEventIds.join(',')})&clubparticipation=not.is.null`,
      {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json'
        }
      }
    );

    let clubs: Array<{ id: number; label: string }> = [];
    if (clubsResponse.ok) {
      const clubsData = await clubsResponse.json();
      const distinctClubIds = [...new Set(clubsData.map((r: any) => r.clubparticipation))].filter((id): id is number => typeof id === 'number');
      
      // Get club names from eventorclubs if available
      if (distinctClubIds.length > 0) {
        const clubNamesResponse = await fetch(
          `${supabaseUrl}/rest/v1/eventorclubs?select=organisationid,clubname&organisationid=in.(${distinctClubIds.join(',')})`,
          {
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'apikey': serviceRoleKey,
              'Content-Type': 'application/json'
            }
          }
        );

        const clubNames = clubNamesResponse.ok ? await clubNamesResponse.json() : [];
        const clubNameMap = new Map(clubNames.map((c: any) => [c.organisationid, c.clubname]));

        clubs = distinctClubIds.map(id => ({
          id: id as number,
          label: (clubNameMap.get(id) || `Club ${id}`) as string
        })).sort((a, b) => a.label.localeCompare(b.label, 'sv'));
      }
    }

    // Scope results by club if provided
    let scopedEventIds = yearEventIds;
    if (clubInt) {
      const clubResultsResponse = await fetch(
        `${supabaseUrl}/rest/v1/results?select=eventid&eventid=in.(${yearEventIds.join(',')})&clubparticipation=eq.${clubInt}`,
        {
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json'
          }
        }
      );

      if (clubResultsResponse.ok) {
        const clubResults = await clubResultsResponse.json();
        scopedEventIds = [...new Set(clubResults.map((r: any) => r.eventid))];
      }
    }

    // Get runners for the scoped events
    let runners: Array<{ id: number; label: string }> = [];
    if (scopedEventIds.length > 0) {
      const runnersResponse = await fetch(
        `${supabaseUrl}/rest/v1/results?select=personid,xmlpersonname&eventid=in.(${scopedEventIds.join(',')})`,
        {
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json'
          }
        }
      );

      if (runnersResponse.ok) {
        const runnersData = await runnersResponse.json();
        const distinctPersonIds = [...new Set(runnersData.map((r: any) => r.personid))];
        
        // Get person names for personid > 0
        const personIdsGreaterThanZero = distinctPersonIds.filter((id): id is number => typeof id === 'number' && id > 0);
        let personNameMap = new Map();
        
        if (personIdsGreaterThanZero.length > 0) {
          const personsResponse = await fetch(
            `${supabaseUrl}/rest/v1/persons?select=personid,personnamegiven,personnamefamily&personid=in.(${personIdsGreaterThanZero.join(',')})`,
            {
              headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
              }
            }
          );

          if (personsResponse.ok) {
            const persons = await personsResponse.json();
            personNameMap = new Map(persons.map((p: any) => [
              p.personid,
              `${(p.personnamegiven || '').trim()} ${(p.personnamefamily || '').trim()}`.trim() || `Person ${p.personid}`
            ]));
          }
        }

        // Build runner list
        const runnerSet = new Map();
        for (const result of runnersData) {
          if (result.personid > 0) {
            const label = personNameMap.get(result.personid) || `Person ${result.personid}`;
            runnerSet.set(result.personid, { id: result.personid, label });
          } else if (result.personid === 0) {
            const label = (result.xmlpersonname || '').trim() || 'Unknown';
            if (!runnerSet.has(0) || runnerSet.get(0).label === 'Unknown') {
              runnerSet.set(0, { id: 0, label });
            }
          }
        }

        runners = Array.from(runnerSet.values())
          .sort((a, b) => a.label.localeCompare(b.label, 'sv'))
          .slice(0, 5000); // Cap to prevent UI lag
      }
    }

    // Get event forms from scoped events
    const scopedEvents = yearEvents.filter((e: any) => scopedEventIds.includes(e.eventid));
    const forms = [...new Set(scopedEvents
      .map((e: any) => e.eventform)
      .filter((form: string) => form && form.trim()))]
      .sort((a: string, b: string) => a.localeCompare(b, 'sv'));

    // Get distances from scoped events  
    const distances = [...new Set(scopedEvents
      .map((e: any) => e.eventdistance)
      .filter((distance: string) => distance && distance.trim()))]
      .sort((a: string, b: string) => a.localeCompare(b, 'sv'));

    const result = {
      clubs,
      runners,
      forms,
      distances
    };

    if (debug) {
      console.log(`Filters API: year=${year}, club=${club}, counts:`, {
        clubs: clubs.length,
        runners: runners.length,
        forms: forms.length,
        distances: distances.length,
        scopedEventIds: scopedEventIds.length
      });
    }

    console.log(`Filters API: year=${year}, club=${club}, counts: clubs=${clubs.length}, runners=${runners.length}, forms=${forms.length}, distances=${distances.length}`);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in filters API:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      clubs: [],
      runners: [],
      forms: [],
      distances: []
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}