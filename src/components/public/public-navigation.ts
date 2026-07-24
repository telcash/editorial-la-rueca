export interface PublicNavigationItem {
  label: string;
  href: string;
}

export const publicNavigation: PublicNavigationItem[] = [
  { label: 'Inicio', href: '/' },
  { label: 'Libros', href: '/libros' },
  { label: 'Autores', href: '/autores' },
];

export const publicFooterNavigation: PublicNavigationItem[] = [
  { label: 'Inicio', href: '/' },
  { label: 'Libros', href: '/libros' },
  { label: 'Autores', href: '/autores' },
];
