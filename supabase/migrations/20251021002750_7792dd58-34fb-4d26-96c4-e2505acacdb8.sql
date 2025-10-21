-- Add goals_against to team_stats
ALTER TABLE public.team_stats ADD COLUMN IF NOT EXISTS goals_against integer NOT NULL DEFAULT 0;

-- Insert admin role for jimmy.carrasco@gmail.com
-- First, we need to ensure the user exists and then grant admin role
-- This will be handled after user signs up, but we'll create a policy to allow it

-- Add goals_for column as well for better stats tracking
ALTER TABLE public.team_stats ADD COLUMN IF NOT EXISTS goals_for integer NOT NULL DEFAULT 0;

-- Add trigger to schedule table for updated_at
CREATE OR REPLACE FUNCTION public.handle_schedule_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_schedule_updated_at ON public.schedule;
CREATE TRIGGER update_schedule_updated_at
  BEFORE UPDATE ON public.schedule
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_schedule_updated_at();

-- Add policies for admins to delete and update profiles
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));