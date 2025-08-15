import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAppTexts, t } from "@/hooks/useAppTexts";
import { formatSecondsToHMS } from "@/lib/utils";
import { hasSupabaseConfig, getProxyBaseUrl } from "@/lib/config";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";
const CLUB_ID = 461;

type Result = {
  eventraceid: number;
  eventid: number;
  eventdate: string;
  eventname: string;
  eventform: string | null;
  eventdistance: string | null;
  eventdistance_label: string | null;
  eventform_label: string | null;
  eventform_group: string | null;
  eventyear: number | null;
  disciplineid: number | null;
  eventclassificationid: number | null;
  personid: number;
  personsex: string;
  personnamegiven: string | null;
  personnamefamily: string | null;
  personage: number | null;
  eventclassname: string | null;
  classtypeid: number | null;
  klassfaktor: number | null;
  points: number | null;
  resulttime: number | null;
  resulttimediff: number | null;
  resultposition: number | null;
  classresultnumberofstarts: number | null;
  resultcompetitorstatus: string | null;
  relayteamname: string | null;
  relayleg: number | null;
  relaylegoverallposition: number | null;
  relayteamendposition: number | null;
  relayteamenddiff: number | null;
  clubparticipation: number | null;
};

function useYears(clubId: number) {
  return useQuery<number[]>({
    queryKey: ["years", clubId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_years_for_club", { _club: clubId });
      if (error) throw error;
      return (data ?? []).map((r: any) => r.year as number);
    },
  });
}

function useClubName(clubId: number) {
  return useQuery<string>({
    queryKey: ["clubname", clubId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_club_name", { _club: clubId });
      if (error) throw error;
      const row = (data ?? [])[0];
      return (row?.clubname as string) ?? "";
    },
  });
}

function useResults(params: {
  club: number | null;
  years?: number[];
  genders?: string[];
  disciplineIds?: number[];
  onlyChampionship?: boolean | null;
  ageMin?: number | null;
  ageMax?: number | null;
  distances?: string[];
  forms?: string[];
}) {
  const { club, years = [], genders = ['__ALL__'], disciplineIds = [], onlyChampionship = null, ageMin = null, ageMax = null, distances = ['__ALL__'], forms = ['__ALL__'] } = params;
  return useQuery<Result[]>({
    queryKey: ["results_index461", club, years, genders, disciplineIds, onlyChampionship, ageMin, ageMax, distances, forms],
    queryFn: async () => {
      let query = supabase.from('results_index461').select('*');
      
      // Club filter
      if (club !== null) {
        query = query.eq('clubparticipation', club);
      }
      
      // Year filter - use eventyear column
      if (!years.includes(-1) && years.length > 0) {
        query = query.in('eventyear', years);
      }
      
      // Gender filter - use personsex column
      if (!genders.includes('__ALL__')) {
        const genderValues = [];
        if (genders.includes('Damer')) genderValues.push('F');
        if (genders.includes('Herrar')) genderValues.push('M');
        if (genderValues.length > 0) {
          query = query.in('personsex', genderValues);
        }
      }
      
      // Discipline filter
      if (!disciplineIds.includes(-1) && disciplineIds.length > 0) {
        query = query.in('disciplineid', disciplineIds);
      }
      
      // Distance filter
      if (!distances.includes('__ALL__')) {
        query = query.in('eventdistance', distances);
      }
      
      // Form filter with eventform_group for NULL handling
      if (!forms.includes('__ALL__')) {
        query = query.in('eventform_group', forms);
      }
      
      // Championship filter
      if (onlyChampionship === true) {
        query = query.eq('eventclassificationid', 1);
      }
      
      // Age filters
      if (ageMin !== null) {
        query = query.gte('personage', ageMin);
      }
      if (ageMax !== null) {
        query = query.lte('personage', ageMax);
      }
      
      // Order and limit
      query = query.order('eventdate', { ascending: false }).limit(500);
      
      const { data, error } = await query;
      if (error) throw error;
      
      return data as Result[];
    },
  });
}

function groupByPerson(results: Result[]) {
  const map = new Map<number, { name: string; items: Result[] }>();
  for (const r of results) {
    const name = `${r.personnamegiven ?? ""} ${r.personnamefamily ?? ""}`.trim();
    if (!map.has(r.personid)) map.set(r.personid, { name, items: [] });
    map.get(r.personid)!.items.push(r);
  }
  return map;
}

