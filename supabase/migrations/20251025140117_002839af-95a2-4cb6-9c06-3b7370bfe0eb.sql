-- Create polls table
CREATE TABLE public.polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  options TEXT[] NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Polls are viewable by authenticated users"
ON public.polls
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create polls"
ON public.polls
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Poll creators can delete their polls"
ON public.polls
FOR DELETE
USING (auth.uid() = created_by);

-- Create poll_votes table
CREATE TABLE public.poll_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

-- Enable RLS
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Poll votes are viewable by authenticated users"
ON public.poll_votes
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can vote on polls"
ON public.poll_votes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vote"
ON public.poll_votes
FOR UPDATE
USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;