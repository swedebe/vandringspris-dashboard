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
import { ChevronDown, Loader2 } from "lucide-react";
const CLUB_ID = 114;

// Shared function to build Supabase query with filters
function buildQuery(
  query: any,
  filters: {
    selectedYear: number | null;
    selectedGender: string;
    selectedDisciplines: number[];
    distances: string[];
    forms: string[];
  }
) {
  const { selectedYear, selectedGender, selectedDisciplines, distances, forms } = filters;
  
  // Always filter by club first
  query = query.eq('clubparticipation', CLUB_ID);
  
  const appliedFilters: string[] = [];
  
  // Year filter
  if (selectedYear !== null) {
    query = query.eq('eventyear', selectedYear);
    appliedFilters.push(`year=${selectedYear}`);
  }
  
  // Distance filter - map UI values to database values
  if (!distances.includes('__ALL__') && distances.length > 0) {
    const distanceMap: { [key: string]: string } = {
      'Lång': 'Long',
      'Medel': 'Middle', 
      'Sprint': 'Sprint'
    };
    const mappedDistances = distances.map(d => distanceMap[d] || d);
    query = query.in('eventdistance', mappedDistances);
    appliedFilters.push(`distances=[${mappedDistances.join(',')}]`);
  }
  
  // Form filter - use eventform_group values
  if (!forms.includes('__ALL__') && forms.length > 0) {
    const formGroups: string[] = [];
    if (forms.includes('Individuell')) formGroups.push('Individual');
    if (forms.includes('Stafett')) formGroups.push('RelaySingleDay');
    if (forms.includes('Flerdagars')) formGroups.push('IndMultiDay');
    
    if (formGroups.length > 0) {
      query = query.in('eventform_group', formGroups);
      appliedFilters.push(`forms=[${formGroups.join(',')}]`);
    }
  }
  
  // Discipline filter - use integers 1,2,3,4,7,8
  if (!selectedDisciplines.includes(-1) && selectedDisciplines.length > 0) {
    const validDisciplines = selectedDisciplines.filter(id => id !== -1);
    if (validDisciplines.length > 0) {
      query = query.in('disciplineid', validDisciplines);
      appliedFilters.push(`disciplines=[${validDisciplines.join(',')}]`);
    }
  }
  
  // Gender filter - use personsex from the view
  if (selectedGender !== '__ALL__') {
    const genderMap: { [key: string]: string } = {
      'Damer': 'F',
      'Herrar': 'M'
    };
    const mappedGender = genderMap[selectedGender];
    if (mappedGender) {
      query = query.eq('personsex', mappedGender);
      appliedFilters.push(`gender=${mappedGender}`);
    }
  }
  
  console.debug('Applied filters:', appliedFilters.join(', ') || 'none');
  return query;
}

// Function to fetch ALL results for a person with complete filtering
async function fetchAllResultsForPerson(personId: number, filters: {
  selectedYear: number | null;
  selectedGender: string;
  selectedDisciplines: number[];
  distances: string[];
  forms: string[];
}) {
  let query = supabase.from('v_index114_results').select('*');
  query = buildQuery(query, filters);
  query = query.eq('personid', personId);
  
  const { data, error } = await query;
  if (error) throw error;
  
  console.debug(`fetchAllResultsForPerson returned ${data?.length || 0} rows for person ${personId}`);
  return data || [];
}

type Result = {
  eventraceid: number;
  eventid: number;
  eventdate: string;
  eventname: string;
  eventform: string | null;
  eventdistance: string | null;
  eventform_group: string | null;
  eventyear: number | null;
  disciplineid: number | null;
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
  year?: number | null;
  gender?: string;
  disciplineIds?: number[];
  onlyChampionship?: boolean | null;
  ageMin?: number | null;
  ageMax?: number | null;
  distances?: string[];
  forms?: string[];
}) {
  const { club, year = null, gender = '__ALL__', disciplineIds = [], onlyChampionship = null, ageMin = null, ageMax = null, distances = ['__ALL__'], forms = ['__ALL__'] } = params;
  return useQuery<Result[]>({
    queryKey: ["v_index114_results", club, year, gender, disciplineIds, onlyChampionship, ageMin, ageMax, distances, forms],
    queryFn: async () => {
      const filters = { selectedYear: year, selectedGender: gender, selectedDisciplines: disciplineIds, distances, forms };
      
      let query = supabase.from('v_index114_results').select('*');
      query = buildQuery(query, filters);
      
      const { data, error } = await query;
      if (error) throw error;
      
      console.debug(`useResults returned ${data?.length || 0} rows`);
      return data as Result[] || [];
    },
  });
}

