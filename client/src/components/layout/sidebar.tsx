import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard,
  FileText,
  Calendar,
  MessageSquare,
  BarChart,
  Settings,
  Share2,
  Zap,
  User as UserIcon,
  CreditCard
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@shared/schema";

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Content', href: '/content', icon: FileText },
  { name: 'Schedule', href: '/schedule', icon: Calendar },
  { name: 'Platforms', href: '/platforms', icon: Share2 },
  { name: 'Inbox', href: '/inbox', icon: MessageSquare, badge: 3 },
  { name: 'Analytics', href: '/analytics', icon: BarChart },
  { name: 'Subscription', href: '/subscription', icon: CreditCard },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth() as { user: User | null };

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col" data-testid="sidebar">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 gradient-bg rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-foreground">PostPilot</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6">
        <div className="space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                data-testid={`nav-link-${item.name.toLowerCase()}`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
                {item.badge && (
                  <span className="ml-auto bg-destructive text-destructive-foreground text-xs font-medium px-2 py-1 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3">
          {user?.profileImageUrl ? (
            <img 
              src={user.profileImageUrl} 
              alt="User profile" 
              className="w-10 h-10 rounded-full object-cover"
              data-testid="user-profile-image"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate" data-testid="user-name">
              {user?.firstName && user?.lastName 
                ? `${user.firstName} ${user.lastName}`
                : user?.email || "User"
              }
            </p>
            <button 
              onClick={() => window.location.href = '/api/logout'}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-logout"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
