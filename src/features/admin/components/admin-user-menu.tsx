'use client';

import { LogOut, UserRound } from 'lucide-react';

import { signOut } from '@/features/auth/actions/sign-out';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AdminUserMenuProps {
  displayName: string;
  role: string;
  avatarUrl: string | null;
}

function getInitials(displayName: string) {
  return displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function AdminUserMenu({ displayName, role, avatarUrl }: AdminUserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 gap-2 px-2" aria-label="Abrir menú de usuario">
          <Avatar size="sm">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
            <AvatarFallback>
              {getInitials(displayName) || <UserRound className="size-3" />}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-32 truncate text-sm font-medium md:inline">
            {displayName}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <span className="block truncate text-sm font-medium text-foreground">{displayName}</span>
          <span className="block text-xs text-muted-foreground">{role}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <form action={signOut} className="w-full">
            <button type="submit" className="flex w-full items-center gap-2">
              <LogOut className="size-4" aria-hidden="true" />
              Cerrar sesión
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