function groupByPerson(results: Result[]) {
  const map = new Map<number, { name: string; items: Result[] }>();
  for (const r of results) {
    // Show names from the view, fallback to '-' if both null
    const given = r.personnamegiven || '';
    const family = r.personnamefamily || '';
    const name = given || family ? `${given} ${family}`.trim() : '-';
    if (!map.has(r.personid)) map.set(r.personid, { name, items: [] });
    map.get(r.personid)!.items.push(r);
  }
  return map;
}

function useKPIStats(params: {
  year?: number | null;
  gender?: string;
  disciplineIds?: number[];
  distances?: string[];
  forms?: string[];
}) {
  const { year = null, gender = '__ALL__', disciplineIds = [], distances = ['__ALL__'], forms = ['__ALL__'] } = params;
  return useQuery<{
    competitions_with_participation: number;
    participants_with_start: number;
    runs_ok: number;
  }>({
    queryKey: ["kpi_stats_view", CLUB_ID, year, gender, disciplineIds, distances, forms],
    queryFn: async () => {
      if (!year) return { competitions_with_participation: 0, participants_with_start: 0, runs_ok: 0 };
      
      const filters = { selectedYear: year, selectedGender: gender, selectedDisciplines: disciplineIds, distances, forms };
      
      let query = supabase.from('v_index114_results').select('*');
      query = buildQuery(query, filters);
      
      const { data, error } = await query;
      if (error) throw error;
      
      const results = data || [];
      console.debug(`useKPIStats processing ${results.length} rows`);
      
      // Aggregate in memory
      const uniqueCompetitions = new Set<number>();
      const uniqueParticipants = new Set<number>();
      let runsOk = 0;
      
      results.forEach((r: any) => {
        uniqueCompetitions.add(r.eventraceid);
        if (r.resultcompetitorstatus !== 'DidNotStart') {
          uniqueParticipants.add(r.personid);
        }
        if (r.resultcompetitorstatus === 'OK') {
          runsOk++;
        }
      });
      
      return {
        competitions_with_participation: uniqueCompetitions.size,
        participants_with_start: uniqueParticipants.size,
        runs_ok: runsOk
      };
    },
  });
}

function useTopCompetitors(params: {
  year?: number | null;
  gender?: string;
  disciplineIds?: number[];
  distances?: string[];
  forms?: string[];
  limit?: number;
}) {
  const { year = null, gender = '__ALL__', disciplineIds = [], distances = ['__ALL__'], forms = ['__ALL__'], limit = 50 } = params;
  return useQuery<{personid: number; personnamegiven: string; personnamefamily: string; competitions_count: number}[]>({
    queryKey: ["top_competitors_view", CLUB_ID, year, gender, disciplineIds, distances, forms, limit],
    queryFn: async () => {
      if (!year) return [];
      
      const filters = { selectedYear: year, selectedGender: gender, selectedDisciplines: disciplineIds, distances, forms };
      
      let query = supabase.from('v_index114_results').select('*');
      query = buildQuery(query, filters);
      query = query.in('resultcompetitorstatus', ['OK', 'Mispunch']);
      
      const { data, error } = await query;
      if (error) throw error;
      
      const results = data || [];
      console.debug(`useTopCompetitors processing ${results.length} rows`);
      
      // Aggregate in memory
      const competitionsMap = new Map<number, { personnamegiven: string; personnamefamily: string; competitions: Set<number> }>();
      
      results.forEach((r: any) => {
        if (!competitionsMap.has(r.personid)) {
          competitionsMap.set(r.personid, {
            personnamegiven: r.personnamegiven || '',
            personnamefamily: r.personnamefamily || '',
            competitions: new Set()
          });
        }
        competitionsMap.get(r.personid)!.competitions.add(r.eventraceid);
      });
      
      return Array.from(competitionsMap.entries())
        .map(([personid, data]) => ({
          personid,
          personnamegiven: data.personnamegiven,
          personnamefamily: data.personnamefamily,
          competitions_count: data.competitions.size
        }))
        .sort((a, b) => b.competitions_count - a.competitions_count || a.personnamefamily.localeCompare(b.personnamefamily))
        .slice(0, limit);
    },
  });
}

