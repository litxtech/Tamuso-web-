/** LitxTech APP LAUNCH CENTER — types, nav, validation, legal templates. */

export type LaunchStatus =
  | 'draft'
  | 'scheduled'
  | 'published'
  | 'coming_soon'
  | 'archived';

export type LaunchPlatform = 'ios' | 'android' | 'web';

export type LaunchTemplateKey =
  | 'dark_premium'
  | 'minimal_light'
  | 'product_editorial';

export type FeatureLayout = 'grid' | 'list' | 'cards' | 'icons';

export type LaunchChildKind =
  | 'screenshots'
  | 'features'
  | 'faqs'
  | 'reviews'
  | 'changelog'
  | 'sections';

export type LegalDocType =
  | 'privacy'
  | 'terms'
  | 'child_safety'
  | 'account_deletion';

export type LaunchScreenshot = {
  id?: string;
  url: string;
  caption?: string | null;
  platform?: LaunchPlatform | 'all' | null;
  sort_order?: number;
};

export type LaunchFeature = {
  id?: string;
  title: string;
  body?: string | null;
  icon?: string | null;
  image_url?: string | null;
  layout?: FeatureLayout | null;
  sort_order?: number;
};

export type LaunchFaq = {
  id?: string;
  question: string;
  answer: string;
  sort_order?: number;
};

export type LaunchReview = {
  id?: string;
  author_name: string;
  author_title?: string | null;
  rating?: number | null;
  body: string;
  avatar_url?: string | null;
  source?: string | null;
  sort_order?: number;
  /** Only real reviews — never invent client-side */
  verified?: boolean;
};

export type LaunchChangelog = {
  id?: string;
  version: string;
  title?: string | null;
  body?: string | null;
  released_at?: string | null;
  sort_order?: number;
};

export type LaunchSectionKey =
  | 'hero'
  | 'stats'
  | 'features'
  | 'screenshots'
  | 'how_it_works'
  | 'technology'
  | 'reviews'
  | 'faq'
  | 'download'
  | 'support'
  | 'legal'
  | 'cta';

export type LaunchSection = {
  id?: string;
  key: LaunchSectionKey | string;
  title?: string | null;
  body?: string | null;
  enabled?: boolean;
  sort_order?: number;
  meta?: Record<string, unknown> | null;
};

export type LaunchLegalDoc = {
  id?: string;
  doc_type: LegalDocType | string;
  locale: string;
  body: string;
  vars?: Record<string, string> | null;
  updated_at?: string | null;
};

export type LaunchTemplate = {
  key: LaunchTemplateKey;
  name: string;
  description: string;
  preview_colors: string[];
};

export type LaunchAnalytics = {
  page_views?: number;
  unique_visitors?: number;
  store_clicks_ios?: number;
  store_clicks_android?: number;
  store_clicks_total?: number;
  notify_subscribers?: number;
  support_tickets?: number;
  deletion_requests?: number;
  events?: Array<{ event: string; count: number }>;
};

