import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, Edit, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { z } from 'zod';

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  event_date: string;
  location: string | null;
}

const AdminSchedule = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    event_type: 'training',
    event_date: '',
    location: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data } = await supabase
      .from('schedule')
      .select('*')
      .order('event_date');
    
    if (data) {
      setEvents(data);
    }
    setLoading(false);
  };

  const handleSaveEvent = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Validate event inputs
    const eventSchema = z.object({
      title: z.string().trim().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
      description: z.string().trim().max(500, 'Description must be less than 500 characters').optional(),
      event_type: z.enum(['match', 'training', 'event']),
      event_date: z.string().min(1, 'Date is required'),
      location: z.string().trim().max(200, 'Location must be less than 200 characters').optional(),
    });

    try {
      const validated = eventSchema.parse(eventForm);

      if (isCreating) {
        const { error } = await supabase
          .from('schedule')
          .insert({
            title: validated.title,
            description: validated.description || null,
            event_type: validated.event_type,
            event_date: validated.event_date,
            location: validated.location || null,
            created_by: user.id,
          });

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Event created successfully',
        });
        setDialogOpen(false);
        fetchEvents();
        resetForm();
      } else if (editingEvent) {
        const { error } = await supabase
          .from('schedule')
          .update({
            title: validated.title,
            description: validated.description || null,
            event_type: validated.event_type,
            event_date: validated.event_date,
            location: validated.location || null,
          })
          .eq('id', editingEvent.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Event updated successfully',
        });
        setDialogOpen(false);
        setEditingEvent(null);
        fetchEvents();
        resetForm();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save event',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteEvent = async (eventId: string, eventTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${eventTitle}"?`)) {
      return;
    }

    const { error } = await supabase
      .from('schedule')
      .delete()
      .eq('id', eventId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete event',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Event deleted successfully',
      });
      fetchEvents();
    }
  };

  const openEditDialog = (event: Event) => {
    setIsCreating(false);
    setEditingEvent(event);
    setEventForm({
      title: event.title,
      description: event.description || '',
      event_type: event.event_type,
      event_date: new Date(event.event_date).toISOString().slice(0, 16),
      location: event.location || '',
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setIsCreating(true);
    setEditingEvent(null);
    resetForm();
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEventForm({
      title: '',
      description: '',
      event_type: 'training',
      event_date: '',
      location: '',
    });
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
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Manage Schedule</CardTitle>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Event
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div>
                <p className="font-medium">{event.title}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(event.event_date).toLocaleString()} • {event.event_type}
                </p>
                {event.location && (
                  <p className="text-sm text-muted-foreground">{event.location}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(event)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteEvent(event.id, event.title)}
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
              <DialogTitle>
                {isCreating ? 'Create New Event' : 'Edit Event'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event_type">Type</Label>
                <Select
                  value={eventForm.event_type}
                  onValueChange={(value) => setEventForm({ ...eventForm, event_type: value })}
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
                  value={eventForm.event_date}
                  onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                />
              </div>
              <Button onClick={handleSaveEvent} className="w-full">
                {isCreating ? 'Create Event' : 'Save Changes'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default AdminSchedule;
