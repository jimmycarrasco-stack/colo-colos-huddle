-- Fix user_roles visibility - restrict to admins and own roles only
DROP POLICY IF EXISTS "Roles are viewable by authenticated users" ON public.user_roles;

CREATE POLICY "Admins can view all roles" 
ON public.user_roles FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own role" 
ON public.user_roles FOR SELECT 
USING (user_id = auth.uid());