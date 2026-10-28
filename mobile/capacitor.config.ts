import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.stockwise.inventory",
  appName: "Stockwise",
  webDir: "../apps/web/dist",
  bundledWebRuntime: false,
  server: {
    cleartext: true
  }
};

export default config;
