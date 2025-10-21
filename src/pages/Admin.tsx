import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Shield, Loader2, Award, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminPlayers from './AdminPlayers';
import AdminSchedule from './AdminSchedule';

interface Player {
  id: string;
  full_name: string;
}

const Admin = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();

  const [teamStats, setTeamStats] = useState({
    wins: 0,
    losses: 0,
    draws: 0,
    goals_for: 0,
    goals_against: 0,
  });

  const [playerStatUpdate, setPlayerStatUpdate] = useState({
    player_id: '',
    goals: 0,
    assists: 0,
    games_played: 0,
  });

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      setIsAdmin(!!data);
      
      if (data) {
        // Fetch players
        const { data: playersData } = await supabase
          .from('profiles')
          .select('id, full_name');
        
        if (playersData) {
          setPlayers(playersData);
        }

        // Fetch current team stats
        const { data: statsData } = await supabase
          .from('team_stats')
          .select('*')
          .single();

        if (statsData) {
          setTeamStats({
            wins: statsData.wins,
            losses: statsData.losses,
            draws: statsData.draws,
            goals_for: statsData.goals_for || 0,
            goals_against: statsData.goals_against || 0,
          });
        }
      }
      
      setLoading(false);
    };

    checkAdmin();
  }, [user]);

  const handleUpdateTeamStats = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('team_stats')
        .update({
          ...teamStats,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', (await supabase.from('team_stats').select('id').single()).data?.id);

      if (error) throw error;

      toast({
        title: 'Team stats updated',
        description: 'The team statistics have been updated successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update team stats',
        variant: 'destructive',
      });
    }
  };

  const handleUpdatePlayerStats = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!playerStatUpdate.player_id) {
      toast({
        title: 'Error',
        description: 'Please select a player',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('player_stats')
        .update({
          goals: playerStatUpdate.goals,
          assists: playerStatUpdate.assists,
          games_played: playerStatUpdate.games_played,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', playerStatUpdate.player_id);

      if (error) throw error;

      toast({
        title: 'Player stats updated',
        description: 'The player statistics have been updated successfully.',
      });

      setPlayerStatUpdate({
        player_id: '',
        goals: 0,
        assists: 0,
        games_played: 0,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update player stats',
        variant: 'destructive',
      });
    }
  };

  const handleGrantAdmin = async () => {
    if (!selectedPlayer) {
      toast({
        title: 'Error',
        description: 'Please select a player',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: selectedPlayer,
          role: 'admin',
          granted_by: user?.id,
        });

      if (error) throw error;

      toast({
        title: 'Admin access granted',
        description: 'The player now has admin privileges.',
      });

      setSelectedPlayer('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to grant admin access',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Card className="shadow-card">
        <CardContent className="flex flex-col items-center justify-center h-64">
          <Shield className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-lg text-muted-foreground">Admin access required</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-8 w-8" />
        <h2 className="text-3xl font-bold">Admin Controls</h2>
      </div>

      <Tabs defaultValue="stats" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="players">Players</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Update Team Stats
            </CardTitle>
            <CardDescription>Modify team performance statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateTeamStats} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wins">Wins</Label>
                <Input
                  id="wins"
                  type="number"
                  min="0"
                  value={teamStats.wins}
                  onChange={(e) => setTeamStats({ ...teamStats, wins: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="losses">Losses</Label>
                <Input
                  id="losses"
                  type="number"
                  min="0"
                  value={teamStats.losses}
                  onChange={(e) => setTeamStats({ ...teamStats, losses: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="draws">Draws</Label>
                <Input
                  id="draws"
                  type="number"
                  min="0"
                  value={teamStats.draws}
                  onChange={(e) => setTeamStats({ ...teamStats, draws: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goals_for">Goals For</Label>
                <Input
                  id="goals_for"
                  type="number"
                  min="0"
                  value={teamStats.goals_for}
                  onChange={(e) => setTeamStats({ ...teamStats, goals_for: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goals_against">Goals Against</Label>
                <Input
                  id="goals_against"
                  type="number"
                  min="0"
                  value={teamStats.goals_against}
                  onChange={(e) => setTeamStats({ ...teamStats, goals_against: parseInt(e.target.value) || 0 })}
                />
              </div>
              <Button type="submit" variant="accent" className="w-full">
                Update Team Stats
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Update Player Stats
            </CardTitle>
            <CardDescription>Modify individual player statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePlayerStats} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="player">Player</Label>
                <Select
                  value={playerStatUpdate.player_id}
                  onValueChange={(value) => setPlayerStatUpdate({ ...playerStatUpdate, player_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a player" />
                  </SelectTrigger>
                  <SelectContent>
                    {players.map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="goals">Goals</Label>
                <Input
                  id="goals"
                  type="number"
                  min="0"
                  value={playerStatUpdate.goals}
                  onChange={(e) => setPlayerStatUpdate({ ...playerStatUpdate, goals: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assists">Assists</Label>
                <Input
                  id="assists"
                  type="number"
                  min="0"
                  value={playerStatUpdate.assists}
                  onChange={(e) => setPlayerStatUpdate({ ...playerStatUpdate, assists: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="games">Games Played</Label>
                <Input
                  id="games"
                  type="number"
                  min="0"
                  value={playerStatUpdate.games_played}
                  onChange={(e) => setPlayerStatUpdate({ ...playerStatUpdate, games_played: parseInt(e.target.value) || 0 })}
                />
              </div>
              <Button type="submit" variant="accent" className="w-full">
                Update Player Stats
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
        </TabsContent>

        <TabsContent value="players">
          <AdminPlayers />
        </TabsContent>

        <TabsContent value="schedule">
          <AdminSchedule />
        </TabsContent>

        <TabsContent value="roles">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Grant Admin Access
              </CardTitle>
              <CardDescription>Give admin privileges to a player</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-player">Select Player</Label>
                <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a player" />
                  </SelectTrigger>
                  <SelectContent>
                    {players.map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleGrantAdmin} variant="accent" className="w-full">
                Grant Admin Access
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
