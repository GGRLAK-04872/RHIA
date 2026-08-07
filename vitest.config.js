import{cloudflareTest}from"@cloudflare/vitest-pool-workers";
import{defineConfig}from"vitest/config";

export default defineConfig({
  plugins:[cloudflareTest({
    wrangler:{configPath:"./memory-worker/wrangler.jsonc"},
    miniflare:{bindings:{RHIA_TEST_MODE:"true"}}
  })],
  test:{include:["tests/durable-object.test.js"],testTimeout:15000}
});
