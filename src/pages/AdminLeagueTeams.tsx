import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Pencil, Trash2, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { z } from 'zod';

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

const teamSchema = z.object({
  name: z.string().trim().min(1, "Team name is required").max(100, "Team name must be less than 100 characters"),
  wins: z.number().int().min(0).max(1000),
  losses: z.number().int().min(0).max(1000),
  draws: z.number().int().min(0).max(1000),
  goals_for: z.number().int().min(0).max(10000),
  goals_against: z.number().int().min(0).max(10000),
});

const AdminLeagueTeams = () => {
  const [teams, setTeams] = useState<LeagueTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<LeagueTeam | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    wins: 0,
    losses: 0,
    draws: 0,
    goals_for: 0,
    goals_against: 0,
    logo_file: null as File | null,
  });

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('league_teams')
      .select('*')
      .order('wins', { ascending: false });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch league teams',
        variant: 'destructive',
      });
    } else if (data) {
      setTeams(data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validate form data
      const validated = teamSchema.parse({
        name: formData.name,
        wins: formData.wins,
        losses: formData.losses,
        draws: formData.draws,
        goals_for: formData.goals_for,
        goals_against: formData.goals_against,
      });

      let logo_url = editingTeam?.logo_url || null;

      // Upload logo if provided
      if (formData.logo_file) {
        setUploading(true);
        const fileExt = formData.logo_file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('team-logos')
          .upload(fileName, formData.logo_file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('team-logos')
          .getPublicUrl(fileName);

        logo_url = urlData.publicUrl;
        setUploading(false);
      }

      if (editingTeam) {
        // Update existing team
        const { error } = await supabase
          .from('league_teams')
          .update({
            ...validated,
            logo_url,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingTeam.id);

        if (error) throw error;

        toast({
          title: 'Team updated',
          description: 'The team has been updated successfully.',
        });
      } else {
        // Create new team
        const insertData: any = {
          ...validated,
        };
        if (logo_url) {
          insertData.logo_url = logo_url;
        }
        
        const { error } = await supabase
          .from('league_teams')
          .insert(insertData);

        if (error) throw error;

        toast({
          title: 'Team created',
          description: 'The team has been created successfully.',
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchTeams();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: error.message || 'Failed to save team',
          variant: 'destructive',
        });
      }
    }
  };

  const handleEdit = (team: LeagueTeam) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      wins: team.wins,
      losses: team.losses,
      draws: team.draws,
      goals_for: team.goals_for,
      goals_against: team.goals_against,
      logo_file: null,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return;

    try {
      const { error } = await supabase
        .from('league_teams')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Team deleted',
        description: 'The team has been deleted successfully.',
      });

      fetchTeams();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete team',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      wins: 0,
      losses: 0,
      draws: 0,
      goals_for: 0,
      goals_against: 0,
      logo_file: null,
    });
    setEditingTeam(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold">League Teams</h3>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button variant="accent">
              <Plus className="h-4 w-4 mr-2" />
              Add Team
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingTeam ? 'Edit Team' : 'Add New Team'}</DialogTitle>
              <DialogDescription>
                {editingTeam ? 'Update team information' : 'Add a new team to the league'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Team Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Team name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo">Team Logo</Label>
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFormData({ ...formData, logo_file: e.target.files?.[0] || null })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="wins">Wins</Label>
                  <Input
                    id="wins"
                    type="number"
                    min="0"
                    value={formData.wins}
                    onChange={(e) => setFormData({ ...formData, wins: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="losses">Losses</Label>
                  <Input
                    id="losses"
                    type="number"
                    min="0"
                    value={formData.losses}
                    onChange={(e) => setFormData({ ...formData, losses: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="draws">Draws</Label>
                <Input
                  id="draws"
                  type="number"
                  min="0"
                  value={formData.draws}
                  onChange={(e) => setFormData({ ...formData, draws: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="goals_for">Goals For</Label>
                  <Input
                    id="goals_for"
                    type="number"
                    min="0"
                    value={formData.goals_for}
                    onChange={(e) => setFormData({ ...formData, goals_for: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goals_against">Goals Against</Label>
                  <Input
                    id="goals_against"
                    type="number"
                    min="0"
                    value={formData.goals_against}
                    onChange={(e) => setFormData({ ...formData, goals_against: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <Button type="submit" variant="accent" className="w-full" disabled={uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  editingTeam ? 'Update Team' : 'Add Team'
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {teams.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">No teams yet. Add your first team!</p>
            </CardContent>
          </Card>
        ) : (
          teams.map((team) => (
            <Card key={team.id} className="shadow-card">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  {team.logo_url ? (
                    <img
                      src={team.logo_url}
                      alt={`${team.name} logo`}
                      className="h-12 w-12 object-contain rounded"
                    />
                  ) : (
                    <div className="h-12 w-12 bg-muted rounded flex items-center justify-center text-muted-foreground text-xs">
                      No Logo
                    </div>
                  )}
                  <div>
                    <h4 className="font-semibold text-lg">{team.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {team.wins}W - {team.draws}D - {team.losses}L | GF: {team.goals_for} GA: {team.goals_against}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(team)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(team.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminLeagueTeams;
