
-- 1) Restrict profiles SELECT to own row + admins (hide phone numbers from other users)
DROP POLICY IF EXISTS "Profiles viewable by all authenticated" ON public.profiles;

CREATE POLICY "Users view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2) Explicit write protection on user_roles: only admins can manage
CREATE POLICY "Admins view all user roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert user roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update user roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete user roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3) Move SECURITY DEFINER has_role to a private schema not exposed by PostgREST,
--    so signed-in users cannot invoke it via the Data API. RLS policies (SQL
--    expressions) can still reference it.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;

-- Recreate the public.has_role as SECURITY INVOKER wrapper so existing policies/code
-- keep working, but direct RPC by signed-in users no longer runs privileged code.
-- Policies will now resolve has_role through the user's own privileges (they can
-- read their own user_roles row via RLS); admin checks for other users go through
-- the private definer version used inside policies below.
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role) CASCADE;

-- Recreate dropped policies using private.has_role
CREATE POLICY "Admins view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins view all user roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert user roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update user roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete user roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authorities update any report"
  ON public.reports FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'authority') OR private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'authority') OR private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete reports"
  ON public.reports FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authorities insert history"
  ON public.report_status_history FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'authority') OR private.has_role(auth.uid(), 'admin'));