function useCompetitionsByYear(params: {
  year?: number | null;
  gender?: string;
  disciplineIds?: number[];
  distances?: string[];
  forms?: string[];
}) {
  const { year = null, gender = '__ALL__', disciplineIds = [], distances = ['__ALL__'], forms = ['__ALL__'] } = params;
  return useQuery<{ eventyear: number; events_count: number }[]>({
    queryKey: ["competitions_by_year_view", CLUB_ID, year, gender, disciplineIds, distances, forms],
    queryFn: async () => {
      const filters = { selectedYear: year, selectedGender: gender, selectedDisciplines: disciplineIds, distances, forms };
      
      let query = supabase.from('v_index114_results').select('*');
      query = buildQuery(query, filters);
      
      const { data, error } = await query;
      if (error) throw error;
      
      const results = data || [];
      console.debug(`useCompetitionsByYear processing ${results.length} rows`);
      
      const competitionsByYear = new Map<number, Set<number>>();
      
      results.forEach((r: any) => {
        const year = r.eventyear;
        if (year) {
          if (!competitionsByYear.has(year)) {
            competitionsByYear.set(year, new Set());
          }
          competitionsByYear.get(year)!.add(r.eventraceid);
        }
      });

      return Array.from(competitionsByYear.entries())
        .map(([eventyear, competitions]) => ({
          eventyear,
          events_count: competitions.size
        }))
        .sort((a, b) => b.eventyear - a.eventyear);
    },
  });
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
  rows: { personid: number; name: string; value: number; usedItems?: Result[]; tableType?: string; ageMin?: number | null; ageMax?: number | null; onlyChampionship?: boolean; topN?: number }[];
  valueLabel: string;
  noDataText: string;
  onOpenDrilldown: (row: { personid: number; name: string; usedItems?: Result[]; tableType?: string; ageMin?: number | null; ageMax?: number | null; onlyChampionship?: boolean; topN?: number }) => void;
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

export default function Index114() {
  const { toast } = useToast();
  const { data: texts } = useAppTexts("index114", [
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
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedGender, setSelectedGender] = useState<string>('__ALL__');
  const [selectedDisciplines, setSelectedDisciplines] = useState<number[]>([1]); // Default to Fot-OL
  const [distances, setDistances] = useState<string[]>(['__ALL__']);
  const [forms, setForms] = useState<string[]>(['__ALL__']);

  // Set default to the latest available year when data arrives
  useEffect(() => {
    if (years.length && selectedYear === null) {
      const maxYear = Math.max(...years);
      setSelectedYear(maxYear);
    }
  }, [years, selectedYear]);

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

  // Year selection (single select)
  const handleYearSelection = (year: number) => {
    setSelectedYear(year);
  };

  // Gender selection (single select)
  const handleGenderSelection = (gender: string) => {
    setSelectedGender(gender);
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

  // Base filtered results for common filters (only OK status for points tables)
  const { data: baseResults = [], isLoading } = useResults({
    club: CLUB_ID,
    year: selectedYear,
    gender: selectedGender,
    disciplineIds: selectedDisciplines,
    distances: distances,
    forms: forms,
  });

  // KPI stats data
  const { data: kpiStats = {
    competitions_with_participation: 0,
    participants_with_start: 0,
    runs_ok: 0
  } } = useKPIStats({
    year: selectedYear,
    gender: selectedGender,
    disciplineIds: selectedDisciplines,
    distances: distances,
    forms: forms,
  });

  // Top competitors data (for "Flest tävlingar" table)
  const { data: topCompetitors = [] } = useTopCompetitors({
    year: selectedYear,
    gender: selectedGender,
    disciplineIds: selectedDisciplines,
    distances: distances,
    forms: forms,
    limit: 50,
  });

  const { data: competitionsByYear = [] } = useCompetitionsByYear({
    year: selectedYear,
    gender: selectedGender,
    disciplineIds: selectedDisciplines,
    distances: distances,
    forms: forms,
  });

  // Derived datasets for each table
  const rowsMostRaces = useMemo(() => {
    // Use the RPC data for most races (includes OK and Mispunch statuses)
    return topCompetitors.map(competitor => ({
      personid: competitor.personid,
      name: `${competitor.personnamegiven || ''} ${competitor.personnamefamily || ''}`.trim() || '-',
      value: competitor.competitions_count,
      tableType: 'mostRaces',
    }));
  }, [topCompetitors]);

  const makeTopPointsRows = (n: number, ageMin: number | null, ageMax: number | null, onlyChampionship?: boolean) => {
    const filtered = baseResults.filter((r) => {
      // Only include OK status for points calculations
      if (r.resultcompetitorstatus !== 'OK') return false;
      // Championship data not available in view, skip this filter
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
      return { 
        personid, 
        name, 
        value, 
        tableType: 'points',
        ageMin,
        ageMax,
        onlyChampionship,
        topN: n > 999 ? undefined : n // Don't limit if n is very large (like 9999 for championship)
      };
    });
    return rows.sort((a, b) => b.value - a.value);
  };

  const rowsMostPointsAll = useMemo(() => {
    // Only include OK status for points calculations
    const filtered = baseResults.filter(r => r.resultcompetitorstatus === 'OK');
    const groups = groupByPerson(filtered);
    const rows = Array.from(groups.entries()).map(([personid, { name, items }]) => ({
      personid,
      name,
      value: items.reduce((sum, i) => sum + (i.points ?? 0), 0),
      tableType: 'points',
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
  const [drillLoading, setDrillLoading] = useState(false);

  // KPI popup states
  const [kpiDialogOpen, setKpiDialogOpen] = useState(false);
  const [kpiDialogTitle, setKpiDialogTitle] = useState("");
  const [kpiDialogData, setKpiDialogData] = useState<any[]>([]);
  const [kpiDialogType, setKpiDialogType] = useState<string>("");

  const openDrill = async (title: string, row: { 
    personid: number; 
    name: string; 
    usedItems?: Result[]; 
    tableType?: string; 
    ageMin?: number | null; 
    ageMax?: number | null; 
    onlyChampionship?: boolean; 
    topN?: number 
  }) => {
    setDrillTitle(`${title} – ${row.name}`);
    setDrillLoading(true);
    setDrillOpen(true);
    
    try {
      // Fetch complete results for this person with all applied filters
      const allResults = await fetchAllResultsForPerson(row.personid, {
        selectedYear,
        selectedGender,
        selectedDisciplines,
        distances,
        forms,
      });

      // Apply the same filtering logic that was used to calculate the summary value
      let filteredResults = allResults.filter((r: any) => {
        // Age filtering (if applicable)
        if (row.ageMin !== undefined && row.ageMin !== null && (r.personage ?? 0) < row.ageMin) return false;
        if (row.ageMax !== undefined && row.ageMax !== null && (r.personage ?? 0) > row.ageMax) return false;
        
        // Championship filtering (if applicable)
        if (row.onlyChampionship && r.eventclassificationid !== 1) return false;
        
        // Status filtering based on table type
        if (row.tableType === 'mostRaces') {
          // For "most races", include OK and Mispunch statuses
          return ['OK', 'Mispunch'].includes(r.resultcompetitorstatus || '');
        } else {
          // For points tables, only include OK status
          return r.resultcompetitorstatus === 'OK';
        }
      });

      // Sort and limit for top-N tables
      if (row.topN && row.topN > 0) {
        filteredResults = filteredResults
          .filter((r: any) => typeof r.points === 'number')
          .sort((a: any, b: any) => (b.points ?? 0) - (a.points ?? 0))
          .slice(0, row.topN);
      }

      setDrillItems(filteredResults as Result[]);
    } catch (error) {
      console.error('Error fetching drill-down data:', error);
      toast({ 
        title: "Error", 
        description: "Failed to fetch competition details", 
        variant: "destructive" 
      });
      setDrillItems([]);
    } finally {
      setDrillLoading(false);
    }
  };

  // KPI data fetching functions
  const fetchCompetitionsData = async () => {
    const filters = { selectedYear, selectedGender, selectedDisciplines, distances, forms };
    
    let query = supabase.from('v_index114_results').select('*');
    query = buildQuery(query, filters);
    
    const { data, error } = await query;
    if (error) throw error;
    
    const results = data || [];
    console.debug(`fetchCompetitionsData returned ${results.length} rows`);

    // Get unique competitions with event details
    const uniqueCompetitions = new Map();

    results.forEach((result: any) => {
      const competitionKey = result.eventraceid;
      if (!uniqueCompetitions.has(competitionKey)) {
        uniqueCompetitions.set(competitionKey, {
          eventdate: result.eventdate,
          eventname: result.eventname,
          eventorganiser: '', // Not available in view
          disciplineid: result.disciplineid,
          eventform: result.eventform,
          eventdistance: result.eventdistance
        });
      }
    });

    // Sort by eventdate ascending (January first)
    return Array.from(uniqueCompetitions.values()).sort((a, b) => 
      new Date(a.eventdate).getTime() - new Date(b.eventdate).getTime()
    );
  };

  const fetchParticipantsData = async () => {
    const filters = { selectedYear, selectedGender, selectedDisciplines, distances, forms };
    
    let query = supabase.from('v_index114_results').select('*');
    query = buildQuery(query, filters);
    query = query.neq('resultcompetitorstatus', 'DidNotStart');
    
    const { data, error } = await query;
    if (error) throw error;
    
    const results = data || [];
    console.debug(`fetchParticipantsData returned ${results.length} rows`);

    // Get unique participants with their names from the view
    const participantsMap = new Map();
    results.forEach((result: any) => {
      if (!participantsMap.has(result.personid)) {
        participantsMap.set(result.personid, {
          personid: result.personid,
          personnamegiven: result.personnamegiven || '',
          personnamefamily: result.personnamefamily || '',
          personsex: result.personsex || '',
          organisationid: CLUB_ID,
          födelsearår: null
        });
      }
    });

    return Array.from(participantsMap.values()).sort((a, b) => 
      a.personnamefamily.localeCompare(b.personnamefamily) || a.personnamegiven.localeCompare(b.personnamegiven)
    );
  };

  const handleKpiClick = async (type: string, title: string) => {
    try {
      let data: any[] = [];
      
      switch (type) {
        case 'competitions':
          data = await fetchCompetitionsData();
          break;
        case 'participants':
          data = await fetchParticipantsData();
          break;
      }
      
      setKpiDialogTitle(title);
      setKpiDialogData(data);
      setKpiDialogType(type);
      setKpiDialogOpen(true);
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch data", variant: "destructive" });
    }
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
        <link rel="canonical" href="/index114" />
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
          <label className="block text-sm mb-1">{t(texts, "filters.year", "År")}</label>
          <Select 
            value={selectedYear?.toString() || ""} 
            onValueChange={(value) => handleYearSelection(parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Välj år" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <label className="block text-sm mb-1">{t(texts, "filters.gender", "Kön")}</label>
          <Select 
            value={selectedGender} 
            onValueChange={handleGenderSelection}
          >
            <SelectTrigger>
              <SelectValue placeholder="Välj kön" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__ALL__">Alla</SelectItem>
              <SelectItem value="Damer">Damer</SelectItem>
              <SelectItem value="Herrar">Herrar</SelectItem>
            </SelectContent>
          </Select>
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

      {/* KPI Panel */}
      <section className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Antal tävlingar med deltagare</div>
                <button 
                  className="text-2xl font-bold underline text-primary hover:text-primary/80"
                  onClick={() => handleKpiClick('competitions', 'Tävlingar med deltagare')}
                >
                  {kpiStats.competitions_with_participation}
                </button>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Antal deltagare med minst 1 start</div>
                <button 
                  className="text-2xl font-bold underline text-primary hover:text-primary/80"
                  onClick={() => handleKpiClick('participants', 'Deltagare med minst 1 start')}
                >
                  {kpiStats.participants_with_start}
                </button>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Antal godkända lopp</div>
                <div className="text-2xl font-bold text-foreground">
                  {kpiStats.runs_ok}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
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
            {drillLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Loading competition details...</span>
              </div>
            ) : (
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
                  {drillItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                        No competitions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    drillItems.map((r) => (
                      <TableRow key={`${r.eventraceid}-${r.personid}`}>
                        <TableCell>{new Date(r.eventdate).toISOString().slice(0, 10)}</TableCell>
                        <TableCell>{r.eventname}</TableCell>
                        <TableCell>{r.eventdistance || '-'}</TableCell>
                        <TableCell>{r.eventform_group || '-'}</TableCell>
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
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* KPI Details Dialog */}
      <Dialog open={kpiDialogOpen} onOpenChange={setKpiDialogOpen}>
        <DialogContent className="w-[min(95vw,1200px)] max-w-[95vw] h-screen max-h-[90vh] sm:h-auto sm:max-h-[90vh] flex flex-col">
          <DialogHeader className="sticky top-0 z-10 bg-background border-b pb-4">
            <DialogTitle>{kpiDialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0">
            {kpiDialogType === 'competitions' && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Tävlingsnamn</TableHead>
                    <TableHead>Arrangör</TableHead>
                    <TableHead>Disciplin ID</TableHead>
                    <TableHead>Klassificering</TableHead>
                    <TableHead>Tävlingsform</TableHead>
                    <TableHead>Distans</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kpiDialogData.map((competition, index) => (
                    <TableRow key={index}>
                      <TableCell>{new Date(competition.eventdate).toISOString().slice(0, 10)}</TableCell>
                      <TableCell>{competition.eventname}</TableCell>
                      <TableCell>{competition.eventorganiser || '-'}</TableCell>
                      <TableCell>{competition.disciplineid || '-'}</TableCell>
                      <TableCell>{competition.eventclassificationid === 1 ? 'Mästerskap' : 'Övrigt'}</TableCell>
                      <TableCell>{formatFormLabel(competition.eventform)}</TableCell>
                      <TableCell>{formatDistanceLabel(competition.eventdistance || '')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {kpiDialogType === 'participants' && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Förnamn</TableHead>
                    <TableHead>Efternamn</TableHead>
                    <TableHead>Kön</TableHead>
                    <TableHead>Födelseår</TableHead>
                    <TableHead>Klubb ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kpiDialogData.map((participant, index) => (
                    <TableRow key={index}>
                      <TableCell>{participant.personnamegiven || '-'}</TableCell>
                      <TableCell>{participant.personnamefamily || '-'}</TableCell>
                      <TableCell>{participant.personsex || '-'}</TableCell>
                      <TableCell>{participant.födelsearår || '-'}</TableCell>
                      <TableCell>{participant.organisationid || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Proxy buttons section */}
      {hasSupabaseConfig() && (
        <section className="border-t pt-4">
          <div className="text-sm text-muted-foreground mb-2">Uppdatera data:</div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleProxy("/api/update-persons", "Uppdatera personer")}
            >
              {t(texts, "button.updatePersons", "Uppdatera personer")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleProxy("/api/update-events", "Uppdatera tävlingar")}
            >
              {t(texts, "button.updateEvents", "Uppdatera tävlingar")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleProxy("/api/update-results", "Uppdatera resultat")}
            >
              {t(texts, "button.updateResults", "Uppdatera resultat")}
            </Button>
          </div>
        </section>
      )}
    </main>
  );
}