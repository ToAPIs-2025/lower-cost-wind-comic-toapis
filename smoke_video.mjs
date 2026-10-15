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

// lib/video-providers/registry.ts
var providers = /* @__PURE__ */ new Map();
function registerVideoProvider(p2) {
  if (!p2 || !p2.id || typeof p2.generate !== "function") {
    throw new Error("[VideoProviders] register: missing required fields (id / generate)");
  }
  if (typeof p2.priority !== "number") {
    throw new Error(`[VideoProviders] register("${p2.id}"): priority must be number`);
  }
  if (typeof p2.maxDurationSec !== "number" || p2.maxDurationSec <= 0) {
    throw new Error(`[VideoProviders] register("${p2.id}"): maxDurationSec must be positive number`);
  }
  if (providers.has(p2.id)) {
    console.warn(`[VideoProviders] overriding existing provider "${p2.id}"`);
  }
  providers.set(p2.id, p2);
}
function listVideoProviders() {
  return [...providers.values()].sort((a, b) => a.priority - b.priority);
}
function selectProviders(input) {
  const wantI2V = input.hasFirstFrame;
  const wantT2V = !input.hasFirstFrame;
  const wantFLF = input.hasLastFrame;
  const wantS2V = input.hasSubjectReference;
  const want = input.durationSec;
  let chain = listVideoProviders().filter((p2) => {
    if (!p2.available()) return false;
    if (!isProviderHealthy(p2.id)) return false;
    if (wantI2V && !p2.supportsImage2Video) return false;
    if (wantT2V && !p2.supportsText2Video) return false;
    if (wantFLF && !p2.supportsLastFrame) return false;
    if (wantS2V && !p2.supportsSubjectReference) return false;
    if (want != null && p2.maxDurationSec < want) return false;
    if (input.exclude && input.exclude.has(p2.id)) return false;
    return true;
  });
  if (input.prefer) {
    const idx = chain.findIndex((p2) => p2.id === input.prefer);
    if (idx > 0) {
      const [hit] = chain.splice(idx, 1);
      chain = [hit, ...chain];
    }
  }
  return chain;
}

// lib/video-providers/toapis.ts
import { generateToAPIsVideo } from "./toapis_tools/toapis_bridge.mjs";
var toapisVideoProvider = {
  id: "toapis-video",
  name: "ToAPIs Grok 1.5 I2V",
  priority: 900,
  supportsImage2Video: true,
  supportsText2Video: false,
  supportsLastFrame: false,
  supportsSubjectReference: false,
  maxDurationSec: 4,
  supportsNativeAudio: false,
  available: () => Boolean(process.env.TOAPIS_API_KEY),
  generate: async (input) => {
    if (input.lastFrameUrl || input.subjectReferences?.length || input.referenceImages?.length || input.nativeAudio || input.spokenDialogue) throw new Error("Unmapped video options");
    return await generateToAPIsVideo({ prompt: input.prompt, image_url: input.firstFrameUrl, duration: input.durationSec || 4, resolution: input.resolution || "480p", aspect_ratio: input.aspectRatio || "1:1", run_id: process.env.TOAPIS_RUN_ID || "manual" });
  }
};
registerVideoProvider(toapisVideoProvider);

// smoke_video.ts
var body = "";
for await (const c of process.stdin) body += c;
var job = JSON.parse(body);
var p = selectProviders({ hasFirstFrame: true, hasLastFrame: false, hasSubjectReference: false, durationSec: 4, prefer: "toapis-video" }).find((p2) => p2.id === "toapis-video");
if (!p) throw new Error("Native video registry did not select ToAPIs");
console.log(JSON.stringify(await p.generate(job)));
