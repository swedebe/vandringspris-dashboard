import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useAppTexts, t } from "@/hooks/useAppTexts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Export = () => {
  const { data: texts } = useAppTexts("export", [
    "title.export",
    "label.club",
    "label.personId",
    "label.year",
    "button.generateCsv",
    "text.fetching",
    "text.rowsFound",
    "error.clubRequired",
    "error.invalidClub",
    "error.invalidPersonId",
    "error.invalidYear",
    "helper.clubs",
  ]);

  const [club, setClub] = useState("");
  const [personId, setPersonId] = useState("");
  const [year, setYear] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [rowCount, setRowCount] = useState<number | null>(null);

  const validateInputs = () => {
    const newErrors: Record<string, string> = {};

    // Club validation (required)
    if (!club.trim()) {
      newErrors.club = t(texts, "error.clubRequired", "Club är obligatoriskt");
    } else if (!/^\d+$/.test(club.trim()) || parseInt(club.trim()) <= 0) {
      newErrors.club = t(texts, "error.invalidClub", "Club måste vara ett positivt heltal");
    }

    // Person ID validation (optional)
    if (personId.trim() && (!/^\d+$/.test(personId.trim()) || parseInt(personId.trim()) <= 0)) {
      newErrors.personId = t(texts, "error.invalidPersonId", "Person ID måste vara ett positivt heltal");
    }

    // Year validation (optional)
    if (year.trim() && (!/^\d{4}$/.test(year.trim()) || parseInt(year.trim()) < 1900 || parseInt(year.trim()) > 2100)) {
      newErrors.year = t(texts, "error.invalidYear", "År måste vara fyra siffror (t.ex. 2024)");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const fetchResults = async () => {
    const clubNum = parseInt(club.trim());
    const personNum = personId.trim() ? parseInt(personId.trim()) : null;
    const yearNum = year.trim() ? parseInt(year.trim()) : null;

    let eventsData: any[] = [];
    let eventIds: number[] = [];

    // Step 1: If year is provided, fetch matching events first
    if (yearNum) {
      const startDate = `${yearNum}-01-01`;
      const endDate = `${yearNum}-12-31`;
      
      try {
        const { data: events, error: eventsError } = await supabase
          .from("events")
          .select("eventid, eventdate, eventname")
          .gte("eventdate", startDate)
          .lte("eventdate", endDate);

        if (eventsError) throw eventsError;
        
        eventsData = events || [];
        eventIds = eventsData.map(e => e.eventid);
        
        // If no events found for the year, return empty results
        if (eventIds.length === 0) {
          return [];
        }
      } catch (error: any) {
        console.error("Events fetch error:", error);
        let errorMessage = "Export misslyckades (events)";
        if (error?.message) errorMessage += `: ${error.message}`;
        if (error?.code) errorMessage += ` (kod: ${error.code})`;
        if (error?.hint) errorMessage += ` - ${error.hint}`;
        throw new Error(errorMessage);
      }
    }

    // Step 2: Query results with filters
    let resultsData: any[] = [];
    try {
      let query = supabase
        .from("results")
        .select(`
          id,
          eventid,
          eventraceid,
          personid,
          resulttime,
          resulttimediff,
          resultposition,
          resultcompetitorstatus,
          points,
          clubparticipation,
          classtypeid,
          klassfaktor,
          relayleg,
          relayteamname,
          relayteamendposition,
          relayteamenddiff
        `)
        .eq("clubparticipation", clubNum);

      if (personNum) {
        query = query.eq("personid", personNum);
      }

      if (yearNum && eventIds.length > 0) {
        query = query.in("eventid", eventIds);
      }

      const { data: results, error: resultsError } = await query;
      if (resultsError) throw resultsError;

      resultsData = results || [];
    } catch (error: any) {
      console.error("Results fetch error:", error);
      let errorMessage = "Export misslyckades (results)";
      if (error?.message) errorMessage += `: ${error.message}`;
      if (error?.code) errorMessage += ` (kod: ${error.code})`;
      if (error?.hint) errorMessage += ` - ${error.hint}`;
      throw new Error(errorMessage);
    }

    // Step 3: Fetch person names
    const PERSONS_NAME_SOURCE = "persons_public_names"; // switch here if needed
    let personNameMap: Record<number, string> = {};
    if (resultsData.length > 0) {
      const uniquePersonIds = [...new Set(resultsData.map(r => r.personid).filter(Boolean))];
      
      if (uniquePersonIds.length > 0) {
        try {
          const { data: persons, error: personsError } = await supabase
            .from(PERSONS_NAME_SOURCE)
            .select("personid, personnamegiven, personnamefamily")
            .in("personid", uniquePersonIds);

          if (personsError) throw personsError;

          if (persons) {
            personNameMap = persons.reduce((acc, person) => {
              const fullName = `${person.personnamegiven || ""} ${person.personnamefamily || ""}`.trim();
              acc[person.personid] = fullName;
              return acc;
            }, {} as Record<number, string>);
          }
        } catch (error: any) {
          console.error("Persons fetch error:", error);
          // Non-blocking error - continue with empty names
          setErrors({ 
            general: "Obs: Kunde inte hämta löparnamn (RLS/behörighet). CSV genereras utan namn. " +
              (error?.message ? `Detalj: ${error.message}` : "")
          });
        }
      }
    }

    // Step 4: Enrich with event data
    if (eventsData.length > 0) {
      const eventsById = eventsData.reduce((acc, event) => {
        acc[event.eventid] = event;
        return acc;
      }, {} as Record<number, any>);

      return resultsData.map(result => ({
        ...result,
        name: personNameMap[result.personid] || "",
        events: eventsById[result.eventid] || { eventdate: null, eventname: null }
      }));
    }

    // If no year filter, optionally fetch event data for enrichment
    if (!yearNum && resultsData.length > 0) {
      const uniqueEventIds = [...new Set(resultsData.map(r => r.eventid))];
      const { data: events } = await supabase
        .from("events")
        .select("eventid, eventdate, eventname")
        .in("eventid", uniqueEventIds);

      if (events) {
        const eventsById = events.reduce((acc, event) => {
          acc[event.eventid] = event;
          return acc;
        }, {} as Record<number, any>);

        return resultsData.map(result => ({
          ...result,
          name: personNameMap[result.personid] || "",
          events: eventsById[result.eventid] || { eventdate: null, eventname: null }
        }));
      }
    }

    return resultsData.map(result => ({
      ...result,
      name: personNameMap[result.personid] || "",
      events: { eventdate: null, eventname: null }
    }));
  };

  const generateCsv = (data: any[]) => {
    const headers = [
      "id",
      "eventid",
      "eventraceid",
      "personid",
      "name",
      "resulttime",
      "resulttimediff",
      "resultposition",
      "resultcompetitorstatus",
      "points",
      "clubparticipation",
      "classtypeid",
      "klassfaktor",
      "relayleg",
      "relayteamname",
      "relayteamendposition",
      "relayteamenddiff",
      "eventdate",
      "eventname"
    ];

    const csvRows = [headers.join(",")];

    data.forEach((row) => {
      const values = headers.map(header => {
        let value = "";
        if (header === "eventdate" || header === "eventname") {
          value = row.events?.[header] || "";
        } else {
          value = row[header] || "";
        }
        
        // Escape CSV values
        if (typeof value === "string" && (value.includes(",") || value.includes('"') || value.includes("\n"))) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(values.join(","));
    });

    return csvRows.join("\n");
  };

  const handleGenerateCsv = async () => {
    if (!validateInputs()) return;

    setIsGenerating(true);
    setRowCount(null);

    try {
      const results = await fetchResults();
      setRowCount(results.length);

      const csvContent = generateCsv(results);
      
      // Add UTF-8 BOM for Excel compatibility
      const bom = "\uFEFF";
      const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
      
      // Generate filename
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19).replace("T", "-");
      const personPart = personId.trim() ? personId.trim() : "all";
      const yearPart = year.trim() ? year.trim() : "all";
      const filename = `export_${club}-${personPart}-${yearPart}_${timestamp}.csv`;
      
      // Download file
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      console.error("Export error:", error);
      
      // Build detailed error message
      let errorMessage = "Export misslyckades";
      if (error?.message) {
        errorMessage += `: ${error.message}`;
      }
      if (error?.code) {
        errorMessage += ` (kod: ${error.code})`;
      }
      if (error?.hint) {
        errorMessage += ` - ${error.hint}`;
      }
      
      setErrors({ general: errorMessage });
    } finally {
      setIsGenerating(false);
    }
  };

  const isFormValid = club.trim() && !errors.club && !errors.personId && !errors.year;

  return (
    <main className="min-h-screen bg-background p-4">
      <Helmet>
        <title>{t(texts, "title.export", "Export")} | Vandringspris</title>
        <meta name="description" content="Exportera resultatdata som CSV" />
        <link rel="canonical" href="/export" />
      </Helmet>

      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t(texts, "title.export", "Export")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="club">{t(texts, "label.club", "Club")} *</Label>
              <Input
                id="club"
                type="text"
                value={club}
                onChange={(e) => setClub(e.target.value)}
                placeholder="461"
              />
              <p className="text-sm text-muted-foreground">
                {t(texts, "helper.clubs", "114 = FK Göingarna, 461 = FK Åsen")}
              </p>
              {errors.club && (
                <Alert variant="destructive">
                  <AlertDescription>{errors.club}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="personId">{t(texts, "label.personId", "Person ID")} (frivilligt)</Label>
              <Input
                id="personId"
                type="text"
                value={personId}
                onChange={(e) => setPersonId(e.target.value)}
                placeholder="30785"
              />
              {errors.personId && (
                <Alert variant="destructive">
                  <AlertDescription>{errors.personId}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">{t(texts, "label.year", "År")} (frivilligt)</Label>
              <Input
                id="year"
                type="text"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2024"
              />
              {errors.year && (
                <Alert variant="destructive">
                  <AlertDescription>{errors.year}</AlertDescription>
                </Alert>
              )}
            </div>

            <Button 
              onClick={handleGenerateCsv}
              disabled={!isFormValid || isGenerating}
              className="w-full"
            >
              {isGenerating 
                ? t(texts, "text.fetching", "Hämtar data...")
                : t(texts, "button.generateCsv", "Generera CSV")
              }
            </Button>

            {errors.general && (
              <Alert variant="destructive">
                <AlertDescription>{errors.general}</AlertDescription>
              </Alert>
            )}

            {rowCount !== null && (
              <Alert>
                <AlertDescription>
                  {t(texts, "text.rowsFound", `${rowCount} rader hittades`)}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default Export;