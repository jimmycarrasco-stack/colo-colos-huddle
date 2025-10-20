import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  MessageSquare, 
  Calendar, 
  TrendingUp, 
  Settings,
  LogOut 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import coloColoLogo from '@/assets/colo-colo-logo.png';

const Layout = () => {
  const { signOut } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: 'Roster', href: '/', icon: Users },
    { name: 'Chat', href: '/chat', icon: MessageSquare },
    { name: 'Schedule', href: '/schedule', icon: Calendar },
    { name: 'Stats', href: '/stats', icon: TrendingUp },
    { name: 'Admin', href: '/admin', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-card shadow-blue">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <img 
              src={coloColoLogo} 
              alt="Colo Colo Logo" 
              className="h-12 w-12 object-contain"
            />
            <h1 className="text-2xl font-bold">Colo Colo</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <nav className="border-b bg-card">
        <div className="container flex gap-2 px-4 py-2 overflow-x-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link key={item.name} to={item.href}>
                <Button
                  variant={isActive ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    'gap-2 transition-smooth',
                    isActive && 'shadow-md'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Button>
              </Link>
            );
          })}
        </div>
      </nav>

      <main className="container py-6 px-4">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
