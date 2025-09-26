import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAppTexts, t } from "@/hooks/useAppTexts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { data: texts } = useAppTexts("index", [
    "title.home",
    "link.club461",
    "link.results",
    "intro.home",
  ]);

  const { data: club461 } = useQuery({
    queryKey: ["club-name", 461],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_club_name", { _club: 461 });
      if (error) throw error;
      return data?.[0];
    },
  });

  const { data: club114 } = useQuery({
    queryKey: ["club-name", 114],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_club_name", { _club: 114 });
      if (error) throw error;
      return data?.[0];
    },
  });

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <Helmet>
        <title>{t(texts, "title.home", "Startsida")} | Vandringspris</title>
        <meta name="description" content="Startsida med länkar till Vandringspris och Resultatstatistik" />
        <link rel="canonical" href="/" />
      </Helmet>
      <nav className="text-center space-y-4">
        <h1 className="text-3xl font-semibold">{t(texts, "title.home", "Startsida")}</h1>
        <p className="text-muted-foreground">{t(texts, "intro.home", "Välj en sida nedan.")}</p>
        <div className="flex flex-col items-center gap-2">
          <Link className="underline text-primary" to="/index114">
            {club114?.clubname ? `Vandringspris – ${club114.clubname}` : "Vandringspris – Club 114"}
          </Link>
          <Link className="underline text-primary" to="/results-statistics">
            {t(texts, "link.results", "Resultatstatistik")}
          </Link>
          <Link className="underline text-primary" to="/export">
            Export
          </Link>
          <Link className="underline text-primary" to="/lok-support">
            Tävlingar för LOK-stöd
          </Link>
        </div>
        <div className="mt-6 text-sm text-muted-foreground max-w-2xl">
          <p className="mb-3">
            Denna sida är byggd av David. Den hämtar data från Eventor för FK Göingarna.
          </p>
          <p className="mb-3">
            Sidan Vandringspris presenterar data som skulle kunna användas som underlag för att ge ut vandringspris.
          </p>
          <p className="mb-3">
            Resultatstatistik och Export kan användas för data för enskilda personer eller hela klubben.
          </p>
          <p>
            Sidan för LOK-stöd hjälper till att hitta tävlingar som ska LOK-rapporteras.
          </p>
        </div>
      </nav>
    </main>
  );
};

export default Index;
