import { webApplicationJsonLd } from '@/lib/site-seo';

export function SiteJsonLd() {
  const data = webApplicationJsonLd();
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
