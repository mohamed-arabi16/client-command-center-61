-- Fix search_path for SECURITY DEFINER functions to prevent search path injection attacks

-- Fix generate_contract_number
ALTER FUNCTION public.generate_contract_number(uuid) SET search_path TO 'public';

-- Fix get_client_by_share_token
ALTER FUNCTION public.get_client_by_share_token(text) SET search_path TO 'public';

-- Fix get_proposal_by_share_token
ALTER FUNCTION public.get_proposal_by_share_token(text) SET search_path TO 'public';

-- Fix handle_new_user
ALTER FUNCTION public.handle_new_user() SET search_path TO 'public';

-- Fix has_role
ALTER FUNCTION public.has_role(uuid, public.user_role) SET search_path TO 'public';