import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AdminMobileNavigation } from './admin-mobile-navigation';
import { AdminUserMenu } from './admin-user-menu';

interface AdminHeaderProps {
  displayName: string;
  role: string;
  avatarUrl: string | null;
}

export function AdminHeader({ displayName, role, avatarUrl }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
        <AdminMobileNavigation />
        <Separator orientation="vertical" className="hidden h-6 lg:block" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">Panel editorial</p>
          <p className="hidden text-xs text-muted-foreground sm:block">
            Gestión interna de Editorial La Rueca
          </p>
        </div>
        <Badge variant="outline" className="hidden capitalize sm:inline-flex">
          {role}
        </Badge>
        <AdminUserMenu displayName={displayName} role={role} avatarUrl={avatarUrl} />
      </div>
    </header>
  );
}
