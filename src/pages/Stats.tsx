import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, Trophy, Users } from 'lucide-react';

interface TeamStats {
  wins: number;
  losses: number;
  draws: number;
}

interface PlayerStat {
  id: string;
  goals: number;
  assists: number;
  games_played: number;
  profiles: {
    full_name: string;
  } | { full_name: string }[] | null;
}

const Stats = () => {
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      // Fetch team stats
      const { data: team } = await supabase
        .from('team_stats')
        .select('*')
        .single();

      if (team) {
        setTeamStats(team);
      }

      // Fetch player stats
      const { data: players } = await supabase
        .from('player_stats')
        .select(`
          *,
          profiles!player_stats_user_id_fkey (full_name)
        `)
        .order('goals', { ascending: false });

      if (players) {
        setPlayerStats(players as any);
      }

      setLoading(false);
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalGames = teamStats ? teamStats.wins + teamStats.losses + teamStats.draws : 0;
  const winRate = totalGames > 0 && teamStats ? ((teamStats.wins / totalGames) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Team Statistics</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Games</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalGames}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {teamStats?.wins}W - {teamStats?.draws}D - {teamStats?.losses}L
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{winRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Overall performance
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Goals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {playerStats.reduce((sum, p) => sum + p.goals, 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Team total
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Player Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Player</th>
                  <th className="text-center p-2">Goals</th>
                  <th className="text-center p-2">Assists</th>
                  <th className="text-center p-2">Games</th>
                </tr>
              </thead>
              <tbody>
                {playerStats.map((player) => (
                  <tr key={player.id} className="border-b hover:bg-muted/50 transition-smooth">
                    <td className="p-2 font-medium">{Array.isArray(player.profiles) ? player.profiles[0]?.full_name : player.profiles?.full_name || 'Unknown'}</td>
                    <td className="text-center p-2">{player.goals}</td>
                    <td className="text-center p-2">{player.assists}</td>
                    <td className="text-center p-2">{player.games_played}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Stats;
