interface SiteConfig {
  name: string;
  description: string;
  positioning: string;
  contact: {
    phone: string | null;
    email: string | null;
    address: string | null;
    schedule: string | null;
  };
  socialLinks: {
    instagram: string | null;
    facebook: string | null;
    linkedin: string | null;
    x: string | null;
    youtube: string | null;
  };
}

export const siteConfig: SiteConfig = {
  name: 'Editorial La Rueca',
  description:
    'Editorial independiente que acompaña a autores en la publicación de sus libros con cercanía, claridad y cuidado editorial.',
  positioning: 'Publicamos libros con honestidad, claridad y cercanía en cada etapa del proceso.',
  contact: {
    phone: null,
    email: null,
    address: null,
    schedule: null,
  },
  socialLinks: {
    instagram: 'https://www.instagram.com/editoriallarueca',
    facebook: 'https://www.facebook.com/EditorialLaRueca/',
    linkedin: 'https://www.linkedin.com/in/almudenajimenezfernandez',
    x: 'https://twitter.com/editorial_rueca',
    youtube: 'https://www.youtube.com/@editoriallarueca',
  },
};

// TODO: Migrar estos datos a Site Settings administrables cuando exista ese módulo.
