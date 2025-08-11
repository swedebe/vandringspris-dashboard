import { Link } from "react-router-dom";
import { configSourceLabel, hasSupabaseConfig } from "@/lib/config";

export default function ConfigBanner() {
  const hasConfig = hasSupabaseConfig();
  const isProd = import.meta.env.MODE === 'production';
  const source = configSourceLabel();
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const isAdmin = params.get('admin') === '1';

  if (!hasConfig) {
    return (
      <div className="w-full text-center text-xs py-1 bg-muted text-foreground">
        Konfiguration saknas. Gå till <Link to="/setup" className="underline text-primary">Setup</Link> för att ange Supabase och Proxy.
      </div>
    );
  }

  if (!isProd) {
    return (
      <div className="w-full text-center text-xs py-1 bg-muted text-foreground">
        Config source: {source} {isAdmin && <><span className="mx-2">•</span><Link to="/setup" className="underline text-primary">Setup</Link></>}
      </div>
    );
  }
  return null;
}
