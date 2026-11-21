import type { APIRoute } from 'astro';
import { langs } from '../i18n/ui';

const SITE = 'https://fodypay.com';
const staticPages = ['/privacy/', '/support/', '/terms/'];

const homePath = (lang: string) => (lang === 'en' ? '/' : `/${lang}/`);

export const GET: APIRoute = () => {
  const alternates = langs
    .map(
      (l) =>
        `<xhtml:link rel="alternate" hreflang="${l}" href="${SITE}${homePath(l)}"/>`,
    )
    .join('');

  const homes = langs.map(
    (l) => `<url><loc>${SITE}${homePath(l)}</loc>${alternates}</url>`,
  );
  const pages = staticPages.map((p) => `<url><loc>${SITE}${p}</loc></url>`);

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">' +
    [...homes, ...pages].join('') +
    '</urlset>\n';

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
