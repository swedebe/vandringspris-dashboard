import { Link } from "react-router-dom";
import { configSourceLabel, hasSupabaseConfig } from "@/lib/config";

export default function ConfigBanner() {
  const hasConfig = hasSupabaseConfig();
  const isDev = import.meta.env.DEV;
  const source = configSourceLabel();

  if (!hasConfig) {
    return (
      <div className="w-full text-center text-xs py-1 bg-muted text-foreground">
        Konfiguration saknas. Gå till <Link to="/setup" className="underline text-primary">Setup</Link> för att ange Supabase och Proxy.
      </div>
    );
  }

  if (isDev) {
    return (
      <div className="w-full text-center text-xs py-1 bg-muted text-foreground">
        Config source: {source}
      </div>
    );
  }
  return null;
}