export type LaunchApp = {
  id?: string;
  name: string;
  slug: string;
  tagline?: string | null;
  description?: string | null;
  status: LaunchStatus;
  platforms: LaunchPlatform[];
  template: LaunchTemplateKey;
  version?: string | null;
  icon_url?: string | null;
  cover_url?: string | null;
  brand_primary?: string | null;
  brand_secondary?: string | null;
  brand_accent?: string | null;
  app_store_url?: string | null;
  play_store_url?: string | null;
  web_url?: string | null;
  support_email?: string | null;
  company_name?: string | null;
  company_address?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  og_image_url?: string | null;
  feature_layout?: FeatureLayout | null;
  stats?: Array<{ label: string; value: string }> | null;
  how_it_works?: Array<{ title: string; body?: string }> | null;
  technology?: Array<{ title: string; body?: string }> | null;
  scheduled_at?: string | null;
  published_at?: string | null;
  preview_token?: string | null;
  screenshots?: LaunchScreenshot[];
  features?: LaunchFeature[];
  faqs?: LaunchFaq[];
  reviews?: LaunchReview[];
  changelog?: LaunchChangelog[];
  sections?: LaunchSection[];
  legal?: LaunchLegalDoc[];
  analytics?: LaunchAnalytics | null;
  views?: number | null;
  store_clicks?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type LaunchMediaItem = {
  id?: string;
  app_id?: string;
  app_name?: string | null;
  app_slug?: string | null;
  url: string;
  path?: string | null;
  folder?: string | null;
  mime?: string | null;
  created_at?: string | null;
};

export type LaunchSubscriber = {
  id: string;
  email: string;
  created_at?: string | null;
};

export type LaunchDeletionRequest = {
  id: string;
  app_id?: string | null;
  app_name?: string | null;
  email?: string | null;
  account_id?: string | null;
  reason?: string | null;
  status: string;
  created_at?: string | null;
};

export type LaunchSupportTicket = {
  id: string;
  app_id?: string | null;
  app_name?: string | null;
  email?: string | null;
  subject?: string | null;
  body?: string | null;
  status?: string | null;
  created_at?: string | null;
};

export const LAUNCH_NAV = [
  { href: '/admin/app-launch', label: 'All Apps', icon: 'apps-outline' as const },
  { href: '/admin/app-launch/create', label: 'Create App', icon: 'add-circle-outline' as const },
  { href: '/admin/app-launch/published', label: 'Published', icon: 'checkmark-circle-outline' as const },
  { href: '/admin/app-launch/drafts', label: 'Drafts', icon: 'document-outline' as const },
  { href: '/admin/app-launch/scheduled', label: 'Scheduled', icon: 'calendar-outline' as const },
  { href: '/admin/app-launch/archived', label: 'Archived', icon: 'archive-outline' as const },
  { href: '/admin/app-launch/templates', label: 'Templates', icon: 'color-palette-outline' as const },
  { href: '/admin/app-launch/media', label: 'Media', icon: 'images-outline' as const },
] as const;

export const DEFAULT_SECTIONS: LaunchSection[] = [
  { key: 'hero', title: 'Hero', enabled: true, sort_order: 0 },
  { key: 'stats', title: 'Stats', enabled: false, sort_order: 1 },
  { key: 'features', title: 'Features', enabled: true, sort_order: 2 },
  { key: 'screenshots', title: 'Screenshots', enabled: true, sort_order: 3 },
  { key: 'how_it_works', title: 'How it works', enabled: true, sort_order: 4 },
  { key: 'technology', title: 'Technology', enabled: false, sort_order: 5 },
  { key: 'reviews', title: 'Reviews', enabled: false, sort_order: 6 },
  { key: 'faq', title: 'FAQ', enabled: true, sort_order: 7 },
  { key: 'download', title: 'Download', enabled: true, sort_order: 8 },
  { key: 'support', title: 'Support', enabled: true, sort_order: 9 },
  { key: 'legal', title: 'Legal', enabled: true, sort_order: 10 },
  { key: 'cta', title: 'Final CTA', enabled: true, sort_order: 11 },
];

export const WIZARD_STEPS = [
  { id: '01', key: 'basics', title: 'Temel bilgiler', hint: 'Name, slug, platforms, status' },
  { id: '02', key: 'branding', title: 'Marka', hint: 'Icon, colors, template' },
  { id: '03', key: 'stores', title: 'Mağaza linkleri', hint: 'App Store · Play · Web' },
  { id: '04', key: 'screenshots', title: 'Ekran görüntüleri', hint: 'Gallery assets' },
  { id: '05', key: 'features', title: 'Özellikler', hint: 'Feature blocks + layout' },
  { id: '06', key: 'content', title: 'İçerik', hint: 'Stats · how it works · technology' },
  { id: '07', key: 'reviews', title: 'Yorumlar', hint: 'Only real reviews' },
  { id: '08', key: 'faq', title: 'SSS', hint: 'FAQ pairs' },
  { id: '09', key: 'legal', title: 'Yasal', hint: 'Privacy · Terms · Safety · Deletion' },
  { id: '10', key: 'support_seo', title: 'Destek & SEO', hint: 'Email, SEO, OG' },
  { id: '11', key: 'publish', title: 'Yayınla', hint: 'Checklist + publish' },
] as const;

export const FEATURE_LAYOUTS: Array<{ key: FeatureLayout; label: string }> = [
  { key: 'grid', label: 'Grid' },
  { key: 'list', label: 'List' },
  { key: 'cards', label: 'Cards' },
  { key: 'icons', label: 'Icons' },
];

export const LAUNCH_TEMPLATES: LaunchTemplate[] = [
  {
    key: 'dark_premium',
    name: 'Dark Premium',
    description: 'Deep charcoal hero, accent CTAs, cinematic product feel.',
    preview_colors: ['#0B0B0F', '#1A1A22', '#E84091', '#F5F5F7'],
  },
  {
    key: 'minimal_light',
    name: 'Minimal Light',
    description: 'Clean light canvas, quiet typography, product-first layout.',
    preview_colors: ['#FAFAFA', '#FFFFFF', '#111111', '#6B7280'],
  },
  {
    key: 'product_editorial',
    name: 'Product Editorial',
    description: 'Editorial storytelling with bold type and gallery rhythm.',
    preview_colors: ['#12141A', '#F4F0E8', '#C45C26', '#1E293B'],
  },
];

export const STATUS_LABELS: Record<LaunchStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  published: 'Published',
  coming_soon: 'Coming Soon',
  archived: 'Archived',
};

