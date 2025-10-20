import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Calendar, MapPin, Plus, Loader2, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  event_date: string;
  location: string | null;
  created_at: string;
}

const Schedule = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_type: 'training',
    event_date: '',
    location: '',
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
    };

    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from('schedule')
        .select('*')
        .order('event_date', { ascending: true });

      if (error) {
        console.error('Error fetching events:', error);
      } else {
        setEvents(data || []);
      }
      setLoading(false);
    };

    checkAdmin();
    fetchEvents();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('schedule-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedule'
        },
        () => {
          fetchEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('schedule')
        .insert({
          ...newEvent,
          created_by: user?.id,
        });

      if (error) throw error;

      toast({
        title: 'Event created',
        description: 'The event has been added to the schedule.',
      });

      setDialogOpen(false);
      setNewEvent({
        title: '',
        description: '',
        event_type: 'training',
        event_date: '',
        location: '',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create event',
        variant: 'destructive',
      });
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'match':
        return 'bg-accent text-accent-foreground';
      case 'training':
        return 'bg-primary text-primary-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
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
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Team Schedule</h2>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="accent">
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Event</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event_type">Type</Label>
                  <Select
                    value={newEvent.event_type}
                    onValueChange={(value) => setNewEvent({ ...newEvent, event_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="match">Match</SelectItem>
                      <SelectItem value="training">Training</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event_date">Date & Time</Label>
                  <Input
                    id="event_date"
                    type="datetime-local"
                    value={newEvent.event_date}
                    onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <Button type="submit" variant="accent" className="w-full">
                  Create Event
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4">
        {events.map((event) => (
          <Card key={event.id} className="shadow-card hover:shadow-elevated transition-smooth">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-2xl">{event.title}</CardTitle>
                  <Badge className={getEventTypeColor(event.event_type)}>
                    {event.event_type.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {event.description && (
                <p className="text-muted-foreground">{event.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(event.event_date), 'MMM dd, yyyy')}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {format(new Date(event.event_date), 'HH:mm')}
                </div>
                {event.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {event.location}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {events.length === 0 && (
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center justify-center h-64">
            <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">No events scheduled</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Schedule;
