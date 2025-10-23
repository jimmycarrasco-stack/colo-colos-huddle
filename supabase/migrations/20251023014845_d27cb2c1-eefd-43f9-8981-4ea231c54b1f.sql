-- Add foreign key from player_stats to profiles for proper relationship queries
ALTER TABLE public.player_stats
ADD CONSTRAINT player_stats_user_id_fkey_profiles
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;