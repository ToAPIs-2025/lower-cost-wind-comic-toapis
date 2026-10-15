// lib/provider-health-cache.ts
var cache = /* @__PURE__ */ new Map();
var DEFAULT_COOLDOWN_MS = 5 * 60 * 1e3;
var MIN_COOLDOWN_MS = 60 * 1e3;
function isProviderHealthy(id) {
  const e = cache.get(id);
  if (!e) return true;
  if (Date.now() >= e.downUntil) {
    cache.delete(id);
    return true;
  }
  return false;
}

// lib/image-providers/registry.ts
var providers = /* @__PURE__ */ new Map();
function registerImageProvider(p) {
  if (!p.id || !p.generate) throw new Error("provider must have id + generate()");
  providers.set(p.id, p);
  if (process.env.NODE_ENV !== "test") {
    console.log(`[ImageProviders] registered ${p.id} (${p.name}, priority=${p.priority}, refs<=${p.maxRefImages})`);
  }
}
function selectProviders(input) {
  const all = Array.from(providers.values());
  const filtered = all.filter((p) => {
    if (input.exclude?.has(p.id)) return false;
    if (!p.available()) return false;
    if (!isProviderHealthy(p.id)) return false;
    if (input.refCount > p.maxRefImages) return false;
    if (input.refCount < (p.minRefImages ?? 0)) return false;
    return true;
  });
  filtered.sort((a, b) => a.priority - b.priority);
  if (input.prefer) {
    const idx = filtered.findIndex((p) => p.id === input.prefer);
    if (idx > 0) {
      const [hit] = filtered.splice(idx, 1);
      filtered.unshift(hit);
    }
  }
  return filtered;
}

// lib/image-providers/toapis.ts
import { generateToAPIsImage } from "./toapis_tools/toapis_bridge.mjs";
var toapisImageProvider = {
  id: "toapis-image",
  name: "ToAPIs async images",
  supportsRefs: false,
  maxRefImages: 0,
  priority: 900,
  available: () => Boolean(process.env.TOAPIS_API_KEY),
  generate: async (input) => {
    if (input.referenceImages?.length || input.cref || input.sref) throw new Error("Reference mapping is not enabled");
    if (input.aspectRatio && input.aspectRatio !== "1:1") throw new Error("Only verified square preset is enabled");
    const r = await generateToAPIsImage({ model: process.env.TOAPIS_IMAGE_MODEL || "gpt-image-2-vip", prompt: input.prompt, run_id: process.env.TOAPIS_RUN_ID || "manual" });
    if (!/^https:\/\//.test(r.url)) throw new Error("Expected HTTPS result URL");
    return { imageUrl: r.url, provider: "toapis-image", upstreamId: r.task_id };
  }
};
registerImageProvider(toapisImageProvider);

// smoke_native.ts
import { readFile } from "node:fs/promises";
var job = JSON.parse(await new Promise(resolve=>{let s='';process.stdin.on('data',c=>s+=c);process.stdin.on('end',()=>resolve(s));}));
var providers2 = selectProviders({ refCount: 0, prefer: "toapis-image" });
var provider = providers2.find((p) => p.id === "toapis-image");
if (!provider) throw new Error("ToAPIs was not selected by the native registry");
var result = await provider.generate({ prompt: job.prompt, aspectRatio: "1:1" });
console.log(JSON.stringify(result));
