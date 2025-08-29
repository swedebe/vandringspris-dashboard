-- Add restrictive RLS policies to clubs table to protect API keys
-- Only allow service role access to the full clubs table including API keys

CREATE POLICY "Service role only access to clubs" 
ON public.clubs 
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Add a separate policy for public read access to non-sensitive data only
-- This allows the existing RPC functions to work while protecting API keys
CREATE POLICY "Public read access to club names only" 
ON public.clubs 
FOR SELECT
USING (false); -- Explicitly deny direct SELECT, force use of RPC functions