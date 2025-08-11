import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatSecondsToHMS } from "@/lib/utils";

export default function ResultsStatistics() {
  const [club, setClub] = useState<number | null>(461);
  const [year, setYear] = useState<number | null>(new Date().getUTCFullYear());
  const [personId, setPersonId] = useState<number | null>(null);
  const [gender, setGender] = useState<string | null>(null);

  const [trigger, setTrigger] = useState(0);

  const { data = [], isFetching } = useQuery({
    queryKey: ["resultsSearch", club, year, personId, gender, trigger],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_results_enriched", {
        _club: club,
        _year: year,
        _gender: gender,
        _personid: personId,
        _only_championship: null,
        _age_min: null,
        _age_max: null,
        _limit: 500,
        _offset: 0,
      });
      if (error) throw error;
      return data ?? [];
    },
    enabled: trigger > 0,
  });

  return (
    <main className="container mx-auto p-4 space-y-4">
      <Helmet>
        <title>Resultatstatistik</title>
        <meta name="description" content="Sök bland resultat per klubb, år och löpare" />
        <link rel="canonical" href="/results-statistics" />
      </Helmet>

      <h1 className="text-3xl font-semibold">Resultatstatistik</h1>

      <section className="grid md:grid-cols-4 gap-3">
        <div>
          <label className="block text-sm mb-1">Klubb (organisationId)</label>
          <Input type="number" value={club ?? ''} onChange={(e) => setClub(e.target.value ? Number(e.target.value) : null)} />
        </div>
        <div>
          <label className="block text-sm mb-1">År</label>
          <Input type="number" value={year ?? ''} onChange={(e) => setYear(e.target.value ? Number(e.target.value) : null)} />
        </div>
        <div>
          <label className="block text-sm mb-1">Löpare (personId)</label>
          <Input type="number" value={personId ?? ''} onChange={(e) => setPersonId(e.target.value ? Number(e.target.value) : null)} />
        </div>
        <div>
          <label className="block text-sm mb-1">Kön</label>
          <Input placeholder="Alla/Damer/Herrar" value={gender ?? ''} onChange={(e) => setGender(e.target.value || null)} />
        </div>
      </section>

      <Button onClick={() => setTrigger((x) => x + 1)}>Sök</Button>

      <section className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Datum</TableHead>
              <TableHead>Tävling</TableHead>
              <TableHead>Tävlingsform</TableHead>
              <TableHead>Distans</TableHead>
              <TableHead>Klass</TableHead>
              <TableHead>Klasstyp</TableHead>
              <TableHead>Klassfaktor</TableHead>
              <TableHead>Poäng</TableHead>
              <TableHead>Tid</TableHead>
              <TableHead>Tid efter</TableHead>
              <TableHead>Placering</TableHead>
              <TableHead>Antal startande</TableHead>
              <TableHead>Resultatstatus</TableHead>
              <TableHead>Stafettlag</TableHead>
              <TableHead>Stafettsträcka</TableHead>
              <TableHead>Sträckplacering</TableHead>
              <TableHead>Stafett slutplacering</TableHead>
              <TableHead>Stafett tid efter</TableHead>
              <TableHead>Stafettstatus</TableHead>
              <TableHead>Löparens namn</TableHead>
              <TableHead>Löparens klubb</TableHead>
              <TableHead>Löparens ålder</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((r: any) => (
              <TableRow key={`${r.eventraceid}-${r.personid}`}>
                <TableCell>{r.eventdate}</TableCell>
                <TableCell>{r.eventname}</TableCell>
                <TableCell>{r.eventform}</TableCell>
                <TableCell>{r.eventdistance}</TableCell>
                <TableCell>{r.eventclassname}</TableCell>
                <TableCell>{r.classtypeid}</TableCell>
                <TableCell>{r.klassfaktor}</TableCell>
                <TableCell>{typeof r.points === 'number' ? r.points.toFixed(2) : ''}</TableCell>
                <TableCell>{r.resulttime != null ? formatSecondsToHMS(r.resulttime) : ''}</TableCell>
                <TableCell>{r.resulttimediff != null ? formatSecondsToHMS(r.resulttimediff) : ''}</TableCell>
                <TableCell>{r.resultposition}</TableCell>
                <TableCell>{r.classresultnumberofstarts}</TableCell>
                <TableCell>{r.resultcompetitorstatus}</TableCell>
                <TableCell>{r.relayteamname}</TableCell>
                <TableCell>{r.relayleg}</TableCell>
                <TableCell>{r.relaylegoverallposition}</TableCell>
                <TableCell>{r.relayteamendposition}</TableCell>
                <TableCell>{r.relayteamenddiff}</TableCell>
                <TableCell>{r.relayteamendstatus}</TableCell>
                <TableCell>{`${r.personnamegiven ?? ''} ${r.personnamefamily ?? ''}`.trim()}</TableCell>
                <TableCell>{r.clubparticipation}</TableCell>
                <TableCell>{r.personage}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </main>
  );
}
