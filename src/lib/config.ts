export type ConfigSource = "VITE" | "runtime" | "localStorage" | "missing";

const LS_KEYS = {
  supabaseUrl: "vandringspris.supabaseUrl",
  supabaseAnonKey: "vandringspris.supabaseAnonKey",
  proxyBaseUrl: "vandringspris.proxyBaseUrl",
} as const;

function readEnv(name: string): string | undefined {
  try {
    const v = (import.meta as any).env?.[name];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  } catch {}
  return undefined;
}

function readRuntime(name: string): string | undefined {
  try {
    const cfg = (window as any).__RUNTIME_CONFIG ?? {};
    const v = cfg?.[name];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  } catch {}
  return undefined;
}

export function getSupabaseConfig(): {
  url?: string;
  anonKey?: string;
  source: ConfigSource;
} {
  const envUrl = readEnv("VITE_SUPABASE_URL");
  const envKey = readEnv("VITE_SUPABASE_ANON_KEY");
  const rtUrl = readRuntime("SUPABASE_URL");
  const rtKey = readRuntime("SUPABASE_ANON_KEY");
  const lsUrl = typeof localStorage !== "undefined" ? localStorage.getItem(LS_KEYS.supabaseUrl) ?? undefined : undefined;
  const lsKey = typeof localStorage !== "undefined" ? localStorage.getItem(LS_KEYS.supabaseAnonKey) ?? undefined : undefined;

  // Priority: VITE > runtime-config.json > localStorage
  if (envUrl && envKey) return { url: envUrl, anonKey: envKey, source: "VITE" };
  if (rtUrl && rtKey) return { url: rtUrl, anonKey: rtKey, source: "runtime" };
  if (lsUrl && lsKey) return { url: lsUrl, anonKey: lsKey, source: "localStorage" };

  // Partial availability: prefer runtime values over localStorage when mixing
  if (!envUrl || !envKey) {
    if (rtUrl && rtKey) return { url: rtUrl, anonKey: rtKey, source: "runtime" };
    if (lsUrl && lsKey) return { url: lsUrl, anonKey: lsKey, source: "localStorage" };
  }

  return { url: envUrl || rtUrl || lsUrl, anonKey: envKey || rtKey || lsKey, source: "missing" };
}

export function getProxyBaseUrl(): { url?: string; source: ConfigSource } {
  const envProxy = readEnv("VITE_PROXY_BASE_URL");
  const rtProxy = readRuntime("PROXY_BASE_URL");
  const lsProxy = typeof localStorage !== "undefined" ? localStorage.getItem(LS_KEYS.proxyBaseUrl) ?? undefined : undefined;
  if (envProxy) return { url: envProxy, source: "VITE" };
  if (rtProxy) return { url: rtProxy, source: "runtime" };
  if (lsProxy) return { url: lsProxy, source: "localStorage" };
  return { url: undefined, source: "missing" };
}

export function hasSupabaseConfig(): boolean {
  const cfg = getSupabaseConfig();
  return !!(cfg.url && cfg.anonKey);
}

export function saveConfigToLocalStorage(params: { supabaseUrl?: string; supabaseAnonKey?: string; proxyBaseUrl?: string }) {
  if (typeof localStorage === "undefined") return;
  if (params.supabaseUrl != null) localStorage.setItem(LS_KEYS.supabaseUrl, params.supabaseUrl);
  if (params.supabaseAnonKey != null) localStorage.setItem(LS_KEYS.supabaseAnonKey, params.supabaseAnonKey);
  if (params.proxyBaseUrl != null) localStorage.setItem(LS_KEYS.proxyBaseUrl, params.proxyBaseUrl);
}

export function clearConfigInLocalStorage() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(LS_KEYS.supabaseUrl);
  localStorage.removeItem(LS_KEYS.supabaseAnonKey);
  localStorage.removeItem(LS_KEYS.proxyBaseUrl);
}

export function configSourceLabel(): string {
  const supa = getSupabaseConfig();
  if (supa.source === "VITE") return "VITE";
  if (supa.source === "runtime") return "runtime-config.json";
  if (supa.source === "localStorage") return "localStorage";
  return "missing";
}
