import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  output: "static",
  site: "https://fodypay.com",
  integrations: [sitemap()],
  i18n: {
    defaultLocale: "en",
    locales: ["en", "de", "ru", "uk", "es", "it", "fr"],
    routing: { prefixDefaultLocale: false },
  },
});
