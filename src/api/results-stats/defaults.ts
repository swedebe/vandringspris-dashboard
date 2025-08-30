export async function GET() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Missing Supabase configuration' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get all events with years
    const eventsResponse = await fetch(
      `${supabaseUrl}/rest/v1/events?select=eventid,eventyear&eventyear=not.is.null&order=eventyear.desc`,
      {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!eventsResponse.ok) {
      throw new Error('Failed to fetch events');
    }

    const events = await eventsResponse.json();
    if (!events || events.length === 0) {
      console.log('No events found');
      return new Response(JSON.stringify({
        latestYear: null,
        defaultClub: null
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get results to find which events have results
    const resultsResponse = await fetch(
      `${supabaseUrl}/rest/v1/results?select=eventid&limit=10000`,
      {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!resultsResponse.ok) {
      throw new Error('Failed to fetch results');
    }

    const results = await resultsResponse.json();
    const eventIdsWithResults = new Set(results.map((r: any) => r.eventid));

    // Find latest year that has results
    let latestYear: number | null = null;
    for (const event of events) {
      if (eventIdsWithResults.has(event.eventid)) {
        latestYear = event.eventyear;
        break;
      }
    }

    if (!latestYear) {
      console.log('No events with results found');
      return new Response(JSON.stringify({
        latestYear: null,
        defaultClub: null
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get events for that year
    const yearEventsResponse = await fetch(
      `${supabaseUrl}/rest/v1/events?select=eventid&eventyear=eq.${latestYear}`,
      {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!yearEventsResponse.ok) {
      throw new Error('Failed to fetch year events');
    }

    const yearEvents = await yearEventsResponse.json();
    const yearEventIds = yearEvents.map((e: any) => e.eventid);

    if (yearEventIds.length === 0) {
      console.log('No events found for year', latestYear);
      return new Response(JSON.stringify({
        latestYear,
        defaultClub: null
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get distinct clubs for that year
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

    let defaultClub: number | null = null;
    if (clubsResponse.ok) {
      const clubsData = await clubsResponse.json();
      const distinctClubs = [...new Set(clubsData.map((r: any) => r.clubparticipation))];
      if (distinctClubs.length === 1) {
        defaultClub = distinctClubs[0] as number;
      }
      console.log(`Found ${distinctClubs.length} clubs for year ${latestYear}`);
    }

    console.log(`Defaults API: latestYear=${latestYear}, defaultClub=${defaultClub}`);

    return new Response(JSON.stringify({
      latestYear,
      defaultClub
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in defaults API:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      latestYear: null,
      defaultClub: null
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}