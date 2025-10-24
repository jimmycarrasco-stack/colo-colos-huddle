-- Create league_teams table
CREATE TABLE public.league_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  goals_for INTEGER NOT NULL DEFAULT 0,
  goals_against INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.league_teams ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "League teams are viewable by authenticated users"
ON public.league_teams
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert league teams"
ON public.league_teams
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update league teams"
ON public.league_teams
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete league teams"
ON public.league_teams
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Create storage bucket for team logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-logos', 'team-logos', true);

-- Storage policies for team logos
CREATE POLICY "Team logos are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'team-logos');

CREATE POLICY "Admins can upload team logos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'team-logos' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update team logos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'team-logos' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete team logos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'team-logos' AND has_role(auth.uid(), 'admin'));