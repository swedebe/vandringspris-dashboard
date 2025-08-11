import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { saveConfigToLocalStorage, clearConfigInLocalStorage, getSupabaseConfig, getProxyBaseUrl } from "@/lib/config";
import { useAppTexts, t } from "@/hooks/useAppTexts";

export default function Setup() {
  const { data: texts } = useAppTexts("setup", [
    "title",
    "description",
    "label.supabaseUrl",
    "label.supabaseAnonKey",
    "label.proxyBaseUrl",
    "button.save",
    "button.clear",
  ]);

  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState("");
  const [proxyBaseUrl, setProxyBaseUrl] = useState("");

  useEffect(() => {
    const supa = getSupabaseConfig();
    const proxy = getProxyBaseUrl();
    setSupabaseUrl(supa.url ?? "");
    setSupabaseAnonKey(supa.anonKey ?? "");
    setProxyBaseUrl(proxy.url ?? "");
  }, []);

  const onSave = () => {
    saveConfigToLocalStorage({ supabaseUrl, supabaseAnonKey, proxyBaseUrl });
    window.location.reload();
  };

  const onClear = () => {
    clearConfigInLocalStorage();
    window.location.reload();
  };

  return (
    <main className="container mx-auto p-4 space-y-6">
      <Helmet>
        <title>{t(texts, "title", "Konfiguration – Vandringspris")}</title>
        <meta name="description" content={t(texts, "description", "Ange Supabase och Proxy-inställningar för appen.")} />
        <link rel="canonical" href="/setup" />
      </Helmet>

      <h1 className="text-3xl font-semibold">{t(texts, "title", "Konfiguration")}</h1>
      <p className="text-muted-foreground">{t(texts, "description", "Ange Supabase URL, Anon Key samt Proxy bas-URL.")}</p>

      <section className="grid gap-4 max-w-2xl">
        <div>
          <label className="block text-sm mb-1">{t(texts, "label.supabaseUrl", "Supabase URL")}</label>
          <Input value={supabaseUrl} onChange={(e) => setSupabaseUrl(e.target.value)} placeholder="https://YOUR_PROJECT.supabase.co" />
        </div>
        <div>
          <label className="block text-sm mb-1">{t(texts, "label.supabaseAnonKey", "Supabase anon key")}</label>
          <Input value={supabaseAnonKey} onChange={(e) => setSupabaseAnonKey(e.target.value)} placeholder="eyJhbGciOi..." />
        </div>
        <div>
          <label className="block text-sm mb-1">{t(texts, "label.proxyBaseUrl", "Proxy base URL")}</label>
          <Input value={proxyBaseUrl} onChange={(e) => setProxyBaseUrl(e.target.value)} placeholder="https://your-proxy.onrender.com" />
        </div>
      </section>

      <div className="flex gap-3">
        <Button onClick={onSave}>{t(texts, "button.save", "Spara & ladda om")}</Button>
        <Button variant="outline" onClick={onClear}>{t(texts, "button.clear", "Rensa & ladda om")}</Button>
      </div>
    </main>
  );
}
