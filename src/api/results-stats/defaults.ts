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

    // Get latest year with results
    const latestYearResponse = await fetch(
      `${supabaseUrl}/rest/v1/rpc/get_latest_year_with_results`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json'
        }
      }
    );

    let latestYear: number | null = null;
    if (latestYearResponse.ok) {
      const yearData = await latestYearResponse.json();
      latestYear = yearData?.[0]?.year || null;
    }

    // If no latest year found, try getting from events with results
    if (!latestYear) {
      const eventYearResponse = await fetch(
        `${supabaseUrl}/rest/v1/events?select=eventyear&eventyear=not.is.null&order=eventyear.desc&limit=1`,
        {
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (eventYearResponse.ok) {
        const data = await eventYearResponse.json();
        latestYear = data?.[0]?.eventyear || new Date().getFullYear();
      }
    }

    if (!latestYear) {
      latestYear = new Date().getFullYear();
    }

    // Get default club for the latest year (if exactly one exists)
    let defaultClub: number | null = null;
    if (latestYear) {
      const clubsResponse = await fetch(
        `${supabaseUrl}/rest/v1/rpc/get_clubs_for_year`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ year_param: latestYear })
        }
      );

      if (clubsResponse.ok) {
        const clubsData = await clubsResponse.json();
        if (clubsData && clubsData.length === 1) {
          defaultClub = clubsData[0].id;
        }
      }
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
      latestYear: new Date().getFullYear(),
      defaultClub: null
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}