export interface PublicNavigationItem {
  label: string;
  href: string;
}

export const publicNavigation: PublicNavigationItem[] = [
  { label: 'Inicio', href: '/' },
  { label: 'Publica con nosotros', href: '/publica-con-nosotros' },
  { label: 'Servicios editoriales', href: '/servicios-editoriales' },
  { label: 'Catálogo', href: '/libros' },
  { label: 'Autores', href: '/autores' },
];

export const publicFooterNavigation: PublicNavigationItem[] = [
  { label: 'Publica con nosotros', href: '/publica-con-nosotros' },
  { label: 'Servicios editoriales', href: '/servicios-editoriales' },
  { label: 'Catálogo', href: '/libros' },
  { label: 'Autores', href: '/autores' },
  { label: 'Blog', href: '/blog' },
];
