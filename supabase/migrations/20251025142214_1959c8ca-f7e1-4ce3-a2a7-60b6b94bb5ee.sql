-- Add foreign key relationship between polls and profiles
ALTER TABLE public.polls 
ADD CONSTRAINT polls_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- Add foreign key relationship between poll_votes and profiles  
ALTER TABLE public.poll_votes 
ADD CONSTRAINT poll_votes_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;