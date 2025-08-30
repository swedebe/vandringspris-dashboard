export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const year = url.searchParams.get('year');
    const club = url.searchParams.get('club');
    const debug = url.searchParams.get('debug') === '1';

    if (!year) {
      return new Response(JSON.stringify({ error: 'Year parameter is required' }), {
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

    const yearInt = parseInt(year);
    const clubInt = club ? parseInt(club) : null;

    // Get clubs for the year
    const clubsResponse = await fetch(
      `${supabaseUrl}/rest/v1/rpc/get_clubs_for_year`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ year_param: yearInt })
      }
    );

    let clubs: Array<{ id: number; label: string }> = [];
    if (clubsResponse.ok) {
      const clubsData = await clubsResponse.json();
      clubs = clubsData || [];
    }

    // Get runners for the year and club
    const runnersResponse = await fetch(
      `${supabaseUrl}/rest/v1/rpc/get_runners_for_filters`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          year_param: yearInt,
          club_param: clubInt
        })
      }
    );

    let runners: Array<{ id: number; label: string }> = [];
    if (runnersResponse.ok) {
      const runnersData = await runnersResponse.json();
      runners = (runnersData || []).sort((a: any, b: any) => 
        a.label.localeCompare(b.label, 'sv')
      );
    }

    // Get event forms for the year and club
    const formsResponse = await fetch(
      `${supabaseUrl}/rest/v1/rpc/get_event_forms_for_filters`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          year_param: yearInt,
          club_param: clubInt
        })
      }
    );

    let forms: string[] = [];
    if (formsResponse.ok) {
      const formsData = await formsResponse.json();
      forms = (formsData || [])
        .map((item: any) => item.eventform)
        .filter((form: string) => form && form.trim())
        .sort((a: string, b: string) => a.localeCompare(b, 'sv'));
    }

    // Get distances for the year and club
    const distancesResponse = await fetch(
      `${supabaseUrl}/rest/v1/rpc/get_event_distances_for_filters`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          year_param: yearInt,
          club_param: clubInt
        })
      }
    );

    let distances: string[] = [];
    if (distancesResponse.ok) {
      const distancesData = await distancesResponse.json();
      distances = (distancesData || [])
        .map((item: any) => item.eventdistance)
        .filter((distance: string) => distance && distance.trim())
        .sort((a: string, b: string) => a.localeCompare(b, 'sv'));
    }

    const result = {
      clubs,
      runners: runners.slice(0, 5000), // Cap to prevent UI lag
      forms,
      distances
    };

    if (debug) {
      console.log(`Filters API: year=${year}, club=${club}, counts:`, {
        clubs: clubs.length,
        runners: runners.length,
        forms: forms.length,
        distances: distances.length
      });
    }

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