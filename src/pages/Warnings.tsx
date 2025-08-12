import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { hasSupabaseConfig } from "@/lib/config";
import { useAppTexts, t } from "@/hooks/useAppTexts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

interface WarningRow {
  id: string;
  hide: number | null;
  created: string | null;
  organisationid: number | null;
  eventid: number | null;
  eventraceid: number | null;
  message: string | null;
  personid: number | null;
  clubparticipation: number | null;
  batchid: string | null;
}

const Warnings = () => {
  const { toast } = useToast();
  const [includeHidden, setIncludeHidden] = useState(false);
  const [modified, setModified] = useState<Record<string, 1 | null>>({});
  const configReady = hasSupabaseConfig();

  const { data: texts } = useAppTexts("warnings", [
    "page.warnings.title",
    "page.warnings.includeHidden",
    "page.warnings.save",
    "page.warnings.noData",
    "page.warnings.loadError",
    "page.warnings.saveSuccess",
    "page.warnings.saveError",
  ]);

  const query = useQuery<WarningRow[]>({
    queryKey: ["warnings", { includeHidden }],
    enabled: configReady,
    queryFn: async () => {
      let q = supabase
        .from("warnings")
        .select(
          "id, hide, created, organisationid, eventid, eventraceid, message, personid, clubparticipation, batchid"
        )
        .order("created", { ascending: false });

      if (!includeHidden) {
        q = q.or("hide.is.null,hide.eq.0");
      }

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = query.data ?? [];

  const currentHide = (row: WarningRow): 1 | null => {
    const v = modified[row.id];
    if (v !== undefined) return v;
    return row.hide === 1 ? 1 : null;
  };

  const dirtyCount = useMemo(() => Object.keys(modified).length, [modified]);

  const onToggleRow = (row: WarningRow, checked: boolean) => {
    const next: 1 | null = checked ? 1 : null;
    const initial: 1 | null = row.hide === 1 ? 1 : null;
    setModified((prev) => {
      const copy = { ...prev };
      if (next === initial) {
        delete copy[row.id];
      } else {
        copy[row.id] = next;
      }
      return copy;
    });
  };

  const saveChanges = async () => {
    const entries = Object.entries(modified);
    if (entries.length === 0) return;

    const results = await Promise.allSettled(
      entries.map(([id, hideVal]) =>
        supabase.from("warnings").update({ hide: hideVal }).eq("id", id)
      )
    );

    const failures = results
      .map((r, i) => ({ r, id: entries[i][0] }))
      .filter((x) => x.r.status === "rejected" || (x.r.status === "fulfilled" && x.r.value.error));

    if (failures.length === 0) {
      toast({ description: t(texts, "page.warnings.saveSuccess", "Changes saved") });
      setModified({});
      query.refetch();
    } else {
      toast({
        description: t(texts, "page.warnings.saveError", "Some changes failed to save"),
        variant: "destructive",
      });
      query.refetch();
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <Helmet>
        <title>{t(texts, "page.warnings.title", "Warnings")} | Vandringspris</title>
        <meta name="description" content="Warnings list and editor" />
        <link rel="canonical" href="/warnings" />
      </Helmet>

      <section className="container mx-auto px-4 py-6 space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{t(texts, "page.warnings.title", "Warnings")}</h1>
          <div className="flex items-center gap-2">
            <Checkbox
              id="includeHidden"
              checked={includeHidden}
              onCheckedChange={(v) => setIncludeHidden(Boolean(v))}
            />
            <label htmlFor="includeHidden" className="text-sm text-muted-foreground">
              {t(texts, "page.warnings.includeHidden", "Include hidden (hide = 1)")}
            </label>
          </div>
        </header>

        {!configReady && (
          <div className="text-sm text-muted-foreground">
            Missing configuration. Please <Link className="underline" to="/setup">open Setup</Link>.
          </div>
        )}

        {query.isLoading && (
          <div className="text-sm text-muted-foreground">
            Loading...
          </div>
        )}

        {query.isError && (
          <div className="text-sm text-destructive">
            {t(texts, "page.warnings.loadError", "Could not load warnings")}
          </div>
        )}

        {!query.isLoading && !query.isError && rows.length === 0 && (
          <div className="text-sm text-muted-foreground">
            {t(texts, "page.warnings.noData", "No data available")}
          </div>
        )}

        {!query.isLoading && !query.isError && rows.length > 0 && (
          <div className="space-y-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>hide</TableHead>
                    <TableHead>created</TableHead>
                    <TableHead>organisationid</TableHead>
                    <TableHead>eventid</TableHead>
                    <TableHead>eventraceid</TableHead>
                    <TableHead>message</TableHead>
                    <TableHead>personid</TableHead>
                    <TableHead>clubparticipation</TableHead>
                    <TableHead>batchid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Checkbox
                          checked={currentHide(row) === 1}
                          onCheckedChange={(v) => onToggleRow(row, Boolean(v))}
                          aria-label="Toggle hide"
                        />
                      </TableCell>
                      <TableCell>{row.created ?? ""}</TableCell>
                      <TableCell>{row.organisationid ?? ""}</TableCell>
                      <TableCell>{row.eventid ?? ""}</TableCell>
                      <TableCell>{row.eventraceid ?? ""}</TableCell>
                      <TableCell className="max-w-[500px] truncate" title={row.message ?? undefined}>{row.message ?? ""}</TableCell>
                      <TableCell>{row.personid ?? ""}</TableCell>
                      <TableCell>{row.clubparticipation ?? ""}</TableCell>
                      <TableCell className="max-w-[360px] truncate" title={row.batchid ?? undefined}>{row.batchid ?? ""}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-end">
              <Button onClick={saveChanges} disabled={dirtyCount === 0 || query.isLoading || !configReady}>
                {t(texts, "page.warnings.save", "Save changes")} {dirtyCount > 0 ? `(${dirtyCount})` : ""}
              </Button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
};

export default Warnings;
