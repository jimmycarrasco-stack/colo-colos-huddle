import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, Circle, BarChart3 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserCircle } from 'lucide-react';

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
  profiles: {
    full_name: string;
    avatar_url: string | null;
  } | null;
}

export const PollCard = ({ poll }: PollCardProps) => {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [userVote, setUserVote] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);
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
      .select(`
        option_index, 
        user_id,
        profiles (
          full_name,
          avatar_url
        )
      `)
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
  const getVotersForOption = (optionIndex: number) =>
    votes.filter(v => v.option_index === optionIndex);

  return (
    <Card className="p-4 max-w-md">
      <h3 className="font-semibold mb-3">{poll.question}</h3>
      <div className="space-y-2">
        {poll.options.map((option, index) => {
          const voteCount = getVoteCount(index);
          const percentage = getVotePercentage(index);
          const isSelected = userVote === index;
          const voters = getVotersForOption(index);

          return (
            <div key={index}>
              <Button
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
              {voters.length > 0 && (
                <div className="mt-1 ml-3 flex flex-wrap gap-1">
                  {voters.slice(0, 3).map((vote, idx) => (
                    <span key={idx} className="text-xs text-muted-foreground">
                      {vote.profiles?.full_name || 'Unknown'}
                      {idx < Math.min(voters.length - 1, 2) ? ',' : ''}
                    </span>
                  ))}
                  {voters.length > 3 && (
                    <span className="text-xs text-muted-foreground">
                      +{voters.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="flex items-center justify-between mt-3">
        <p className="text-xs text-muted-foreground">
          {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
        </p>
        
        <Dialog open={showResults} onOpenChange={setShowResults}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8">
              <BarChart3 className="h-4 w-4 mr-2" />
              View Results
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{poll.question}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {poll.options.map((option, index) => {
                const voters = getVotersForOption(index);
                const percentage = getVotePercentage(index);
                
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{option}</span>
                      <span className="text-sm text-muted-foreground">
                        {voters.length} ({percentage}%)
                      </span>
                    </div>
                    {voters.length > 0 ? (
                      <div className="space-y-2 pl-2">
                        {voters.map((vote, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={vote.profiles?.avatar_url || ''} />
                              <AvatarFallback>
                                <UserCircle className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">
                              {vote.profiles?.full_name || 'Unknown'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground pl-2">No votes yet</p>
                    )}
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
};
