import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { hasSupabaseConfig } from "@/lib/config";
export type AppTexts = Record<string, string>;

export function useAppTexts(page: string, keys: string[]) {
  const enabled = hasSupabaseConfig();
  return useQuery<AppTexts>({
    queryKey: ["apptexts", page, keys],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_apptexts_get_many", {
        _page: page,
        _keys: keys,
      });
      if (error) throw error;
      const map: AppTexts = {};
      (data ?? []).forEach((row: any) => {
        map[row.key] = row.value;
      });
      return map;
    },
  });
}

export function t(texts: AppTexts | undefined, key: string, fallback: string) {
  return texts?.[key] ?? fallback;
}
