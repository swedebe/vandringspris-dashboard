import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/lib/config';

const cfg = getSupabaseConfig();

function getLocalServiceRoleKey(): string | null {
  if (typeof window === 'undefined') return null;
  const k = localStorage.getItem('VP_SERVICE_ROLE_KEY');
  return k && k.trim().length > 0 ? k.trim() : null;
}

/**
 * WARNING:
 * - Do NOT commit any service key.
 * - We only read it from localStorage on YOUR machine.
 * - Remove it anytime by clearing site data or:
 *   localStorage.removeItem('VP_SERVICE_ROLE_KEY');
 */
export const supabaseAdmin =
  cfg.url && getLocalServiceRoleKey()
    ? createClient(cfg.url, getLocalServiceRoleKey()!, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
