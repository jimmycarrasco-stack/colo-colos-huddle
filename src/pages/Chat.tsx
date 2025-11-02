import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Send, Loader2, Image, UserCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { z } from 'zod';
import { PollCard } from '@/components/PollCard';
import { CreatePollDialog } from '@/components/CreatePollDialog';

interface Profile {
  full_name: string;
  avatar_url: string | null;
}

interface Message {
  id: string;
  user_id: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
  profiles: Profile | Profile[] | null;
}

interface Poll {
  id: string;
  question: string;
  options: string[];
  created_by: string;
  created_at: string;
  profiles: Profile | Profile[] | null;
}

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      setIsAdmin(!!data);
    };

    const fetchMessages = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          profiles (full_name, avatar_url)
        `)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        toast({
          title: 'Error',
          description: 'Failed to load messages',
          variant: 'destructive',
        });
      } else {
        setMessages((data || []) as any);
      }
      setLoading(false);
    };

    const fetchPolls = async () => {
      const { data, error } = await supabase
        .from('polls')
        .select(`
          *,
          profiles (full_name, avatar_url)
        `)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching polls:', error);
      } else {
        setPolls((data || []) as any);
      }
    };

    checkAdminStatus();
    fetchMessages();
    fetchPolls();

    // Subscribe to real-time messages
    const messagesChannel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          const { data } = await supabase
            .from('messages')
            .select(`
              *,
              profiles (full_name, avatar_url)
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setMessages((prev) => [...prev, data as any]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          setMessages((prev) => prev.filter(msg => msg.id !== payload.old.id));
        }
      )
      .subscribe();

    // Subscribe to real-time polls
    const pollsChannel = supabase
      .channel('polls-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'polls'
        },
        async (payload) => {
          const { data } = await supabase
            .from('polls')
            .select(`
              *,
              profiles (full_name, avatar_url)
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setPolls((prev) => [...prev, data as any]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(pollsChannel);
    };
  }, [toast]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, polls]);

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Message deleted',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete message',
        variant: 'destructive',
      });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !mediaFile) return;

    setSending(true);
    try {
      // Validate message content
      const messageSchema = z.object({
        content: z.string().max(2000, 'Message must be less than 2000 characters').optional(),
      });

      if (newMessage.trim()) {
        messageSchema.parse({ content: newMessage });
      }

      // Validate media file
      if (mediaFile) {
        if (mediaFile.size > 10 * 1024 * 1024) {
          throw new Error('Media file must be less than 10MB');
        }
        if (!mediaFile.type.startsWith('image/') && !mediaFile.type.startsWith('video/')) {
          throw new Error('Only image and video files are allowed');
        }
      }

      let mediaUrl = null;
      let mediaType = null;

      // Upload media if present
      if (mediaFile && user) {
        const fileExt = mediaFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('chat-media')
          .upload(fileName, mediaFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('chat-media')
          .getPublicUrl(fileName);

        mediaUrl = publicUrl;
        mediaType = mediaFile.type.startsWith('image/') ? 'image' : 'video';
      }

      const { error } = await supabase
        .from('messages')
        .insert({
          user_id: user?.id,
          content: newMessage.trim() || null,
          media_url: mediaUrl,
          media_type: mediaType,
        });

      if (error) throw error;

      setNewMessage('');
      setMediaFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
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
    <div className="space-y-4">
      <h2 className="text-3xl font-bold">Team Chat</h2>

      <Card className="shadow-elevated h-[calc(100vh-16rem)]">
        <CardHeader className="pb-3">
          <CardTitle>Messages</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
            {[...messages, ...polls.map(p => ({ ...p, type: 'poll' }))].sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            ).map((item: any) => 
              item.type === 'poll' ? (
                <div key={item.id} className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={(Array.isArray(item.profiles) ? item.profiles[0]?.avatar_url : item.profiles?.avatar_url) || ''} />
                    <AvatarFallback>
                      <UserCircle className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        {Array.isArray(item.profiles) ? item.profiles[0]?.full_name : item.profiles?.full_name || 'Unknown'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(item.created_at), 'HH:mm')}
                      </span>
                    </div>
                    <PollCard poll={item} />
                  </div>
                </div>
              ) : (
                <div
                  key={item.id}
                  className={`flex gap-3 ${
                    item.user_id === user?.id ? 'flex-row-reverse' : ''
                  }`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={(Array.isArray(item.profiles) ? item.profiles[0]?.avatar_url : item.profiles?.avatar_url) || ''} />
                    <AvatarFallback>
                      <UserCircle className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`flex flex-col ${
                      item.user_id === user?.id ? 'items-end' : 'items-start'
                    } flex-1`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        {Array.isArray(item.profiles) ? item.profiles[0]?.full_name : item.profiles?.full_name || 'Unknown'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(item.created_at), 'HH:mm')}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div
                        className={`rounded-lg px-3 py-2 max-w-md ${
                          item.user_id === user?.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary'
                        }`}
                      >
                        {item.content && <p>{item.content}</p>}
                        {item.media_url && item.media_type === 'image' && (
                          <img
                            src={item.media_url}
                            alt="Shared media"
                            className="rounded mt-2 max-w-full"
                          />
                        )}
                        {item.media_url && item.media_type === 'video' && (
                          <video
                            src={item.media_url}
                            controls
                            className="rounded mt-2 max-w-full"
                          />
                        )}
                      </div>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteMessage(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            <CreatePollDialog />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
            >
              <Image className="h-4 w-4" />
            </Button>
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={sending}
            />
            <Button type="submit" variant="accent" disabled={sending}>
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
          {mediaFile && (
            <p className="text-xs text-muted-foreground mt-2">
              Selected: {mediaFile.name}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Chat;
