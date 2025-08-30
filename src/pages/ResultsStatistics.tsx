import React, { useEffect, useState, useMemo } from "react";
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

  // Sorting state
  type SortDir = "asc" | "desc";
  type SortKey =
    | "eventdate" | "eventname" | "eventform" | "eventdistance" | "eventclassname"
    | "classtypeid" | "klassfaktor" | "points" | "resulttime" | "resulttimediff"
    | "resultposition" | "classresultnumberofstarts" | "resultcompetitorstatus"
    | "relayteamname" | "relayleg" | "relaylegoverallposition" | "relayteamendposition"
    | "relayteamenddiff" | "relayteamendstatus" | "person" | "club";

  const [sortBy, setSortBy] = useState<SortKey>("eventdate");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

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

  // Get clubs for the selected year using RPC pattern
  const { data: filterOptions, isLoading: isLoadingFilters } = useQuery<FilterOptions>({
    queryKey: ["resultsFilters", year, club],
    enabled: !!year,
    queryFn: async () => {
      // Get clubs for the year from events
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select("eventid, eventform, eventdistance")
        .eq("eventyear", year);

      if (eventsError) throw eventsError;
      if (!eventsData || eventsData.length === 0) {
        return { clubs: [], runners: [], forms: [], distances: [] };
      }

      const eventIds = eventsData.map(e => e.eventid).filter(Boolean);

      // Get unique clubs for the year
      const { data: clubsData, error: clubsError } = await supabase
        .from("results")
        .select("clubparticipation")
        .in("eventid", eventIds)
        .not("clubparticipation", "is", null);

      if (clubsError) throw clubsError;

      const uniqueClubIds = [...new Set(clubsData?.map(r => r.clubparticipation ? String(r.clubparticipation) : null).filter(Boolean) || [])] as string[];
      
      // Get club names from eventorclubs using 'name' column (like Index114)
      let nameRows: Array<{ organisationid: string | number; name?: string }> = [];
      try {
        const { data, error } = await supabase
          .from("eventorclubs")
          .select("organisationid, name")
          .in("organisationid", uniqueClubIds);
        if (!error && data) nameRows = data;
      } catch (err) {
        console.warn("[clubs] name lookup failed:", err);
      }

      const clubNameMap = new Map<string, string>(
        nameRows.map(r => [String(r.organisationid), r.name ?? String(r.organisationid)])
      );
      
      let clubs = uniqueClubIds.map((id: string) => ({
        id,
        label: clubNameMap.get(id) ?? id
      })).sort((a, b) => a.label.localeCompare(b.label, "sv"));

      // Keep the selected club visible in options
      if (club && !clubs.some(c => c.id === club)) {
        const fallbackLabel = clubNameMap.get(club) ?? club;
        clubs = [{ id: club, label: fallbackLabel }, ...clubs];
      }

      // If no club is selected, return empty lists for dependent filters
      if (!club) {
        return { clubs, runners: [], forms: [], distances: [] };
      }

      const clubIdNum = Number(club);
      if (!Number.isFinite(clubIdNum)) {
        console.warn("[filters] invalid club id:", club);
        return { clubs, runners: [], forms: [], distances: [] };
      }

      console.debug("[results-stats] year:", year, "club(UI str):", club, "clubIdNum:", clubIdNum);

      // Use RPC to get runners (proven Index114 pattern)
      let runners: Array<{ id: number; label: string }> = [];
      try {
        const { data, error } = await supabase.rpc("rpc_results_enriched", {
          _club: clubIdNum,
          _year: year,
          _gender: null,
          _age_min: null,
          _age_max: null,
          _only_championship: null,
          _personid: null,
          _limit: 10000,
          _offset: 0,
        });

        if (error) {
          console.warn("[filters] RPC error:", error.message);
        } else {
          // Build distinct runner options exactly like Index114 groupByPerson
          const seen = new Set<string>();
          for (const r of (data as any[])) {
            if (r.personid > 0) {
              // Names come directly from the RPC view (correct column names)
              const given = (r.personnamegiven ?? "").trim();
              const family = (r.personnamefamily ?? "").trim();
              const label = (given || family) ? `${given} ${family}`.trim() : String(r.personid);
              const key = `p-${r.personid}`;
              if (!seen.has(key)) { 
                seen.add(key); 
                runners.push({ id: r.personid, label }); 
              }
            } else if (r.personid === 0) {
              const name = (r.xmlpersonname ?? "").trim() || "Unknown";
              const key = `x-${name}`;
              if (!seen.has(key)) { 
                seen.add(key); 
                runners.push({ id: 0, label: name }); 
              }
            }
          }
          runners.sort((a, b) => a.label.localeCompare(b.label, "sv"));
        }
      } catch (err) {
        console.warn("[filters] RPC failed:", err);
      }

      console.debug("[results-stats] runner-options count:", runners.length);
      console.debug("[results-stats] club options:", clubs.length);

      // Get forms and distances using same club scoping
      let scopedEventIds = eventIds;
      if (club != null) {
        try {
          const { data: clubEventData, error: clubEventErr } = await supabase
            .from("results")
            .select("eventid")
            .in("eventid", eventIds)
            .eq("clubparticipation", clubIdNum);
          
          if (!clubEventErr && clubEventData) {
            scopedEventIds = [...new Set(clubEventData.map(r => r.eventid).filter(Boolean))];
          }
        } catch (err) {
          console.warn("[filters] club event scoping failed:", err);
        }
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

  // Create club label map for consistent name display
  const clubLabelMap = useMemo(
    () => new Map(filterOptions?.clubs?.map(c => [c.id, c.label]) ?? []),
    [filterOptions]
  );

  // Sorting functions
  function getCellValue(row: any, key: SortKey) {
    switch (key) {
      case "eventdate": return row.eventdate; // ISO string from RPC
      case "eventname": return row.eventname ?? "";
      case "eventform": return (row.eventform && row.eventform.trim()) ? row.eventform.trim() : "Ind";
      case "eventdistance": return row.eventdistance ?? "";
      case "eventclassname": return row.eventclassname ?? "";
      case "classtypeid": return Number(row.classtypeid) || 0;
      case "klassfaktor": return Number(row.klassfaktor) || 0;
      case "points": return Number(row.points) || 0;
      case "resulttime": return Number(row.resulttime) || 0;
      case "resulttimediff": return Number(row.resulttimediff) || 0;
      case "resultposition": return Number(row.resultposition) || 0;
      case "classresultnumberofstarts": return Number(row.classresultnumberofstarts) || 0;
      case "resultcompetitorstatus": return row.resultcompetitorstatus ?? "";
      case "relayteamname": return row.relayteamname ?? "";
      case "relayleg": return Number(row.relayleg) || 0;
      case "relaylegoverallposition": return Number(row.relaylegoverallposition) || 0;
      case "relayteamendposition": return Number(row.relayteamendposition) || 0;
      case "relayteamenddiff": return Number(row.relayteamenddiff) || 0;
      case "relayteamendstatus": return row.relayteamendstatus ?? "";
      case "person": {
        const given = (row.personnamegiven ?? "").trim();
        const family = (row.personnamefamily ?? "").trim();
        return (given || family) ? `${given} ${family}`.trim() : String(row.personid);
      }
      case "club": return clubLabelMap.get(String(row.clubparticipation)) ?? String(row.clubparticipation);
      default: return "";
    }
  }

  function compare(a: any, b: any, key: SortKey, dir: SortDir) {
    const va = getCellValue(a, key);
    const vb = getCellValue(b, key);
    if (key === "eventdate") {
      const da = new Date(va as string).getTime() || 0;
      const db = new Date(vb as string).getTime() || 0;
      return dir === "asc" ? da - db : db - da;
    }
    if (typeof va === "number" && typeof vb === "number") {
      return dir === "asc" ? va - vb : vb - va;
    }
    return dir === "asc"
      ? String(va).localeCompare(String(vb), "sv")
      : String(vb).localeCompare(String(va), "sv");
  }

  // Apply sorting to results
  const sortedResults = useMemo(() => {
    if (!results.length) return results;
    const sorted = [...results];
    sorted.sort((a, b) => compare(a, b, sortBy, sortDir));
    return sorted;
  }, [results, sortBy, sortDir, clubLabelMap]);

  // Sortable header component
  function SortableHead({ col, children }: { col: SortKey; children: React.ReactNode }) {
    const active = sortBy === col;
    const nextDir = active && sortDir === "asc" ? "desc" : "asc";
    return (
      <button
        className="flex items-center gap-1 select-none hover:text-foreground/80 transition-colors"
        onClick={() => { setSortBy(col); setSortDir(nextDir); }}
        title={active ? `Sort ${nextDir}` : "Sort asc"}
        type="button"
      >
        <span>{children}</span>
        {active ? <span className="text-xs">{sortDir === "asc" ? "▲" : "▼"}</span> : null}
      </button>
    );
  }

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
              <TableHead><SortableHead col="eventdate">{t(texts, "th.date", "Datum")}</SortableHead></TableHead>
              <TableHead><SortableHead col="eventname">{t(texts, "th.event", "Tävling")}</SortableHead></TableHead>
              <TableHead><SortableHead col="eventform">{t(texts, "th.form", "Tävlingsform")}</SortableHead></TableHead>
              <TableHead><SortableHead col="eventdistance">{t(texts, "th.distance", "Distans")}</SortableHead></TableHead>
              <TableHead><SortableHead col="eventclassname">{t(texts, "th.class", "Klass")}</SortableHead></TableHead>
              <TableHead><SortableHead col="classtypeid">{t(texts, "th.classtype", "Klasstyp")}</SortableHead></TableHead>
              <TableHead><SortableHead col="klassfaktor">{t(texts, "th.classfactor", "Klassfaktor")}</SortableHead></TableHead>
              <TableHead><SortableHead col="points">{t(texts, "th.points", "Poäng")}</SortableHead></TableHead>
              <TableHead><SortableHead col="resulttime">{t(texts, "th.time", "Tid")}</SortableHead></TableHead>
              <TableHead><SortableHead col="resulttimediff">{t(texts, "th.diff", "Tid efter")}</SortableHead></TableHead>
              <TableHead><SortableHead col="resultposition">{t(texts, "th.position", "Placering")}</SortableHead></TableHead>
              <TableHead><SortableHead col="classresultnumberofstarts">{t(texts, "th.starts", "Antal startande")}</SortableHead></TableHead>
              <TableHead><SortableHead col="resultcompetitorstatus">{t(texts, "th.status", "Resultatstatus")}</SortableHead></TableHead>
              <TableHead><SortableHead col="relayteamname">{t(texts, "th.relay.team", "Stafettlag")}</SortableHead></TableHead>
              <TableHead><SortableHead col="relayleg">{t(texts, "th.relay.leg", "Stafettsträcka")}</SortableHead></TableHead>
              <TableHead><SortableHead col="relaylegoverallposition">{t(texts, "th.relay.legpos", "Sträckplacering")}</SortableHead></TableHead>
              <TableHead><SortableHead col="relayteamendposition">{t(texts, "th.relay.endpos", "Stafett slutplacering")}</SortableHead></TableHead>
              <TableHead><SortableHead col="relayteamenddiff">{t(texts, "th.relay.enddiff", "Stafett tid efter")}</SortableHead></TableHead>
              <TableHead><SortableHead col="relayteamendstatus">{t(texts, "th.relay.endstatus", "Stafettstatus")}</SortableHead></TableHead>
              <TableHead><SortableHead col="person">{t(texts, "th.person", "Löparens namn")}</SortableHead></TableHead>
              <TableHead><SortableHead col="club">{t(texts, "th.club", "Löparens klubb")}</SortableHead></TableHead>
              <TableHead>{t(texts, "th.age", "Löparens ålder")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedResults.length === 0 && trigger > 0 && !isFetching ? (
              <TableRow>
                <TableCell colSpan={22} className="text-center text-muted-foreground">
                  {t(texts, "text.noData", "Ingen data finns")}
                </TableCell>
              </TableRow>
            ) : (
              sortedResults.map((r: any) => (
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
                  <TableCell>{clubLabelMap.get(String(r.clubparticipation)) ?? String(r.clubparticipation)}</TableCell>
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
