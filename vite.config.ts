import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    base: "/DevOps-CA2_2023_27/",
  },

  tanstackStart: {
    server: {
      entry: "server",
    },
    spa: {
      enabled: true,
      prerender: {
        outputPath: "/index.html",
      },
    },
  },

  nitro: false,
});