export const PLATFORM_LABELS: Record<LaunchPlatform, string> = {
  ios: 'iOS',
  android: 'Android',
  web: 'Web',
};

export function storeButtonLabel(platform: 'ios' | 'android'): string {
  return platform === 'ios' ? 'Download on the App Store' : 'Get it on Google Play';
}

export function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 64);
}

export function validatePublish(app: Partial<LaunchApp>): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!app.name?.trim()) errors.push('App name is required.');
  if (!app.slug?.trim()) errors.push('Slug is required.');
  if (!app.tagline?.trim()) errors.push('Tagline is required.');
  if (!app.description?.trim()) errors.push('Description is required.');
  if (!app.icon_url?.trim()) errors.push('App icon is required.');
  const platforms = app.platforms ?? [];
  if (platforms.length === 0) errors.push('Select at least one platform.');
  if (platforms.includes('ios') && !app.app_store_url?.trim()) {
    errors.push('iOS platform selected but App Store URL is missing.');
  }
  if (platforms.includes('android') && !app.play_store_url?.trim()) {
    errors.push('Android platform selected but Google Play URL is missing.');
  }
  if (platforms.includes('web') && !app.web_url?.trim()) {
    errors.push('Web platform selected but web URL is missing.');
  }
  if (!(app.screenshots?.length ?? 0)) {
    errors.push('Add at least one screenshot.');
  }
  if (!(app.features?.length ?? 0)) {
    errors.push('Add at least one feature.');
  }
  if (!app.support_email?.trim()) {
    errors.push('Support email is required.');
  }
  const legal = app.legal ?? [];
  for (const doc of ['privacy', 'terms', 'child_safety', 'account_deletion'] as LegalDocType[]) {
    if (!legal.some((d) => d.doc_type === doc && d.body?.trim())) {
      errors.push(`Legal document missing: ${doc}.`);
    }
  }
  return { ok: errors.length === 0, errors };
}

