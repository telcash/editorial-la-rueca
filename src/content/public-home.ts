export interface EditorialVideoContent {
  title: string;
  subtitle: string;
  description: string;
  quote: string;
  posterUrl: string | null;
  videoUrl: string | null;
}

export interface Testimonial {
  id: string;
  quote: string;
  authorName: string;
  authorRole?: string;
  authorImage?: string | null;
}

export const editorialVideoContent: EditorialVideoContent = {
  title: 'Conoce a Almudena',
  subtitle: 'Directora de Editorial La Rueca',
  description:
    'Acompañamos cada proyecto con escucha, claridad y cuidado editorial para que cada autor pueda avanzar con confianza en el proceso de publicación.',
  quote: 'Cada libro merece una edición honesta, cercana y profesional.',
  posterUrl: null,
  videoUrl: null,
};

export const testimonials: Testimonial[] = [
  {
    id: 'testimonial-placeholder-1',
    quote:
      'Placeholder temporal pendiente de sustituir por un testimonio aprobado por la editorial.',
    authorName: 'Testimonio pendiente',
    authorRole: 'Autor/a',
    authorImage: null,
  },
  {
    id: 'testimonial-placeholder-2',
    quote:
      'Placeholder temporal pendiente de sustituir por un testimonio aprobado por la editorial.',
    authorName: 'Testimonio pendiente',
    authorRole: 'Autor/a',
    authorImage: null,
  },
  {
    id: 'testimonial-placeholder-3',
    quote:
      'Placeholder temporal pendiente de sustituir por un testimonio aprobado por la editorial.',
    authorName: 'Testimonio pendiente',
    authorRole: 'Autor/a',
    authorImage: null,
  },
];

// TODO: Sustituir estos testimonios placeholder por testimonios reales aprobados.
