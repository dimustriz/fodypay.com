import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://fodypay.com',
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: {
          en: 'en',
          de: 'de',
          ru: 'ru',
          uk: 'uk',
          es: 'es',
          it: 'it',
          fr: 'fr',
        },
      },
    }),
  ],
});