export function publicUrls(slug: string): {
  showcase: string;
  privacy: string;
  terms: string;
  childSafety: string;
  accountDeletion: string;
  support: string;
  download: string;
  smartRedirect: string;
  inAppShowcase: string;
} {
  const base =
    process.env.EXPO_PUBLIC_LAUNCH_WEB_BASE?.replace(/\/$/, '') ||
    'https://litxtech.com';
  return {
    showcase: `${base}/apps/${slug}`,
    privacy: `${base}/apps/${slug}/privacy`,
    terms: `${base}/apps/${slug}/terms`,
    childSafety: `${base}/apps/${slug}/child-safety`,
    accountDeletion: `${base}/apps/${slug}/account-deletion`,
    support: `${base}/apps/${slug}/support`,
    download: `${base}/apps/${slug}/download`,
    smartRedirect: `${base}/go/${slug}`,
    inAppShowcase: `/apps/${slug}`,
  };
}

export function renderLegalTemplate(
  body: string,
  vars: Record<string, string | null | undefined> = {},
): string {
  return body.replace(/\{\{\s*([A-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const v = vars[key];
    return v != null && String(v).length ? String(v) : `{{${key}}}`;
  });
}

export const DEFAULT_PRIVACY = `PRIVACY POLICY

Last updated: {{LAST_UPDATED}}
App: {{APP_NAME}}
Developer: {{COMPANY_NAME}}
Contact: {{SUPPORT_EMAIL}}

1. INTRODUCTION
{{APP_NAME}} ("we", "us", or "our") respects your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard information when you use {{APP_NAME}}.

2. INFORMATION WE COLLECT
We may collect information you provide directly (account details, support requests), automatically (device type, OS version, approximate usage analytics), and from app stores when you download {{APP_NAME}}.

3. HOW WE USE INFORMATION
We use information to operate and improve {{APP_NAME}}, provide customer support, send service-related notices, enforce our terms, and comply with law.

4. SHARING
We do not sell personal information. We may share data with service providers who assist us (hosting, analytics, crash reporting) under appropriate agreements, or when required by law.

5. DATA RETENTION
We retain information only as long as needed for the purposes described above, unless a longer period is required by law.

6. YOUR RIGHTS
Depending on your location, you may have rights to access, correct, delete, or export your data. Contact {{SUPPORT_EMAIL}} to make a request. Account deletion instructions: {{ACCOUNT_DELETION_URL}}

7. CHILDREN
{{APP_NAME}} is not directed to children under 13 (or the minimum age in your jurisdiction). See our Child Safety policy: {{CHILD_SAFETY_URL}}

8. SECURITY
We implement reasonable technical and organizational measures. No method of transmission is 100% secure.

9. CHANGES
We may update this policy. The "Last updated" date will change when we do.

10. CONTACT
{{COMPANY_NAME}}
{{COMPANY_ADDRESS}}
{{SUPPORT_EMAIL}}
`;

export const DEFAULT_TERMS = `TERMS OF USE

Last updated: {{LAST_UPDATED}}
App: {{APP_NAME}}
Developer: {{COMPANY_NAME}}
Contact: {{SUPPORT_EMAIL}}

1. ACCEPTANCE
By downloading or using {{APP_NAME}}, you agree to these Terms. If you do not agree, do not use the app.

2. LICENSE
We grant you a limited, non-exclusive, non-transferable license to use {{APP_NAME}} for personal or internal business purposes, subject to these Terms and applicable store rules.

3. ACCOUNTS
You are responsible for account credentials and activity under your account. Provide accurate information and notify us of unauthorized use.

4. ACCEPTABLE USE
You may not misuse {{APP_NAME}}, attempt unauthorized access, reverse engineer except where permitted by law, or use the app for unlawful purposes.

5. INTELLECTUAL PROPERTY
{{APP_NAME}}, its branding, and content are owned by {{COMPANY_NAME}} or its licensors. No rights are granted except as expressly stated.

6. DISCLAIMER
{{APP_NAME}} is provided "as is" without warranties of any kind to the fullest extent permitted by law.

7. LIMITATION OF LIABILITY
To the fullest extent permitted by law, {{COMPANY_NAME}} is not liable for indirect, incidental, or consequential damages arising from use of {{APP_NAME}}.

8. TERMINATION
We may suspend or terminate access if you violate these Terms. You may stop using {{APP_NAME}} at any time. Account deletion: {{ACCOUNT_DELETION_URL}}

9. GOVERNING LAW
These Terms are governed by applicable laws of the jurisdiction where {{COMPANY_NAME}} is established, without regard to conflict-of-law rules.

10. CONTACT
{{SUPPORT_EMAIL}}
{{COMPANY_ADDRESS}}
`;

export const DEFAULT_CHILD_SAFETY = `CHILD SAFETY STANDARDS

Last updated: {{LAST_UPDATED}}
App: {{APP_NAME}}
Contact: {{SUPPORT_EMAIL}}

1. COMMITMENT
{{COMPANY_NAME}} is committed to child safety. {{APP_NAME}} is not intended for children under 13 (or the applicable age of digital consent in your region).

2. AGE REQUIREMENTS
Users must meet the minimum age required by law and app store policies. We do not knowingly collect personal information from children below that age.

3. PROHIBITED CONTENT
Sexual exploitation, grooming, child sexual abuse material (CSAM), and any content that endangers minors are strictly prohibited. We have zero tolerance.

4. REPORTING
If you believe a child is in danger or encounter prohibited content in {{APP_NAME}}, contact {{SUPPORT_EMAIL}} immediately and contact local authorities when appropriate.

5. MODERATION & REMOVAL
We investigate reports promptly, remove violating content, and may suspend or ban accounts. We cooperate with lawful requests from authorities.

6. PARENTAL GUIDANCE
Parents and guardians should supervise device use. Contact {{SUPPORT_EMAIL}} for account or safety questions.

7. UPDATES
This policy may be updated. Continued use of {{APP_NAME}} after updates constitutes awareness of the revised standards.
`;

export const DEFAULT_ACCOUNT_DELETION = `ACCOUNT DELETION

Last updated: {{LAST_UPDATED}}
App: {{APP_NAME}}
Contact: {{SUPPORT_EMAIL}}

1. HOW TO REQUEST DELETION
You can request deletion of your {{APP_NAME}} account and associated personal data by:
• Using the in-app account deletion flow (if available), or
• Submitting a request at {{ACCOUNT_DELETION_URL}}, or
• Emailing {{SUPPORT_EMAIL}} with the subject "Account Deletion — {{APP_NAME}}"

2. INFORMATION TO INCLUDE
Please include the email or account identifier associated with your account and confirm you want permanent deletion.

3. PROCESSING TIME
We typically process verified deletion requests within 30 days, unless a longer period is required for legal, security, or abuse-prevention reasons.

4. WHAT IS DELETED
Upon completion, we delete or anonymize personal data tied to your account, except information we must retain for legal compliance, fraud prevention, or accounting.

5. CONFIRMATION
We will confirm when deletion is complete, or contact you if we need more information to verify the request.

6. CONTACT
{{COMPANY_NAME}}
{{SUPPORT_EMAIL}}
{{COMPANY_ADDRESS}}
`;

export function emptyLaunchApp(partial?: Partial<LaunchApp>): LaunchApp {
  return {
    name: '',
    slug: '',
    tagline: '',
    description: '',
    status: 'draft',
    platforms: ['ios', 'android'],
    template: 'dark_premium',
    version: '1.0.0',
    feature_layout: 'grid',
    company_name: 'LitxTech',
    support_email: 'support@litxtech.com',
    sections: DEFAULT_SECTIONS.map((s) => ({ ...s })),
    screenshots: [],
    features: [],
    faqs: [],
    reviews: [],
    changelog: [],
    legal: [],
    stats: [],
    how_it_works: [],
    technology: [],
    ...partial,
  };
}

export function sectionEnabled(
  sections: LaunchSection[] | undefined,
  key: LaunchSectionKey | string,
): boolean {
  const s = (sections ?? []).find((x) => x.key === key);
  if (!s) return true;
  return s.enabled !== false;
}
