import {
  BookOpenText,
  FolderTree,
  LayoutDashboard,
  LibraryBig,
  Settings,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';

export interface AdminNavigationItem {
  href: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
}

export const adminNavigationItems: AdminNavigationItem[] = [
  {
    href: '/admin',
    label: 'Panel',
    icon: LayoutDashboard,
  },
  {
    href: '/admin/authors',
    label: 'Autores',
    icon: UsersRound,
  },
  {
    href: '/admin/books',
    label: 'Libros',
    icon: BookOpenText,
    disabled: true,
  },
  {
    href: '/admin/categories',
    label: 'Categorías',
    icon: FolderTree,
    disabled: true,
  },
  {
    href: '/admin/settings',
    label: 'Configuración',
    icon: Settings,
    disabled: true,
  },
];

export function AdminBrand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
        LR
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">Editorial La Rueca</p>
        <p className="truncate text-xs text-neutral-400">Panel editorial</p>
      </div>
    </div>
  );
}

export function ModuleIcon() {
  return <LibraryBig className="size-4" aria-hidden="true" />;
}
