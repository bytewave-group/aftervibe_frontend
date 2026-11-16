import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Default cache is in-memory. Add an R2 bucket later if pages should stay cached across requests.
export default defineCloudflareConfig();
