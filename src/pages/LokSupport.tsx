import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LokSupportFilters {
  year: number;
  month?: number;
  minAge: number;
  maxAge: number;
  minCount: number;
}

interface ParticipantResult {
  personnamefamily: string | null;
  personnamegiven: string | null;
  personage: number | null;
  resultcompetitorstatus: string | null;
  isInAgeRange: boolean;
}

interface EventraceResult {
  eventraceid: number;
  eventdate: string;
  eventname: string;
  participants: ParticipantResult[];
  eligibleCount: number;
}

const LokSupport = () => {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<EventraceResult[]>([]);
  
  // Get current year in Europe/Stockholm timezone
  const getCurrentYear = () => {
    const now = new Date();
    return now.getFullYear();
  };

  // Initialize filters from URL or defaults
  const [filters, setFilters] = useState<LokSupportFilters>({
    year: parseInt(searchParams.get('year') || '') || getCurrentYear(),
    month: searchParams.get('month') ? parseInt(searchParams.get('month')) : undefined,
    minAge: parseInt(searchParams.get('minAge') || '') || 6,
    maxAge: parseInt(searchParams.get('maxAge') || '') || 25,
    minCount: parseInt(searchParams.get('minCount') || '') || 3,
  });

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('year', filters.year.toString());
    if (filters.month) params.set('month', filters.month.toString());
    params.set('minAge', filters.minAge.toString());
    params.set('maxAge', filters.maxAge.toString());
    params.set('minCount', filters.minCount.toString());
    setSearchParams(params);
  }, [filters, setSearchParams]);

  const fetchLokSupportData = async () => {
    if (!filters.year) {
      toast({
        title: "Fel",
        description: "År måste anges",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      console.debug('Fetching LOK support data with filters:', filters);

      // Step 1: Get results that meet the criteria using RPC
      const { data: eligibleResults, error: eligibleError } = await supabase.rpc('rpc_results_enriched', {
        _club: 114,
        _year: filters.year,
        _gender: null,
        _age_min: filters.minAge,
        _age_max: filters.maxAge,
        _only_championship: null,
        _personid: null,
        _limit: 10000,
        _offset: 0
      });
      
      if (eligibleError) throw eligibleError;

      console.debug('Eligible results count:', eligibleResults?.length || 0);

      // Filter out DidNotStart and Cancelled statuses
      const validResults = eligibleResults?.filter(result => 
        result.resultcompetitorstatus !== 'DidNotStart' && 
        result.resultcompetitorstatus !== 'Cancelled'
      ) || [];

      // Filter by month if specified
      const monthFilteredResults = filters.month 
        ? validResults.filter(result => {
            const eventDate = new Date(result.eventdate);
            return eventDate.getMonth() + 1 === filters.month;
          })
        : validResults;

      // Count distinct persons per eventrace (handle personid = 0 as unique)
      const eventraceCounts = new Map<number, Set<string>>();
      const eventraceInfo = new Map<number, { eventdate: string; eventname: string }>();

      monthFilteredResults.forEach(result => {
        const key = result.personid === 0 ? `temp_${Math.random()}` : result.personid.toString();
        
        if (!eventraceCounts.has(result.eventraceid)) {
          eventraceCounts.set(result.eventraceid, new Set());
        }
        eventraceCounts.get(result.eventraceid)!.add(key);

        // Store event info
        if (!eventraceInfo.has(result.eventraceid)) {
          eventraceInfo.set(result.eventraceid, {
            eventdate: result.eventdate,
            eventname: result.eventname
          });
        }
      });

      // Filter eventraces that meet minimum count
      const qualifyingEventraceIds = Array.from(eventraceCounts.entries())
        .filter(([_, persons]) => persons.size >= filters.minCount)
        .map(([eventraceId]) => eventraceId);

      console.debug('Qualifying eventrace IDs:', qualifyingEventraceIds);

      if (qualifyingEventraceIds.length === 0) {
        setResults([]);
        setLoading(false);
        return;
      }

      // Step 2: Get all participants for qualifying eventraces
      const { data: allParticipants, error: participantsError } = await supabase.rpc('rpc_results_enriched', {
        _club: 114,
        _year: filters.year,
        _gender: null,
        _age_min: null,
        _age_max: null,
        _only_championship: null,
        _personid: null,
        _limit: 10000,
        _offset: 0
      });
      
      if (participantsError) throw participantsError;

      // Filter to only qualifying eventraces and exclude DNS/Cancelled
      const filteredParticipants = allParticipants?.filter(result => 
        qualifyingEventraceIds.includes(result.eventraceid) &&
        result.resultcompetitorstatus !== 'DidNotStart' && 
        result.resultcompetitorstatus !== 'Cancelled'
      ) || [];

      // Apply month filter if specified
      const finalParticipants = filters.month 
        ? filteredParticipants.filter(result => {
            const eventDate = new Date(result.eventdate);
            return eventDate.getMonth() + 1 === filters.month;
          })
        : filteredParticipants;

      console.debug('All participants count:', finalParticipants.length);

      // Group and format results
      const groupedResults = new Map<number, EventraceResult>();

      finalParticipants.forEach(result => {
        if (!groupedResults.has(result.eventraceid)) {
          groupedResults.set(result.eventraceid, {
            eventraceid: result.eventraceid,
            eventdate: result.eventdate,
            eventname: result.eventname,
            participants: [],
            eligibleCount: eventraceCounts.get(result.eventraceid)?.size || 0
          });
        }

        const isInAgeRange = result.personage !== null && 
                           result.personage >= filters.minAge && 
                           result.personage <= filters.maxAge;

        groupedResults.get(result.eventraceid)!.participants.push({
          personnamefamily: result.personnamefamily || null,
          personnamegiven: result.personnamegiven || null,
          personage: result.personage,
          resultcompetitorstatus: result.resultcompetitorstatus,
          isInAgeRange
        });
      });

      // Sort results: oldest first by eventdate, then by eventname
      const sortedResults = Array.from(groupedResults.values()).sort((a, b) => {
        const dateCompare = new Date(a.eventdate).getTime() - new Date(b.eventdate).getTime();
        if (dateCompare !== 0) return dateCompare;
        return a.eventname.localeCompare(b.eventname);
      });

      // Sort participants within each eventrace
      sortedResults.forEach(eventrace => {
        eventrace.participants.sort((a, b) => {
          const familyCompare = (a.personnamefamily || '').localeCompare(b.personnamefamily || '');
          if (familyCompare !== 0) return familyCompare;
          
          const givenCompare = (a.personnamegiven || '').localeCompare(b.personnamegiven || '');
          if (givenCompare !== 0) return givenCompare;
          
          // Handle null ages (NULLS LAST)
          if (a.personage === null && b.personage === null) return 0;
          if (a.personage === null) return 1;
          if (b.personage === null) return -1;
          return a.personage - b.personage;
        });
      });

      console.debug('Final results count:', sortedResults.length);
      setResults(sortedResults);

    } catch (error) {
      console.error('Error fetching LOK support data:', error);
      toast({
        title: "Fel",
        description: "Kunde inte hämta data. Försök igen.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLokSupportData();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sv-SE');
  };

  return (
    <main className="container mx-auto p-6 max-w-6xl">
      <Helmet>
        <title>Tävlingar för LOK-stöd | Orienteering Stats</title>
        <meta name="description" content="Sök tävlingar som kvalificerar för LOK-stöd baserat på antal deltagare i åldersintervall" />
      </Helmet>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Tävlingar för LOK-stöd</h1>
        <p className="text-muted-foreground">
          Sök tävlingar som kvalificerar för LOK-stöd baserat på antal deltagare i åldersintervall.
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Sökfilter</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="year">År *</Label>
                <Input
                  id="year"
                  type="number"
                  min="2000"
                  max="2030"
                  value={filters.year}
                  onChange={(e) => setFilters(prev => ({ ...prev, year: parseInt(e.target.value) || getCurrentYear() }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="month">Månad</Label>
                <Select 
                  value={filters.month?.toString() || 'all'} 
                  onValueChange={(value) => setFilters(prev => ({ 
                    ...prev, 
                    month: value === 'all' ? undefined : parseInt(value) 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alla</SelectItem>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {new Date(2000, i).toLocaleDateString('sv-SE', { month: 'long' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="minAge">Min ålder</Label>
                <Input
                  id="minAge"
                  type="number"
                  min="0"
                  max="100"
                  value={filters.minAge}
                  onChange={(e) => setFilters(prev => ({ ...prev, minAge: parseInt(e.target.value) || 6 }))}
                />
              </div>

              <div>
                <Label htmlFor="maxAge">Max ålder</Label>
                <Input
                  id="maxAge"
                  type="number"
                  min="0"
                  max="100"
                  value={filters.maxAge}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxAge: parseInt(e.target.value) || 25 }))}
                />
              </div>

              <div>
                <Label htmlFor="minCount">Min antal</Label>
                <Input
                  id="minCount"
                  type="number"
                  min="1"
                  max="100"
                  value={filters.minCount}
                  onChange={(e) => setFilters(prev => ({ ...prev, minCount: parseInt(e.target.value) || 3 }))}
                />
              </div>
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? "Söker..." : "Sök"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">Inga resultat hittades. Prova att justera sökfiltren.</p>
          </CardContent>
        </Card>
      )}

      {results.map((eventrace) => (
        <Card key={eventrace.eventraceid} className="mb-4">
          <CardHeader>
            <CardTitle className="text-lg">
              {formatDate(eventrace.eventdate)} - {eventrace.eventname}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {eventrace.eligibleCount} deltagare i åldersintervall {filters.minAge}-{filters.maxAge} år
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Efternamn</TableHead>
                  <TableHead>Förnamn</TableHead>
                  <TableHead>Ålder</TableHead>
                  <TableHead>Resultatstatus</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventrace.participants.map((participant, index) => (
                  <TableRow 
                    key={index} 
                    className={participant.isInAgeRange ? "bg-yellow-100 dark:bg-yellow-900/20" : ""}
                  >
                    <TableCell>{participant.personnamefamily || "-"}</TableCell>
                    <TableCell>{participant.personnamegiven || "-"}</TableCell>
                    <TableCell>{participant.personage ?? "-"}</TableCell>
                    <TableCell>{participant.resultcompetitorstatus || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </main>
  );
};

export default LokSupport;