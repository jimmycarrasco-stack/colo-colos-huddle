import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, Trophy, Users, Award } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TeamStats {
  wins: number;
  losses: number;
  draws: number;
  goals_for?: number;
  goals_against?: number;
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

interface LeagueTeam {
  id: string;
  name: string;
  logo_url: string | null;
  wins: number;
  losses: number;
  draws: number;
  goals_for: number;
  goals_against: number;
}

const Stats = () => {
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStat[]>([]);
  const [leagueTeams, setLeagueTeams] = useState<LeagueTeam[]>([]);
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
          profiles (full_name)
        `)
        .order('goals', { ascending: false });

      if (players) {
        setPlayerStats(players as any);
      }

      // Fetch league standings
      const { data: leagues } = await supabase
        .from('league_teams')
        .select('*')
        .order('wins', { ascending: false });

      if (leagues) {
        setLeagueTeams(leagues);
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

  const calculatePoints = (team: LeagueTeam) => team.wins * 3 + team.draws;
  const sortedTeams = [...leagueTeams].sort((a, b) => {
    const pointsDiff = calculatePoints(b) - calculatePoints(a);
    if (pointsDiff !== 0) return pointsDiff;
    const goalDiff = (b.goals_for - b.goals_against) - (a.goals_for - a.goals_against);
    if (goalDiff !== 0) return goalDiff;
    return b.goals_for - a.goals_for;
  });

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Statistics</h2>

      <Tabs defaultValue="team" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="team">Team Stats</TabsTrigger>
          <TabsTrigger value="standings">League Standings</TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="space-y-6 mt-6">

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <CardTitle className="text-sm font-medium">Goals For</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {teamStats?.goals_for || playerStats.reduce((sum, p) => sum + p.goals, 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Goals scored
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Goals Against</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {teamStats?.goals_against || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Goals conceded
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
        </TabsContent>

        <TabsContent value="standings" className="space-y-6 mt-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                League Standings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sortedTeams.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No league teams added yet. Check back soon!
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Pos</th>
                        <th className="text-left p-2">Team</th>
                        <th className="text-center p-2">P</th>
                        <th className="text-center p-2">W</th>
                        <th className="text-center p-2">D</th>
                        <th className="text-center p-2">L</th>
                        <th className="text-center p-2">GF</th>
                        <th className="text-center p-2">GA</th>
                        <th className="text-center p-2">GD</th>
                        <th className="text-center p-2 font-bold">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTeams.map((team, index) => (
                        <tr key={team.id} className="border-b hover:bg-muted/50 transition-smooth">
                          <td className="p-2 font-medium">{index + 1}</td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              {team.logo_url ? (
                                <img
                                  src={team.logo_url}
                                  alt={`${team.name} logo`}
                                  className="h-6 w-6 object-contain"
                                />
                              ) : (
                                <div className="h-6 w-6 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                                  {team.name.substring(0, 2).toUpperCase()}
                                </div>
                              )}
                              <span className="font-medium">{team.name}</span>
                            </div>
                          </td>
                          <td className="text-center p-2">{team.wins + team.draws + team.losses}</td>
                          <td className="text-center p-2">{team.wins}</td>
                          <td className="text-center p-2">{team.draws}</td>
                          <td className="text-center p-2">{team.losses}</td>
                          <td className="text-center p-2">{team.goals_for}</td>
                          <td className="text-center p-2">{team.goals_against}</td>
                          <td className="text-center p-2">{team.goals_for - team.goals_against}</td>
                          <td className="text-center p-2 font-bold">{calculatePoints(team)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Stats;
