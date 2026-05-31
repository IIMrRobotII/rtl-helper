import { resolve } from "node:path";
import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  alias: {
    "@": resolve("."),
  },
  manifest: {
    name: "RTL Helper",
    description:
      "Apply right-to-left readability to page content text, remembered per site.",
    permissions: ["storage"],
    host_permissions: ["<all_urls>"],
    commands: {
      "toggle-rtl": {
        suggested_key: {
          default: "Alt+R",
          mac: "MacCtrl+Shift+R",
        },
        description: "Toggle RTL Mode for the current site",
      },
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
