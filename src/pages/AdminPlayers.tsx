import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Player {
  id: string;
  full_name: string;
  position: string | null;
  avatar_url: string | null;
}

const AdminPlayers = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', position: '' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name');
    
    if (data) {
      setPlayers(data);
    }
    setLoading(false);
  };

  const handleEditPlayer = async () => {
    if (!editingPlayer) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: editForm.full_name,
        position: editForm.position,
      })
      .eq('id', editingPlayer.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update player profile',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Player profile updated successfully',
      });
      setDialogOpen(false);
      setEditingPlayer(null);
      fetchPlayers();
    }
  };

  const handleDeletePlayer = async (playerId: string, playerName: string) => {
    if (!confirm(`Are you sure you want to delete ${playerName}? This will permanently delete their account and all associated data.`)) {
      return;
    }

    try {
      // First delete the profile (this will cascade to player_stats)
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', playerId);

      if (profileError) throw profileError;

      // Delete the auth user
      const { error: authError } = await supabase.auth.admin.deleteUser(playerId);
      
      if (authError) throw authError;

      toast({
        title: 'Success',
        description: 'Player and account deleted permanently',
      });
      fetchPlayers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete player',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (player: Player) => {
    setEditingPlayer(player);
    setEditForm({
      full_name: player.full_name,
      position: player.position || '',
    });
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Manage Players</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {players.map((player) => (
            <div
              key={player.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-4">
                <img
                  src={player.avatar_url || 'https://via.placeholder.com/40'}
                  alt={player.full_name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <p className="font-medium">{player.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {player.position || 'No position'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(player)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeletePlayer(player.id, player.full_name)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Player Profile</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-position">Position</Label>
                <Input
                  id="edit-position"
                  value={editForm.position}
                  onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                />
              </div>
              <Button onClick={handleEditPlayer} className="w-full">
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default AdminPlayers;
