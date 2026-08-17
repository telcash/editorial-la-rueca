export interface EditorialVideoContent {
  title: string;
  subtitle: string;
  description: string;
  quote: string;
  posterUrl: string | null;
  videoUrl: string | null;
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
