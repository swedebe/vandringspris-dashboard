import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppTexts, t } from "@/hooks/useAppTexts";
import { formatSecondsToHMS } from "@/lib/utils";

interface FilterOptions {
  clubs: Array<{ id: string; label: string }>;
  runners: Array<{ id: number; label: string }>;
  forms: string[];
  distances: string[];
}

export default function ResultsStatistics() {
  console.log('React object:', React);
  console.log('useState function:', useState);
  const { data: texts } = useAppTexts("results-statistics", [
    "title",
    "description",
    "filters.club",
    "filters.runner",
    "filters.year",
    "filters.eventform",
    "filters.distance",
    "filters.placement",
    "button.search",
    "text.noData",
    "text.loading",
    "text.yearRequired",
    "text.runnerHelp",
    // Table headers
    "th.date",
    "th.event",
    "th.form",
    "th.distance",
    "th.class",
    "th.classtype",
    "th.classfactor",
    "th.points",
    "th.time",
    "th.diff",
    "th.position",
    "th.starts",
    "th.status",
    "th.relay.team",
    "th.relay.leg",
    "th.relay.legpos",
    "th.relay.endpos",
    "th.relay.enddiff",
    "th.relay.endstatus",
    "th.person",
    "th.club",
    "th.age",
  ]);

  const [year, setYear] = useState<number | null>(null);
  const [club, setClub] = useState<string | null>(null);
  const [personId, setPersonId] = useState<number | null>(null);
  const [eventForm, setEventForm] = useState<string>("");
  const [distance, setDistance] = useState<string>("");
  const [placement, setPlacement] = useState<number | null>(null);

  const [trigger, setTrigger] = useState(0);

  // Get defaults on initial load
  const { data: defaults, isLoading: isLoadingDefaults } = useQuery({
    queryKey: ["resultsDefaults"],
    queryFn: async () => {
      // Get latest year with results
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select("eventid, eventyear")
        .not("eventyear", "is", null)
        .order("eventyear", { ascending: false });

      if (eventsError) throw eventsError;
      if (!eventsData || eventsData.length === 0) {
        return { latestYear: null, defaultClub: null };
      }

      // Group events by year and find the latest year with results
      const yearToEventIds = new Map<number, number[]>();
      eventsData.forEach(event => {
        if (event.eventyear && !yearToEventIds.has(event.eventyear)) {
          yearToEventIds.set(event.eventyear, []);
        }
        if (event.eventyear && event.eventid) {
          yearToEventIds.get(event.eventyear)!.push(event.eventid);
        }
      });

      let latestYear = null;
      const sortedYears = Array.from(yearToEventIds.keys()).sort((a, b) => b - a);
      
      for (const year of sortedYears) {
        const eventIds = yearToEventIds.get(year)!;
        const { count, error: resultsError } = await supabase
          .from("results")
          .select("eventid", { count: "exact", head: true })
          .in("eventid", eventIds);

        if (resultsError) throw resultsError;
        if (count && count > 0) {
          latestYear = year;
          break;
        }
      }

      if (!latestYear) {
        return { latestYear: null, defaultClub: null };
      }

      // Get clubs for the latest year to determine default
      const latestYearEventIds = yearToEventIds.get(latestYear)!;
      const { data: clubsData, error: clubsError } = await supabase
        .from("results")
        .select("clubparticipation")
        .in("eventid", latestYearEventIds)
        .not("clubparticipation", "is", null);

      if (clubsError) throw clubsError;

      const uniqueClubs = [...new Set(clubsData?.map(r => r.clubparticipation ? String(r.clubparticipation) : null).filter(Boolean) || [])];
      const defaultClub = uniqueClubs.length === 1 ? uniqueClubs[0] : null;

      return { latestYear, defaultClub };
    },
  });

  // Set initial values when defaults are loaded
  useEffect(() => {
    if (defaults && !year) {
      if (defaults.latestYear) {
        setYear(defaults.latestYear as number);
      }
      if (defaults.defaultClub) {
        setClub(defaults.defaultClub as string);
      }
    }
  }, [defaults, year]);

  // Get filter options when year is selected
  const { data: filterOptions, isLoading: isLoadingFilters } = useQuery<FilterOptions>({
    queryKey: ["resultsFilters", year, club],
    enabled: !!year,
    queryFn: async () => {
      // Get events for the selected year
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select("eventid, eventform, eventdistance")
        .eq("eventyear", year);

      if (eventsError) throw eventsError;
      if (!eventsData || eventsData.length === 0) {
        return { clubs: [], runners: [], forms: [], distances: [] };
      }

      const eventIds = eventsData.map(e => e.eventid).filter(Boolean);

      // Get clubs for the year
      const { data: clubsData, error: clubsError } = await supabase
        .from("results")
        .select("clubparticipation")
        .in("eventid", eventIds)
        .not("clubparticipation", "is", null);

      if (clubsError) throw clubsError;

      const uniqueClubIds = [...new Set(clubsData?.map(r => r.clubparticipation ? String(r.clubparticipation) : null).filter(Boolean) || [])] as string[];
      
      // Try to get club names from eventorclubs table
      const { data: clubNamesData, error: clubsNameErr } = await supabase
        .from("eventorclubs")
        .select("organisationid, name, clubname")
        .in("organisationid", uniqueClubIds);

      if (clubsNameErr) console.warn("[clubs] name lookup err:", clubsNameErr?.message);
      const clubNameMap = new Map((clubNamesData ?? []).map(c => [String(c.organisationid), c.name ?? c.clubname ?? String(c.organisationid)]));
      let clubs = uniqueClubIds.map((id: string) => ({
        id,
        label: (clubNameMap.get(id) as string) || id
      })).sort((a, b) => a.label.localeCompare(b.label, "sv"));

      // Keep the selected club visible in options
      if (club && !clubs.some(c => c.id === club)) {
        const fallbackLabel = (clubNameMap.get(club) as string) || club;
        clubs = [{ id: club, label: fallbackLabel }, ...clubs];
      }

      // If no club is selected yet, return empty lists for the other filters
      if (!club) {
        return { clubs, runners: [], forms: [], distances: [] };
      }

      console.debug("[filters] year:", year, "club(raw):", club, "events:", eventIds.length);

      // Get runners using a single joined query to avoid RLS issues
      const { data: runnersData, error: runnersError } = await supabase
        .from("results")
        .select(`
          personid,
          xmlpersonname,
          persons!inner(personid, namegiven, namefamily)
        `)
        .in("eventid", eventIds)
        .eq("clubparticipation", club);

      if (runnersError) throw runnersError;

      const runners: Array<{ id: number; label: string }> = [];
      const seenRunners = new Map<string, boolean>();

      runnersData?.forEach(row => {
        if (row.personid > 0 && row.persons) {
          // Named person from persons table
          const name = `${row.persons.namegiven || ""} ${row.persons.namefamily || ""}`.trim();
          const label = name || String(row.personid);
          const key = `${row.personid}-${label}`;
          
          if (!seenRunners.has(key)) {
            runners.push({ id: row.personid, label });
            seenRunners.set(key, true);
          }
        } else if (row.personid === 0) {
          // XML-named or unknown runner
          const label = row.xmlpersonname?.trim() || "Unknown";
          const key = `0-${label}`;
          
          if (!seenRunners.has(key)) {
            runners.push({ id: 0, label });
            seenRunners.set(key, true);
          }
        }
      });

      runners.sort((a, b) => a.label.localeCompare(b.label, "sv"));

      console.debug("[filters] clubs options:", clubs.length);
      console.debug("[filters] runners rows (raw):", runnersData?.length ?? 0);

      // Get forms and distances (scope by club if provided)
      let scopedEventIds = eventIds;
      if (club != null) {
        const { data: clubEventData, error: clubEventErr } = await supabase
          .from("results")
          .select("eventid")
          .in("eventid", eventIds)
          .eq("clubparticipation", club);
        
        if (clubEventErr) throw clubEventErr;
        scopedEventIds = [...new Set(clubEventData?.map(r => r.eventid).filter(Boolean) || [])];
      }

      const scopedEvents = eventsData.filter(e => e.eventid && scopedEventIds.includes(e.eventid));
      
      // Normalize forms: null/empty becomes "Ind"
      const normalizedForms = scopedEvents.map(e => {
        const rawForm = e.eventform;
        return (rawForm && rawForm.trim()) ? rawForm.trim() : "Ind";
      });
      const forms = [...new Set(normalizedForms)] as string[];
      forms.sort((a: string, b: string) => a.localeCompare(b, "sv"));

      const distances: string[] = [...new Set(scopedEvents.map(e => e.eventdistance).filter(d => d?.trim()))] as string[]
      distances.sort((a: string, b: string) => a.localeCompare(b, "sv"));

      return { clubs, runners, forms, distances };
    },
  });

  // Auto-select single club when filters change
  useEffect(() => {
    if (filterOptions?.clubs && filterOptions.clubs.length === 1 && !club) {
      setClub(filterOptions.clubs[0].id);
    }
  }, [filterOptions, club]);

  // Clear invalid selections when filters change
  useEffect(() => {
    if (club && filterOptions) {
      // Clear person if not in current list
      if (personId && !filterOptions.runners.some(r => r.id === personId)) {
        setPersonId(null);
      }
      // Clear form if not in current list
      if (eventForm && !filterOptions.forms.includes(eventForm)) {
        setEventForm("");
      }
      // Clear distance if not in current list
      if (distance && !filterOptions.distances.includes(distance)) {
        setDistance("");
      }
    }
  }, [filterOptions, personId, eventForm, distance, club]);

  // Clear dependent filters when club changes
  useEffect(() => {
    setPersonId(null);
    setEventForm("");
    setDistance("");
    setPlacement(null);
  }, [club]);

  const { data: results = [], isFetching } = useQuery({
    queryKey: [
      "resultsSearch",
      club,
      year,
      personId,
      eventForm,
      distance,
      placement,
      trigger,
    ],
    enabled: trigger > 0 && year != null,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_results_enriched", {
        _club: club ? Number(club) : null,
        _year: year,
        _gender: null,
        _personid: personId,
        _only_championship: null,
        _age_min: null,
        _age_max: null,
        _limit: 500,
        _offset: 0,
      });
      if (error) throw error;
      let rows = (data ?? []).filter((r: any) => r.personsex != null);
      if (eventForm) {
        if (eventForm === "Ind") {
          // Filter for null/empty eventform
          rows = rows.filter((r: any) => !r.eventform || !r.eventform.trim());
        } else {
          rows = rows.filter((r: any) => r.eventform === eventForm);
        }
      }
      if (distance) {
        rows = rows.filter((r: any) => r.eventdistance === distance);
      }
      if (placement != null) {
        rows = rows.filter((r: any) => r.resultposition === placement);
      }
      return rows;
    },
  });

  const selectedRunner = filterOptions?.runners.find(r => r.id === personId);

  const isLoading = isLoadingDefaults || isLoadingFilters;

  return (
    <main className="container mx-auto p-4 space-y-4">
      <Helmet>
        <title>{t(texts, "title", "Resultatstatistik")}</title>
        <meta name="description" content={t(texts, "description", "Sök bland resultat per klubb, år och löpare")} />
        <link rel="canonical" href="/results-statistics" />
      </Helmet>

      <h1 className="text-3xl font-semibold">{t(texts, "title", "Resultatstatistik")}</h1>

      {isLoading ? (
        <div className="text-center py-8">
          <p>{t(texts, "text.loading", "Laddar...")}</p>
        </div>
      ) : !year ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>{t(texts, "text.noData", "Ingen data finns")}</p>
        </div>
      ) : (
        <section className="grid md:grid-cols-6 gap-3">
          <div>
            <label className="block text-sm mb-1">
              {t(texts, "filters.year", "År")} <span className="text-red-500">*</span>
            </label>
            <Input 
              type="number" 
              value={year ?? ""} 
              onChange={(e) => setYear(e.target.value ? Number(e.target.value) : null)}
              disabled={!club || isLoading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t(texts, "text.yearRequired", "Obligatoriskt - förifyllt till senaste tillgängliga år")}
            </p>
          </div>
          
          <div>
            <label className="block text-sm mb-1">{t(texts, "filters.club", "Klubb")} <span className="text-red-500">*</span></label>
            <Select 
              value={club || "all"} 
              onValueChange={(v) => setClub(v === "all" ? null : v)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Välj klubb" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla klubbar</SelectItem>
                {filterOptions?.clubs.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm mb-1">{t(texts, "filters.runner", "Löpare")}</label>
            <Select
              value={personId != null ? String(personId) : "all"}
              onValueChange={(v) => setPersonId(v === "all" ? null : Number(v))}
              disabled={!club || isLoadingFilters}
            >
              <SelectTrigger>
                <SelectValue placeholder="Alla löpare" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla löpare</SelectItem>
                {filterOptions?.runners.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm mb-1">{t(texts, "filters.eventform", "Tävlingsform")}</label>
            <Select 
              value={eventForm || "all"} 
              onValueChange={(v) => setEventForm(v === "all" ? "" : v)}
              disabled={!club || isLoadingFilters}
            >
              <SelectTrigger>
                <SelectValue placeholder="Alla former" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla former</SelectItem>
                {filterOptions?.forms.map((form) => (
                  <SelectItem key={form} value={form}>
                    {form}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm mb-1">{t(texts, "filters.distance", "Distans")}</label>
            <Select 
              value={distance || "all"} 
              onValueChange={(v) => setDistance(v === "all" ? "" : v)}
              disabled={!club || isLoadingFilters}
            >
              <SelectTrigger>
                <SelectValue placeholder="Alla distanser" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla distanser</SelectItem>
                {filterOptions?.distances.map((dist) => (
                  <SelectItem key={dist} value={dist}>
                    {dist}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm mb-1">{t(texts, "filters.placement", "Placering")}</label>
            <Input 
              type="number" 
              placeholder="Vilken plats?"
              value={placement ?? ""} 
              onChange={(e) => setPlacement(e.target.value ? Number(e.target.value) : null)}
              disabled={!club || isLoadingFilters}
            />
          </div>
        </section>
      )}

      <Button 
        onClick={() => setTrigger((x) => x + 1)}
        disabled={!club || isLoading}
      >
        {t(texts, "button.search", "Sök")}
      </Button>

      {trigger > 0 && (
        <div className="text-sm text-muted-foreground">
          {isFetching ? (
            <p>Loading...</p>
          ) : (
            <p>{results.length} row(s) found.</p>
          )}
        </div>
      )}

      <section className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t(texts, "th.date", "Datum")}</TableHead>
              <TableHead>{t(texts, "th.event", "Tävling")}</TableHead>
              <TableHead>{t(texts, "th.form", "Tävlingsform")}</TableHead>
              <TableHead>{t(texts, "th.distance", "Distans")}</TableHead>
              <TableHead>{t(texts, "th.class", "Klass")}</TableHead>
              <TableHead>{t(texts, "th.classtype", "Klasstyp")}</TableHead>
              <TableHead>{t(texts, "th.classfactor", "Klassfaktor")}</TableHead>
              <TableHead>{t(texts, "th.points", "Poäng")}</TableHead>
              <TableHead>{t(texts, "th.time", "Tid")}</TableHead>
              <TableHead>{t(texts, "th.diff", "Tid efter")}</TableHead>
              <TableHead>{t(texts, "th.position", "Placering")}</TableHead>
              <TableHead>{t(texts, "th.starts", "Antal startande")}</TableHead>
              <TableHead>{t(texts, "th.status", "Resultatstatus")}</TableHead>
              <TableHead>{t(texts, "th.relay.team", "Stafettlag")}</TableHead>
              <TableHead>{t(texts, "th.relay.leg", "Stafettsträcka")}</TableHead>
              <TableHead>{t(texts, "th.relay.legpos", "Sträckplacering")}</TableHead>
              <TableHead>{t(texts, "th.relay.endpos", "Stafett slutplacering")}</TableHead>
              <TableHead>{t(texts, "th.relay.enddiff", "Stafett tid efter")}</TableHead>
              <TableHead>{t(texts, "th.relay.endstatus", "Stafettstatus")}</TableHead>
              <TableHead>{t(texts, "th.person", "Löparens namn")}</TableHead>
              <TableHead>{t(texts, "th.club", "Löparens klubb")}</TableHead>
              <TableHead>{t(texts, "th.age", "Löparens ålder")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.length === 0 && trigger > 0 && !isFetching ? (
              <TableRow>
                <TableCell colSpan={22} className="text-center text-muted-foreground">
                  {t(texts, "text.noData", "Ingen data finns")}
                </TableCell>
              </TableRow>
            ) : (
              results.map((r: any) => (
                <TableRow key={`${r.eventraceid}-${r.personid}`}>
                  <TableCell>{r.eventdate}</TableCell>
                  <TableCell>{r.eventname}</TableCell>
                  <TableCell>{r.eventform && r.eventform.trim() ? r.eventform : "Ind"}</TableCell>
                  <TableCell>{r.eventdistance}</TableCell>
                  <TableCell>{r.eventclassname}</TableCell>
                  <TableCell>{r.classtypeid}</TableCell>
                  <TableCell>{r.klassfaktor}</TableCell>
                  <TableCell>{typeof r.points === "number" ? r.points.toFixed(2) : ""}</TableCell>
                  <TableCell>{r.resulttime != null ? formatSecondsToHMS(r.resulttime) : ""}</TableCell>
                  <TableCell>{r.resulttimediff != null ? formatSecondsToHMS(r.resulttimediff) : ""}</TableCell>
                  <TableCell>{r.resultposition}</TableCell>
                  <TableCell>{r.classresultnumberofstarts}</TableCell>
                  <TableCell>{r.resultcompetitorstatus}</TableCell>
                  <TableCell>{r.relayteamname}</TableCell>
                  <TableCell>{r.relayleg}</TableCell>
                  <TableCell>{r.relaylegoverallposition}</TableCell>
                  <TableCell>{r.relayteamendposition}</TableCell>
                  <TableCell>{r.relayteamenddiff}</TableCell>
                  <TableCell>{r.relayteamendstatus}</TableCell>
                  <TableCell>{`${r.personnamegiven ?? ""} ${r.personnamefamily ?? ""}`.trim()}</TableCell>
                  <TableCell>{r.clubparticipation}</TableCell>
                  <TableCell>{r.personage}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>
    </main>
  );
}
