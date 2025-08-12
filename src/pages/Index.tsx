import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAppTexts, t } from "@/hooks/useAppTexts";

const Index = () => {
  const { data: texts } = useAppTexts("index", [
    "title.home",
    "link.club461",
    "link.results",
    "link.warnings",
    "intro.home",
  ]);

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
          <Link className="underline text-primary" to="/index461">
            {t(texts, "link.club461", "Vandringspris – FK Åsen")}
          </Link>
          <Link className="underline text-primary" to="/results-statistics">
            {t(texts, "link.results", "Resultatstatistik")}
          </Link>
          <Link className="underline text-primary" to="/warnings">
            {t(texts, "link.warnings", "Varningar")}
          </Link>
        </div>
      </nav>
    </main>
  );
};

export default Index;
