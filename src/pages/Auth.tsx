import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useEffect } from 'react';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [position, setPosition] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: 'Welcome back!',
          description: 'Successfully logged in.',
        });
        navigate('/');
      } else {
        // Sign up
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: fullName,
            },
          },
        });

        if (error) throw error;

        if (data.user) {
          // Upload avatar if provided
          if (avatarFile) {
            const fileExt = avatarFile.name.split('.').pop();
            const fileName = `${data.user.id}/avatar.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
              .from('avatars')
              .upload(fileName, avatarFile, { upsert: true });

            if (uploadError) {
              console.error('Avatar upload error:', uploadError);
            } else {
              const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

              await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl, position })
                .eq('id', data.user.id);
            }
          }

          toast({
            title: 'Account created!',
            description: 'Welcome to Colo Colo team.',
          });
          navigate('/');
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'An error occurred during authentication.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-hero p-4">
      <Card className="w-full max-w-md shadow-elevated">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center">
            Colo Colo
          </CardTitle>
          <CardDescription className="text-center">
            {isLogin ? 'Welcome back to the team' : 'Join the Colo Colo team'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Enter your name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={!isLogin}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    type="text"
                    placeholder="e.g., Forward, Midfielder"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="avatar">Profile Picture</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="avatar"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                      className="cursor-pointer"
                    />
                    <Upload className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="player@colocolo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              variant="accent"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Please wait
                </>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-accent hover:underline"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
