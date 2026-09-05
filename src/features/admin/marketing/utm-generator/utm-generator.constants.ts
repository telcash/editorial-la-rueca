export const UTM_SOURCES = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'qr', label: 'Código QR' },
  { value: 'partner', label: 'Colaborador / web externa' },
  { value: 'other', label: 'Otro' },
] as const;

export const UTM_MEDIUMS = [
  { value: 'social', label: 'Social orgánico' },
  { value: 'paid_social', label: 'Social pagado' },
  { value: 'email', label: 'Email' },
  { value: 'qr', label: 'Código QR' },
  { value: 'referral', label: 'Referencia / colaborador' },
] as const;

export const UTM_CAMPAIGNS = [
  { value: 'publica_tu_libro', label: 'Publica tu libro' },
  { value: 'novedades_editoriales', label: 'Novedades editoriales' },
  { value: 'marca_la_rueca', label: 'Marca La Rueca' },
] as const;

export const UTM_FORMATS = [
  { value: 'reel', label: 'Reel' },
  { value: 'carousel', label: 'Carrusel' },
  { value: 'story', label: 'Story' },
  { value: 'post', label: 'Post' },
  { value: 'bio', label: 'Bio' },
  { value: 'ad', label: 'Anuncio' },
  { value: 'email', label: 'Email' },
  { value: 'qr', label: 'Código QR' },
] as const;

export const SOURCE_MEDIUM_DEFAULTS: Record<string, string | undefined> = {
  instagram: 'social',
  facebook: 'social',
  linkedin: 'social',
  newsletter: 'email',
  whatsapp: 'referral',
  qr: 'qr',
  partner: 'referral',
};
