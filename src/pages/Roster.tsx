import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserCircle } from 'lucide-react';

interface Player {
  id: string;
  full_name: string;
  position: string | null;
  avatar_url: string | null;
  created_at: string;
}

const Roster = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlayers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching players:', error);
      } else {
        setPlayers(data || []);
      }
      setLoading(false);
    };

    fetchPlayers();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          fetchPlayers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Team Roster</h2>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {players.length} Players
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {players.map((player) => (
          <Card key={player.id} className="shadow-card hover:shadow-elevated transition-smooth">
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={player.avatar_url || ''} alt={player.full_name} />
                  <AvatarFallback>
                    <UserCircle className="h-12 w-12" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-xl">{player.full_name}</CardTitle>
                  {player.position && (
                    <Badge variant="outline" className="mt-1">
                      {player.position}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {players.length === 0 && (
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center justify-center h-64">
            <UserCircle className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">No players yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Roster;
