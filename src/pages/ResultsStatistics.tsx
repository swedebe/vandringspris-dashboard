import { useEffect, useState } from "react";
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
  clubs: Array<{ id: number; label: string }>;
  runners: Array<{ id: number; label: string }>;
  forms: string[];
  distances: string[];
}

export default function ResultsStatistics() {
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
  const [club, setClub] = useState<number | null>(null);
  const [personId, setPersonId] = useState<number | null>(null);
  const [eventForm, setEventForm] = useState<string>("");
  const [distance, setDistance] = useState<string>("");
  const [placement, setPlacement] = useState<number | null>(null);
  const [runnerSearchTerm, setRunnerSearchTerm] = useState<string>("");

  const [trigger, setTrigger] = useState(0);

  // Get defaults on initial load
  const { data: defaults, isLoading: isLoadingDefaults } = useQuery({
    queryKey: ["resultsDefaults"],
    queryFn: async () => {
      const response = await fetch("/api/results-stats/defaults", {
        cache: 'no-store'
      });
      if (!response.ok) {
        throw new Error("Failed to fetch defaults");
      }
      return response.json();
    },
  });

  // Set initial values when defaults are loaded
  useEffect(() => {
    if (defaults && !year) {
      setYear(defaults.latestYear);
      if (defaults.defaultClub) {
        setClub(defaults.defaultClub);
      }
    }
  }, [defaults, year]);

  // Get filter options when year or club changes
  const { data: filterOptions, isLoading: isLoadingFilters } = useQuery<FilterOptions>({
    queryKey: ["resultsFilters", year, club],
    enabled: year != null,
    queryFn: async () => {
      const response = await fetch("/api/results-stats/filters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ year, club }),
        cache: 'no-store'
      });
      if (!response.ok) {
        throw new Error("Failed to fetch filters");
      }
      return response.json();
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
    if (filterOptions) {
      // Clear person if not in current list
      if (personId && !filterOptions.runners.some(r => r.id === personId)) {
        setPersonId(null);
        setRunnerSearchTerm("");
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
  }, [filterOptions, personId, eventForm, distance]);

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
        _club: club,
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
        rows = rows.filter((r: any) => r.eventform === eventForm);
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

  // Filter runners for typeahead
  const filteredRunners = filterOptions?.runners.filter(runner =>
    runner.label.toLowerCase().includes(runnerSearchTerm.toLowerCase())
  ).slice(0, 50) || [];

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
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t(texts, "text.yearRequired", "Obligatoriskt - förifyllt till senaste tillgängliga år")}
            </p>
          </div>
          
          <div>
            <label className="block text-sm mb-1">{t(texts, "filters.club", "Klubb")}</label>
            <Select 
              value={String(club ?? "")} 
              onValueChange={(v) => setClub(v ? Number(v) : null)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Alla klubbar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Alla klubbar</SelectItem>
                {filterOptions?.clubs.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm mb-1">{t(texts, "filters.runner", "Löpare")}</label>
            <div className="relative">
              <Input
                placeholder="Sök efter löpare..."
                value={selectedRunner ? selectedRunner.label : runnerSearchTerm}
                onChange={(e) => {
                  setRunnerSearchTerm(e.target.value);
                  if (!e.target.value) {
                    setPersonId(null);
                  }
                }}
                disabled={isLoading}
              />
              {runnerSearchTerm && !selectedRunner && filteredRunners.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-background border border-border rounded-md shadow-lg max-h-40 overflow-y-auto z-10">
                  {filteredRunners.map((runner) => (
                    <div
                      key={runner.id}
                      className="px-3 py-2 hover:bg-accent cursor-pointer"
                      onClick={() => {
                        setPersonId(runner.id);
                        setRunnerSearchTerm("");
                      }}
                    >
                      {runner.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t(texts, "text.runnerHelp", "Sök på namn, värdet som lagras är person-ID")}
            </p>
          </div>

          <div>
            <label className="block text-sm mb-1">{t(texts, "filters.eventform", "Tävlingsform")}</label>
            <Select 
              value={eventForm} 
              onValueChange={(v) => setEventForm(v)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Alla former" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Alla former</SelectItem>
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
              value={distance} 
              onValueChange={(v) => setDistance(v)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Alla distanser" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Alla distanser</SelectItem>
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
              disabled={isLoading}
            />
          </div>
        </section>
      )}

      <Button onClick={() => setTrigger((x) => x + 1)}>{t(texts, "button.search", "Sök")}</Button>

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
                  <TableCell>{r.eventform}</TableCell>
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
