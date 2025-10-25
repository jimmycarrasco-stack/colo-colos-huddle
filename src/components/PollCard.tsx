import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, Circle } from 'lucide-react';

interface PollCardProps {
  poll: {
    id: string;
    question: string;
    options: string[];
    created_at: string;
  };
}

interface Vote {
  option_index: number;
  user_id: string;
}

export const PollCard = ({ poll }: PollCardProps) => {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [userVote, setUserVote] = useState<number | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchVotes();

    // Subscribe to vote changes
    const channel = supabase
      .channel(`poll-votes-${poll.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'poll_votes',
          filter: `poll_id=eq.${poll.id}`
        },
        () => {
          fetchVotes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [poll.id]);

  const fetchVotes = async () => {
    const { data, error } = await supabase
      .from('poll_votes')
      .select('option_index, user_id')
      .eq('poll_id', poll.id);

    if (error) {
      console.error('Error fetching votes:', error);
      return;
    }

    setVotes(data || []);
    const myVote = data?.find(v => v.user_id === user?.id);
    setUserVote(myVote ? myVote.option_index : null);
  };

  const handleVote = async (optionIndex: number) => {
    if (!user) return;

    try {
      if (userVote !== null) {
        // Update existing vote
        const { error } = await supabase
          .from('poll_votes')
          .update({ option_index: optionIndex })
          .eq('poll_id', poll.id)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Insert new vote
        const { error } = await supabase
          .from('poll_votes')
          .insert({
            poll_id: poll.id,
            user_id: user.id,
            option_index: optionIndex
          });

        if (error) throw error;
      }

      toast({
        title: 'Vote recorded',
        description: 'Your vote has been saved',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to vote',
        variant: 'destructive',
      });
    }
  };

  const totalVotes = votes.length;
  const getVoteCount = (optionIndex: number) => 
    votes.filter(v => v.option_index === optionIndex).length;
  const getVotePercentage = (optionIndex: number) => 
    totalVotes === 0 ? 0 : Math.round((getVoteCount(optionIndex) / totalVotes) * 100);

  return (
    <Card className="p-4 max-w-md">
      <h3 className="font-semibold mb-3">{poll.question}</h3>
      <div className="space-y-2">
        {poll.options.map((option, index) => {
          const voteCount = getVoteCount(index);
          const percentage = getVotePercentage(index);
          const isSelected = userVote === index;

          return (
            <Button
              key={index}
              variant={isSelected ? "default" : "outline"}
              className="w-full justify-start relative overflow-hidden h-auto py-2 px-3"
              onClick={() => handleVote(index)}
            >
              <div
                className="absolute inset-0 bg-primary/10 transition-all"
                style={{ width: `${percentage}%` }}
              />
              <div className="relative flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  {isSelected ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                  <span>{option}</span>
                </div>
                <span className="text-sm font-medium">
                  {voteCount} ({percentage}%)
                </span>
              </div>
            </Button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
      </p>
    </Card>
  );
};