function sumTopN(points: (number | null)[], n: number) {
  return points
    .filter((p): p is number => typeof p === "number")
    .sort((a, b) => b - a)
    .slice(0, n)
    .reduce((a, b) => a + b, 0);
}

function StatsTable({
  title,
  rows,
  valueLabel,
  noDataText,
  onOpenDrilldown,
}: {
  title: string;
  rows: { personid: number; name: string; value: number; usedItems?: Result[] }[];
  valueLabel: string;
  noDataText: string;
  onOpenDrilldown: (row: { personid: number; name: string; usedItems?: Result[] }) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">{noDataText}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Namn</TableHead>
                <TableHead className="text-right">{valueLabel}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.personid}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-right">
                    <button
                      className="underline text-primary"
                      onClick={() => onOpenDrilldown(r)}
                    >
                      {r.value.toFixed(valueLabel === "Antal" ? 0 : 2)}
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default function Index461() {
  const { toast } = useToast();
  const { data: texts } = useAppTexts("index461", [
    "title.vandringspris",
    "intro",
    "filters.year",
    "filters.gender",
    "filters.discipline",
    "gender.all",
    "gender.female",
    "gender.male",
    "discipline.1",
    "discipline.2",
    "discipline.3",
    "discipline.4",
    "discipline.7",
    "discipline.8",
    "discipline.all",
    "button.update",
    "button.updatePersons",
    "button.updateEvents",
    "button.updateResults",
    // Table titles and labels
    "table.mostRaces.title",
    "table.mostPoints.title",
    "table.top5.title",
    "table.top5.0_16.title",
    "table.top10.title",
    "table.top10.0_20.title",
    "table.top10.21_34.title",
    "table.top10.35_99.title",
    "table.top10.60_99.title",
    "table.championship.title",
    "label.count",
    "label.points",
    "text.noData",
  ]);

  const { data: years = [] } = useYears(CLUB_ID);
  const currentUTCYear = new Date().getUTCFullYear();
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [selectedGenders, setSelectedGenders] = useState<string[]>(['__ALL__']);
  const [selectedDisciplines, setSelectedDisciplines] = useState<number[]>([1]); // Default to Fot-OL
  const [distances, setDistances] = useState<string[]>(['__ALL__']);
  const [forms, setForms] = useState<string[]>(['__ALL__']);

  // Ensure default becomes the highest available year when data arrives.
  useEffect(() => {
    if (years.length && selectedYears.length === 0) {
      const maxYear = Math.max(...years);
      setSelectedYears([maxYear]);
    }
  }, [years, selectedYears.length]);

  const { data: clubName = "" } = useClubName(CLUB_ID);

  // Translation mappings
  const distanceLabels = {
    'Long': 'Lång',
    'Middle': 'Medel', 
    'Sprint': 'Sprint'
  };

  const formLabels = {
    'RelaySingleDay': 'Stafett',
    'IndMultiDay': 'Flerdagars',
    '__NULL__': 'Individuell'
  };

  const genderLabels = {
    'Alla': 'Alla',
    'Damer': 'Damer',
    'Herrar': 'Herrar'
  };

  const disciplineLabels = {
    1: 'Fot-OL',
    2: 'MTBO',
    3: 'SkidO',
    4: 'Pre-O',
    7: 'OL-skytte',
    8: 'Indoor'
  };

  // Multi-select helper functions
  const toggleYearSelection = (year: number) => {
    if (year === -1) { // "__ALL__" equivalent for years
      setSelectedYears([-1]);
    } else {
      const newYears = selectedYears.includes(-1) 
        ? [year]
        : selectedYears.includes(year)
          ? selectedYears.filter(y => y !== year)
          : [...selectedYears, year];
      
      setSelectedYears(newYears.length === 0 ? [-1] : newYears);
    }
  };

  const toggleGenderSelection = (gender: string) => {
    if (gender === '__ALL__') {
      setSelectedGenders(['__ALL__']);
    } else {
      const newGenders = selectedGenders.includes('__ALL__') 
        ? [gender]
        : selectedGenders.includes(gender)
          ? selectedGenders.filter(g => g !== gender)
          : [...selectedGenders, gender];
      
      setSelectedGenders(newGenders.length === 0 ? ['__ALL__'] : newGenders);
    }
  };

  const toggleDisciplineSelection = (disciplineId: number) => {
    if (disciplineId === -1) { // "__ALL__" equivalent for disciplines
      setSelectedDisciplines([-1]);
    } else {
      const newDisciplines = selectedDisciplines.includes(-1) 
        ? [disciplineId]
        : selectedDisciplines.includes(disciplineId)
          ? selectedDisciplines.filter(d => d !== disciplineId)
          : [...selectedDisciplines, disciplineId];
      
      setSelectedDisciplines(newDisciplines.length === 0 ? [-1] : newDisciplines);
    }
  };

  const toggleDistanceSelection = (distance: string) => {
    if (distance === '__ALL__') {
      setDistances(['__ALL__']);
    } else {
      const newDistances = distances.includes('__ALL__') 
        ? [distance]
        : distances.includes(distance)
          ? distances.filter(d => d !== distance)
          : [...distances, distance];
      
      setDistances(newDistances.length === 0 ? ['__ALL__'] : newDistances);
    }
  };

  const toggleFormSelection = (form: string) => {
    if (form === '__ALL__') {
      setForms(['__ALL__']);
    } else {
      const newForms = forms.includes('__ALL__')
        ? [form]
        : forms.includes(form)
          ? forms.filter(f => f !== form)
          : [...forms, form];
      
      setForms(newForms.length === 0 ? ['__ALL__'] : newForms);
    }
  };

  const formatDistanceLabel = (distance: string) => {
    return distanceLabels[distance as keyof typeof distanceLabels] || distance;
  };

  const formatFormLabel = (form: string | null) => {
    if (form === null) return formLabels['__NULL__'];
    return formLabels[form as keyof typeof formLabels] || form;
  };

  // Base filtered results for common filters
  const { data: baseResults = [], isLoading } = useResults({
    club: CLUB_ID,
    years: selectedYears,
    genders: selectedGenders,
    disciplineIds: selectedDisciplines,
    distances: distances,
    forms: forms,
  });

  // Derived datasets for each table
  const rowsMostRaces = useMemo(() => {
    const groups = groupByPerson(baseResults);
    const rows = Array.from(groups.entries()).map(([personid, { name, items }]) => ({
      personid,
      name,
      value: items.length,
      usedItems: items,
    }));
    return rows.sort((a, b) => b.value - a.value);
  }, [baseResults]);

  const makeTopPointsRows = (n: number, ageMin: number | null, ageMax: number | null, onlyChampionship?: boolean) => {
    const filtered = baseResults.filter((r) => {
      if (onlyChampionship && r.eventclassificationid !== 1) return false;
      if (ageMin !== null && (r.personage ?? 0) < ageMin) return false;
      if (ageMax !== null && (r.personage ?? 0) > ageMax) return false;
      return true;
    });
    const groups = groupByPerson(filtered);
    const rows = Array.from(groups.entries()).map(([personid, { name, items }]) => {
      // top-N by points per person
      const topItems = items
        .filter((i) => typeof i.points === "number")
        .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
        .slice(0, n);
      const value = topItems.reduce((sum, i) => sum + (i.points ?? 0), 0);
      return { personid, name, value, usedItems: topItems };
    });
    return rows.sort((a, b) => b.value - a.value);
  };

  const rowsMostPointsAll = useMemo(() => {
    const groups = groupByPerson(baseResults);
    const rows = Array.from(groups.entries()).map(([personid, { name, items }]) => ({
      personid,
      name,
      value: items.reduce((sum, i) => sum + (i.points ?? 0), 0),
      usedItems: items,
    }));
    return rows.sort((a, b) => b.value - a.value);
  }, [baseResults]);

  const rowsTop5 = useMemo(() => makeTopPointsRows(5, null, null), [baseResults]);
  const rowsTop5_0_16 = useMemo(() => makeTopPointsRows(5, 0, 16), [baseResults]);
  const rowsTop10 = useMemo(() => makeTopPointsRows(10, null, null), [baseResults]);
  const rowsTop10_0_20 = useMemo(() => makeTopPointsRows(10, 0, 20), [baseResults]);
  const rowsTop10_21_34 = useMemo(() => makeTopPointsRows(10, 21, 34), [baseResults]);
  const rowsTop10_35_99 = useMemo(() => makeTopPointsRows(10, 35, 99), [baseResults]);
  const rowsTop10_60_99 = useMemo(() => makeTopPointsRows(10, 60, 99), [baseResults]);
  const rowsChampionship = useMemo(() => makeTopPointsRows(9999, null, null, true), [baseResults]);

  // Drilldown state
  const [drillOpen, setDrillOpen] = useState(false);
  const [drillTitle, setDrillTitle] = useState("");
  const [drillItems, setDrillItems] = useState<Result[]>([]);

  const openDrill = (title: string, row: { name: string; usedItems?: Result[] }) => {
    setDrillTitle(`${title} – ${row.name}`);
    setDrillItems(row.usedItems ?? []);
    setDrillOpen(true);
  };

  async function callProxy(path: string) {
    const base = getProxyBaseUrl().url ?? "";
    if (!base) throw new Error("PROXY_BASE_URL not set");
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`Proxy error ${res.status}`);
    return await res.json().catch(() => ({}));
  }

  const handleProxy = async (path: string, label: string) => {
    try {
      await callProxy(path);
      toast({ title: `${label} klar` });
    } catch (e: any) {
      toast({ title: `${label} misslyckades`, description: e.message, variant: "destructive" });
    }
  };


  return (
    <main className="container mx-auto p-4 space-y-6">
      <Helmet>
        <title>{`${t(texts, "title.vandringspris", "Vandringspris")} ${clubName}`}</title>
        <meta name="description" content={`Vandringspris och statistik för ${clubName}`} />
        <link rel="canonical" href="/index461" />
      </Helmet>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">
          {t(texts, "title.vandringspris", "Vandringspris")} {clubName}
        </h1>
        <p className="text-muted-foreground">{t(texts, "intro", "Förklarande textmassa...")}</p>
      </header>

      {/* Filters */}
      <section className="flex flex-wrap gap-4 items-center">
        <div className="w-48">
          <label className="block text-sm mb-1">{t(texts, "filters.year", "Årtal")}</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                {selectedYears.includes(-1) ? 'Alla år' : 
                 selectedYears.length === 1 ? selectedYears[0] :
                 `${selectedYears.length} valda`}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-0">
              <div className="p-2 space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="year-all"
                    checked={selectedYears.includes(-1)}
                    onCheckedChange={() => toggleYearSelection(-1)}
                  />
                  <label htmlFor="year-all" className="text-sm">Alla</label>
                </div>
                {years.map((y) => (
                  <div key={y} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`year-${y}`}
                      checked={!selectedYears.includes(-1) && selectedYears.includes(y)}
                      onCheckedChange={() => toggleYearSelection(y)}
                    />
                    <label htmlFor={`year-${y}`} className="text-sm">{y}</label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div className="w-48">
          <label className="block text-sm mb-1">{t(texts, "filters.gender", "Kön")}</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                {selectedGenders.includes('__ALL__') ? 'Alla kön' : 
                 selectedGenders.length === 1 ? genderLabels[selectedGenders[0] as keyof typeof genderLabels] :
                 `${selectedGenders.length} valda`}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-0">
              <div className="p-2 space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="gender-all"
                    checked={selectedGenders.includes('__ALL__')}
                    onCheckedChange={() => toggleGenderSelection('__ALL__')}
                  />
                  <label htmlFor="gender-all" className="text-sm">Alla</label>
                </div>
                {['Damer', 'Herrar'].map((gender) => (
                  <div key={gender} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`gender-${gender}`}
                      checked={!selectedGenders.includes('__ALL__') && selectedGenders.includes(gender)}
                      onCheckedChange={() => toggleGenderSelection(gender)}
                    />
                    <label htmlFor={`gender-${gender}`} className="text-sm">
                      {genderLabels[gender as keyof typeof genderLabels]}
                    </label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div className="w-48">
          <label className="block text-sm mb-1">{t(texts, "filters.discipline", "Disciplin")}</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                {selectedDisciplines.includes(-1) ? 'Alla discipliner' : 
                 selectedDisciplines.length === 1 ? disciplineLabels[selectedDisciplines[0] as keyof typeof disciplineLabels] :
                 `${selectedDisciplines.length} valda`}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-0">
              <div className="p-2 space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="discipline-all"
                    checked={selectedDisciplines.includes(-1)}
                    onCheckedChange={() => toggleDisciplineSelection(-1)}
                  />
                  <label htmlFor="discipline-all" className="text-sm">Alla</label>
                </div>
                {[1, 2, 3, 4, 7, 8].map((disciplineId) => (
                  <div key={disciplineId} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`discipline-${disciplineId}`}
                      checked={!selectedDisciplines.includes(-1) && selectedDisciplines.includes(disciplineId)}
                      onCheckedChange={() => toggleDisciplineSelection(disciplineId)}
                    />
                    <label htmlFor={`discipline-${disciplineId}`} className="text-sm">
                      {disciplineLabels[disciplineId as keyof typeof disciplineLabels]}
                    </label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div className="w-48">
          <label className="block text-sm mb-1">Distans</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                {distances.includes('__ALL__') ? 'Alla distanser' : 
                 distances.length === 1 ? formatDistanceLabel(distances[0]) :
                 `${distances.length} valda`}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-0">
              <div className="p-2 space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="distance-all"
                    checked={distances.includes('__ALL__')}
                    onCheckedChange={() => toggleDistanceSelection('__ALL__')}
                  />
                  <label htmlFor="distance-all" className="text-sm">Alla</label>
                </div>
                {['Long', 'Middle', 'Sprint'].map((dist) => (
                  <div key={dist} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`distance-${dist}`}
                      checked={!distances.includes('__ALL__') && distances.includes(dist)}
                      onCheckedChange={() => toggleDistanceSelection(dist)}
                    />
                    <label htmlFor={`distance-${dist}`} className="text-sm">
                      {formatDistanceLabel(dist)}
                    </label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div className="w-48">
          <label className="block text-sm mb-1">Tävlingsform</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                {forms.includes('__ALL__') ? 'Alla former' : 
                 forms.length === 1 ? formatFormLabel(forms[0] === '__NULL__' ? null : forms[0]) :
                 `${forms.length} valda`}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-0">
              <div className="p-2 space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="form-all"
                    checked={forms.includes('__ALL__')}
                    onCheckedChange={() => toggleFormSelection('__ALL__')}
                  />
                  <label htmlFor="form-all" className="text-sm">Alla</label>
                </div>
                {['RelaySingleDay', 'IndMultiDay', '__NULL__'].map((form) => (
                  <div key={form} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`form-${form}`}
                      checked={!forms.includes('__ALL__') && forms.includes(form)}
                      onCheckedChange={() => toggleFormSelection(form)}
                    />
                    <label htmlFor={`form-${form}`} className="text-sm">
                      {formatFormLabel(form === '__NULL__' ? null : form)}
                    </label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </section>

      {/* Tables */}
      <section className="grid md:grid-cols-2 gap-4">
        <StatsTable
          title={t(texts, "table.mostRaces.title", "Flest tävlingar")}
          valueLabel={t(texts, "label.count", "Antal")}
          noDataText={t(texts, "text.noData", "Ingen data finns")}
          rows={rowsMostRaces}
          onOpenDrilldown={(row) => openDrill(t(texts, "table.mostRaces.title", "Flest tävlingar"), row)}
        />
        <StatsTable
          title={t(texts, "table.mostPoints.title", "Flest poäng")}
          valueLabel={t(texts, "label.points", "Poäng")}
          noDataText={t(texts, "text.noData", "Ingen data finns")}
          rows={rowsMostPointsAll}
          onOpenDrilldown={(row) => openDrill(t(texts, "table.mostPoints.title", "Flest poäng"), row)}
        />
        <StatsTable
          title={t(texts, "table.top5.title", "Flest poäng 5 bästa tävlingarna")}
          valueLabel={t(texts, "label.points", "Poäng")}
          noDataText={t(texts, "text.noData", "Ingen data finns")}
          rows={rowsTop5}
          onOpenDrilldown={(row) => openDrill(t(texts, "table.top5.title", "Flest poäng 5 bästa tävlingarna"), row)}
        />
        <StatsTable
          title={t(texts, "table.top5.0_16.title", "Flest poäng 5 bästa tävlingarna 0–16 år")}
          valueLabel={t(texts, "label.points", "Poäng")}
          noDataText={t(texts, "text.noData", "Ingen data finns")}
          rows={rowsTop5_0_16}
          onOpenDrilldown={(row) =>
            openDrill(t(texts, "table.top5.0_16.title", "Flest poäng 5 bästa tävlingarna 0–16 år"), row)
          }
        />
        <StatsTable
          title={t(texts, "table.top10.title", "Flest poäng 10 bästa tävlingarna")}
          valueLabel={t(texts, "label.points", "Poäng")}
          noDataText={t(texts, "text.noData", "Ingen data finns")}
          rows={rowsTop10}
          onOpenDrilldown={(row) => openDrill(t(texts, "table.top10.title", "Flest poäng 10 bästa tävlingarna"), row)}
        />
        <StatsTable
          title={t(texts, "table.top10.0_20.title", "Flest poäng 10 bästa tävlingarna 0–20 år")}
          valueLabel={t(texts, "label.points", "Poäng")}
          noDataText={t(texts, "text.noData", "Ingen data finns")}
          rows={rowsTop10_0_20}
          onOpenDrilldown={(row) =>
            openDrill(t(texts, "table.top10.0_20.title", "Flest poäng 10 bästa tävlingarna 0–20 år"), row)
          }
        />
        <StatsTable
          title={t(texts, "table.top10.21_34.title", "Flest poäng 10 bästa tävlingarna 21–34 år")}
          valueLabel={t(texts, "label.points", "Poäng")}
          noDataText={t(texts, "text.noData", "Ingen data finns")}
          rows={rowsTop10_21_34}
          onOpenDrilldown={(row) =>
            openDrill(t(texts, "table.top10.21_34.title", "Flest poäng 10 bästa tävlingarna 21–34 år"), row)
          }
        />
        <StatsTable
          title={t(texts, "table.top10.35_99.title", "Flest poäng 10 bästa tävlingarna 35–99 år")}
          valueLabel={t(texts, "label.points", "Poäng")}
          noDataText={t(texts, "text.noData", "Ingen data finns")}
          rows={rowsTop10_35_99}
          onOpenDrilldown={(row) =>
            openDrill(t(texts, "table.top10.35_99.title", "Flest poäng 10 bästa tävlingarna 35–99 år"), row)
          }
        />
        <StatsTable
          title={t(texts, "table.top10.60_99.title", "Flest poäng 10 bästa tävlingarna 60–99 år")}
          valueLabel={t(texts, "label.points", "Poäng")}
          noDataText={t(texts, "text.noData", "Ingen data finns")}
          rows={rowsTop10_60_99}
          onOpenDrilldown={(row) =>
            openDrill(t(texts, "table.top10.60_99.title", "Flest poäng 10 bästa tävlingarna 60–99 år"), row)
          }
        />
        <StatsTable
          title={t(texts, "table.championship.title", "Flest poäng Mästerskap")}
          valueLabel={t(texts, "label.points", "Poäng")}
          noDataText={t(texts, "text.noData", "Ingen data finns")}
          rows={rowsChampionship}
          onOpenDrilldown={(row) => openDrill(t(texts, "table.championship.title", "Flest poäng Mästerskap"), row)}
        />
      </section>

      {/* Drilldown */}
      <Dialog open={drillOpen} onOpenChange={setDrillOpen}>
        <DialogContent className="w-[min(90vw,960px)] max-w-[90vw] h-screen max-h-[85vh] sm:h-auto sm:max-h-[85vh] flex flex-col">
          <DialogHeader className="sticky top-0 z-10 bg-background border-b pb-4">
            <DialogTitle>{drillTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tävlingsdatum</TableHead>
                  <TableHead>Tävlingsnamn</TableHead>
                  <TableHead>Distans</TableHead>
                  <TableHead>Tävlingsform</TableHead>
                  <TableHead>Klass</TableHead>
                  <TableHead>Klasstyp</TableHead>
                  <TableHead>Klassfaktor</TableHead>
                  <TableHead>Poäng</TableHead>
                  <TableHead>Tid</TableHead>
                  <TableHead>Tid efter</TableHead>
                  <TableHead>Placering</TableHead>
                  <TableHead>Antal startande</TableHead>
                  <TableHead>Resultatstatus</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drillItems.map((r) => (
                  <TableRow key={`${r.eventraceid}-${r.personid}`}>
                    <TableCell>{new Date(r.eventdate).toISOString().slice(0, 10)}</TableCell>
                    <TableCell>{r.eventname}</TableCell>
                    <TableCell>{r.eventdistance_label || formatDistanceLabel(r.eventdistance || '')}</TableCell>
                    <TableCell>{r.eventform_label || formatFormLabel(r.eventform)}</TableCell>
                    <TableCell>{r.eventclassname ?? ""}</TableCell>
                    <TableCell>{r.classtypeid ?? ""}</TableCell>
                    <TableCell>{r.klassfaktor ?? ""}</TableCell>
                    <TableCell>{typeof r.points === "number" ? r.points.toFixed(2) : ""}</TableCell>
                    <TableCell>{r.resulttime != null ? formatSecondsToHMS(r.resulttime) : ""}</TableCell>
                    <TableCell>{r.resulttimediff != null ? formatSecondsToHMS(r.resulttimediff) : ""}</TableCell>
                    <TableCell>{r.resultposition ?? ""}</TableCell>
                    <TableCell>{r.classresultnumberofstarts ?? ""}</TableCell>
                    <TableCell>{r.resultcompetitorstatus ?? ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

    </main>
  );
}
