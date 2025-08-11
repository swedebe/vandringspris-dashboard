import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppTexts, t } from "@/hooks/useAppTexts";
import { formatSecondsToHMS } from "@/lib/utils";

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

  const [club, setClub] = useState<number | null>(461);
  const [year, setYear] = useState<number | null>(new Date().getUTCFullYear());
  const [personId, setPersonId] = useState<number | null>(null);
  const [eventForm, setEventForm] = useState<string | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const [placement, setPlacement] = useState<number | null>(null);

  const [trigger, setTrigger] = useState(0);

  // Years for selected club
  const { data: years = [] } = useQuery<number[]>({
    queryKey: ["yearsForClub", club],
    enabled: club != null,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_years_for_club", { _club: club });
      if (error) throw error;
      return (data ?? []).map((r: any) => r.year as number);
    },
  });

  const { data = [], isFetching } = useQuery({
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
    enabled: trigger > 0,
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
        const f = eventForm.toLowerCase();
        rows = rows.filter((r: any) => (r.eventform ?? "").toLowerCase() === f);
      }
      if (distance) {
        const d = distance.toLowerCase();
        rows = rows.filter((r: any) => (r.eventdistance ?? "").toLowerCase() === d);
      }
      if (placement != null) {
        rows = rows.filter((r: any) => r.resultposition === placement);
      }
      return rows;
    },
  });

  const yearsOptions = years.length > 0 ? years : [];

  return (
    <main className="container mx-auto p-4 space-y-4">
      <Helmet>
        <title>{t(texts, "title", "Resultatstatistik")}</title>
        <meta name="description" content={t(texts, "description", "Sök bland resultat per klubb, år och löpare")} />
        <link rel="canonical" href="/results-statistics" />
      </Helmet>

      <h1 className="text-3xl font-semibold">{t(texts, "title", "Resultatstatistik")}</h1>

      <section className="grid md:grid-cols-6 gap-3">
        <div>
          <label className="block text-sm mb-1">{t(texts, "filters.club", "Klubb (organisationId)")}</label>
          <Input type="number" value={club ?? ""} onChange={(e) => setClub(e.target.value ? Number(e.target.value) : null)} />
        </div>
        <div>
          <label className="block text-sm mb-1">{t(texts, "filters.runner", "Löpare (personId)")}</label>
          <Input type="number" value={personId ?? ""} onChange={(e) => setPersonId(e.target.value ? Number(e.target.value) : null)} />
        </div>
        <div>
          <label className="block text-sm mb-1">{t(texts, "filters.year", "År")}</label>
          {yearsOptions.length > 0 ? (
            <Select value={String(year ?? "")} onValueChange={(v) => setYear(v ? Number(v) : null)}>
              <SelectTrigger>
                <SelectValue placeholder="Välj år" />
              </SelectTrigger>
              <SelectContent>
                {yearsOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input type="number" value={year ?? ""} onChange={(e) => setYear(e.target.value ? Number(e.target.value) : null)} />
          )}
        </div>
        <div>
          <label className="block text-sm mb-1">{t(texts, "filters.eventform", "Tävlingsform")}</label>
          <Input placeholder="t.ex. OL" value={eventForm ?? ""} onChange={(e) => setEventForm(e.target.value || null)} />
        </div>
        <div>
          <label className="block text-sm mb-1">{t(texts, "filters.distance", "Distans")}</label>
          <Input placeholder="t.ex. Medel" value={distance ?? ""} onChange={(e) => setDistance(e.target.value || null)} />
        </div>
        <div>
          <label className="block text-sm mb-1">{t(texts, "filters.placement", "Placering")}</label>
          <Input type="number" value={placement ?? ""} onChange={(e) => setPlacement(e.target.value ? Number(e.target.value) : null)} />
        </div>
      </section>

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
            {data.length === 0 && trigger > 0 && !isFetching ? (
              <TableRow>
                <TableCell colSpan={22} className="text-center text-muted-foreground">
                  {t(texts, "text.noData", "Ingen data finns")}
                </TableCell>
              </TableRow>
            ) : (
              data.map((r: any) => (
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
