export const DUYURU_DILLERI = ['tr', 'en', 'es', 'pt', 'ar', 'fr', 'fil'] as const;
export type DuyuruDili = (typeof DUYURU_DILLERI)[number];

export type DuyuruBlok =
  | { type: 'heading'; text: string; level?: number; bold?: boolean; italic?: boolean }
  | { type: 'paragraph'; text: string; bold?: boolean; italic?: boolean }
  | { type: 'list'; ordered?: boolean; items: string[] }
  | { type: 'link'; text: string; url: string }
  | { type: 'quote'; text: string }
  | { type: 'divider' };

export type DuyuruBelge = { blocks: DuyuruBlok[] };

export type DuyuruKart = {
  id: string;
  severity: 'NORMAL' | 'IMPORTANT' | 'CRITICAL';
  pinned: boolean;
  publish_at: string;
  category_code: string | null;
  category_name: string | null;
  category_icon: string | null;
  theme_color: string | null;
  title: string;
  summary: string;
  content_locale: string;
  unread: boolean;
  show_view_count: boolean;
  unique_view_count: number | null;
  cover: {
    kind: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'VOICE_RECORDING';
    thumbnail_url: string | null;
    duration_ms: number | null;
  } | null;
};

export type DuyuruMedya = {
  id: string;
  kind: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'VOICE_RECORDING';
  public_url: string | null;
  thumbnail_url: string | null;
  duration_ms: number | null;
  width: number | null;
  height: number | null;
  caption: string | null;
  sort_order: number;
};

export type DuyuruCta = {
  id: string;
  destination_type: string;
  destination: { path?: string; id?: string; url?: string };
  label: string;
};

export type DuyuruDetay = {
  id: string;
  severity: string;
  status: string;
  publish_at: string;
  pinned: boolean;
  allow_reactions: boolean;
  allow_comments: boolean;
  show_view_count: boolean;
  unique_view_count: number | null;
  reaction_counts: Record<string, number>;
  my_reaction: string | null;
  read_at: string | null;
  category: {
    code: string;
    name: string;
    icon: string;
    theme_color: string;
  } | null;
  translation: {
    locale: string;
    title: string;
    summary: string;
    body_doc: DuyuruBelge;
    body_plain: string;
    button_text: string | null;
    fallback: boolean;
  };
  media: DuyuruMedya[];
  ctas: DuyuruCta[];
  comments: Array<{
    id: string;
    body: string;
    created_at: string;
    user_id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    is_mine: boolean;
  }>;
};

export type DuyuruOlayTipi =
  | 'IMPRESSION'
  | 'OPEN'
  | 'READ'
  | 'MEDIA_START'
  | 'MEDIA_25'
  | 'MEDIA_50'
  | 'MEDIA_75'
  | 'MEDIA_COMPLETE'
  | 'CTA_CLICK'
  | 'DISMISS';
