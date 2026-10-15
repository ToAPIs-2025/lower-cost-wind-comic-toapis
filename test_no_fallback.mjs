// test_no_fallback.ts
import assert from "node:assert/strict";

// lib/provider-health-cache.ts
var cache = /* @__PURE__ */ new Map();
var DEFAULT_COOLDOWN_MS = 5 * 60 * 1e3;
var MIN_COOLDOWN_MS = 60 * 1e3;
function markProviderDown(id, ttlMs = DEFAULT_COOLDOWN_MS, reason = "failure") {
  if (!id) return;
  const ttl = Math.max(MIN_COOLDOWN_MS, ttlMs);
  cache.set(id, { downUntil: Date.now() + ttl, reason });
}
function isProviderHealthy(id) {
  const e = cache.get(id);
  if (!e) return true;
  if (Date.now() >= e.downUntil) {
    cache.delete(id);
    return true;
  }
  return false;
}
function markProviderDownIfFatal(id, errMsg) {
  const m = (errMsg || "").toLowerCase();
  if (/(^|[^0-9])401([^0-9]|$)|(^|[^0-9])403([^0-9]|$)|unauthorized|auth.?error|invalid.?api.?key|api key|密钥|鉴权/.test(m)) {
    markProviderDown(id, 5 * 60 * 1e3, "auth");
    return true;
  }
  if (/quota|exhausted|insufficient|余额不足|配额|pre_consume_token_quota_failed|池.?饱和|分组.?饱和|上游.?饱和|saturat/.test(m)) {
    markProviderDown(id, 5 * 60 * 1e3, "quota/saturated");
    return true;
  }
  if (/rate.?limit|429|too many requests|限流/.test(m)) {
    markProviderDown(id, 60 * 1e3, "rate-limit");
    return true;
  }
  return false;
}

// lib/midjourney-params.ts
var VALUE_PARAMS = /* @__PURE__ */ new Set([
  "ar",
  "aspect",
  "bs",
  "c",
  "chaos",
  "cref",
  "cw",
  "end",
  "iw",
  "motion",
  "no",
  "oref",
  "ow",
  "q",
  "quality",
  "r",
  "repeat",
  "s",
  "stylize",
  "seed",
  "sref",
  "stop",
  "style",
  "sv",
  "sw",
  "v",
  "version",
  "w",
  "weird"
]);
var OPTIONAL_VALUE_PARAMS = /* @__PURE__ */ new Set(["p", "profile", "niji"]);
var PARAM_ALIASES = {
  aspect: "ar",
  chaos: "c",
  profile: "p",
  quality: "q",
  repeat: "r",
  stylize: "s",
  version: "v",
  weird: "w"
};
var NO_ITEM_MAX_WORDS = 3;
var PARAM_RE = /(^|\s)--([a-z][a-z0-9]*)(?=\s|$)/gi;
var VALUE_RE = /[ \t]+(\S+)/y;
var NO_WORD_RE = /[ \t]*([^\s,.;:!?()[\]{}"]+)/y;
var NO_COMMA_RE = /[ \t]*,/y;
function readValue(s, pos, optional) {
  VALUE_RE.lastIndex = pos;
  const m = VALUE_RE.exec(s);
  if (!m || m[1].startsWith("--")) return ["", pos];
  const value = m[1].replace(/[,.;:!?)\]]+$/, "");
  if (!value) return ["", pos];
  if (optional && !(/^[a-z0-9]+$/i.test(value) && /\d/.test(value))) return ["", pos];
  return [value, VALUE_RE.lastIndex - (m[1].length - value.length)];
}
function readNoList(s, pos) {
  const items = [];
  let end = pos;
  let p = pos;
  for (; ; ) {
    const words = [];
    const wordEnds = [];
    let q = p;
    for (; ; ) {
      NO_WORD_RE.lastIndex = q;
      const w = NO_WORD_RE.exec(s);
      if (!w || w[1].startsWith("--")) break;
      words.push(w[1]);
      q = NO_WORD_RE.lastIndex;
      wordEnds.push(q);
    }
    if (!words.length) break;
    if (words.length > NO_ITEM_MAX_WORDS) {
      if (!items.length) {
        items.push(words[0]);
        end = wordEnds[0];
      }
      break;
    }
    items.push(words.join(" "));
    end = q;
    NO_COMMA_RE.lastIndex = q;
    if (!NO_COMMA_RE.exec(s)) break;
    p = NO_COMMA_RE.lastIndex;
  }
  return [items.join(", "), end];
}
function parseSegments(prompt) {
  const segs = [];
  let cursor = 0;
  PARAM_RE.lastIndex = 0;
  let m;
  while (m = PARAM_RE.exec(prompt)) {
    const start = m.index + m[1].length;
    segs.push({ text: prompt.slice(cursor, start) });
    const raw = m[2].toLowerCase();
    let pos = start + 2 + m[2].length;
    let value = "";
    if (raw === "no") [value, pos] = readNoList(prompt, pos);
    else if (VALUE_PARAMS.has(raw) || OPTIONAL_VALUE_PARAMS.has(raw)) {
      [value, pos] = readValue(prompt, pos, OPTIONAL_VALUE_PARAMS.has(raw));
    }
    segs.push({ param: { name: PARAM_ALIASES[raw] || raw, value } });
    cursor = pos;
    PARAM_RE.lastIndex = pos;
  }
  segs.push({ text: prompt.slice(cursor) });
  return segs;
}
function joinAt(left, right) {
  let l = left.replace(/[ \t]+$/, "");
  const r = right.replace(/^[ \t]+/, "");
  if (!l) return r;
  if (!r) return l;
  if (/^[,.;:!?]/.test(r)) {
    if (/[,;:]$/.test(l)) l = l.slice(0, -1);
    return l + r;
  }
  if (r.startsWith("\n") || l.endsWith("\n")) return l + r;
  return `${l} ${r}`;
}
var tidy = (s) => s.trim().replace(/^[,.;:]+\s*/, "");
var hasMjSyntax = (s) => /(^|\s)--[a-z]/i.test(s);
function toPlainPrompt(prompt) {
  if (!hasMjSyntax(prompt)) return prompt;
  const pieces = parseSegments(prompt).map((s) => {
    if ("text" in s) return s.text;
    if (s.param.name !== "no" || !s.param.value) return "";
    return `, no ${s.param.value.split(/\s*,\s*/).join(", no ")}`;
  });
  return tidy(pieces.reduce(joinAt, ""));
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
function clearImageProviders() {
  providers.clear();
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
async function dispatchImageGenerate(input, selection) {
  const chain = selectProviders(selection);
  const tried = [];
  const forProvider = (p, i) => p.acceptsMjParams ? i : { ...i, prompt: toPlainPrompt(i.prompt) };
  for (const p of chain) {
    try {
      const r = await p.generate(forProvider(p, input));
      if (r && r.imageUrl && (r.imageUrl.startsWith("http") || r.imageUrl.startsWith("data:"))) {
        return { result: r, tried };
      }
      tried.push({ id: p.id, error: "provider returned empty/invalid imageUrl" });
    } catch (e) {
      const _msg = e instanceof Error ? e.message : String(e);
      if (p.id.startsWith("toapis-")) throw e;
      markProviderDownIfFatal(p.id, _msg);
      tried.push({ id: p.id, error: _msg });
    }
  }
  if (selection.refCount > 0) {
    const noRefChain = selectProviders({ ...selection, refCount: 0 }).filter(
      (p) => !chain.some((c) => c.id === p.id)
    );
    for (const p of noRefChain) {
      try {
        const r = await p.generate(forProvider(p, { ...input, referenceImages: [], cref: void 0, sref: void 0 }));
        if (r && r.imageUrl && (r.imageUrl.startsWith("http") || r.imageUrl.startsWith("data:"))) {
          console.warn(`[ImageProviders] \u4E3B\u8F6E\u5168\u5931\u8D25,\u5DF2\u7528 ${p.id} \u65E0\u53C2\u8003\u56FE\u51FA\u56FE \u2014\u2014 \u8FD9\u5F20\u6CA1\u6709\u98CE\u683C\u951A`);
          return { result: { ...r, refsIgnored: true }, tried };
        }
        tried.push({ id: `${p.id}(no-ref)`, error: "provider returned empty/invalid imageUrl" });
      } catch (e) {
        const _msg = e instanceof Error ? e.message : String(e);
        if (p.id.startsWith("toapis-")) throw e;
        markProviderDownIfFatal(p.id, _msg);
        tried.push({ id: `${p.id}(no-ref)`, error: _msg });
      }
    }
  }
  return { result: null, tried };
}

// lib/video-providers/registry.ts
var providers2 = /* @__PURE__ */ new Map();
function registerVideoProvider(p) {
  if (!p || !p.id || typeof p.generate !== "function") {
    throw new Error("[VideoProviders] register: missing required fields (id / generate)");
  }
  if (typeof p.priority !== "number") {
    throw new Error(`[VideoProviders] register("${p.id}"): priority must be number`);
  }
  if (typeof p.maxDurationSec !== "number" || p.maxDurationSec <= 0) {
    throw new Error(`[VideoProviders] register("${p.id}"): maxDurationSec must be positive number`);
  }
  if (providers2.has(p.id)) {
    console.warn(`[VideoProviders] overriding existing provider "${p.id}"`);
  }
  providers2.set(p.id, p);
}
function clearVideoProviders() {
  providers2.clear();
}
function listVideoProviders() {
  return [...providers2.values()].sort((a, b) => a.priority - b.priority);
}
function selectProviders2(input) {
  const wantI2V = input.hasFirstFrame;
  const wantT2V = !input.hasFirstFrame;
  const wantFLF = input.hasLastFrame;
  const wantS2V = input.hasSubjectReference;
  const want = input.durationSec;
  let chain = listVideoProviders().filter((p) => {
    if (!p.available()) return false;
    if (!isProviderHealthy(p.id)) return false;
    if (wantI2V && !p.supportsImage2Video) return false;
    if (wantT2V && !p.supportsText2Video) return false;
    if (wantFLF && !p.supportsLastFrame) return false;
    if (wantS2V && !p.supportsSubjectReference) return false;
    if (want != null && p.maxDurationSec < want) return false;
    if (input.exclude && input.exclude.has(p.id)) return false;
    return true;
  });
  if (input.prefer) {
    const idx = chain.findIndex((p) => p.id === input.prefer);
    if (idx > 0) {
      const [hit] = chain.splice(idx, 1);
      chain = [hit, ...chain];
    }
  }
  return chain;
}
function diagnoseEmptyChain(input) {
  const all = listVideoProviders();
  const avail = all.filter((p) => {
    try {
      return p.available();
    } catch {
      return false;
    }
  });
  const ignoringDuration = selectProviders2({ ...input, durationSec: void 0 });
  const maxAvail = avail.reduce((m, p) => Math.max(m, p.maxDurationSec), 0);
  const want = input.durationSec;
  let reason;
  if (all.length === 0) {
    reason = "\u6CE8\u518C\u8868\u91CC\u4E00\u4E2A provider \u90FD\u6CA1\u6709";
  } else if (avail.length === 0) {
    reason = `${all.length} \u4E2A provider \u90FD\u4E0D\u53EF\u7528(available() \u4E3A false \u2014\u2014 \u901A\u5E38\u662F\u6CA1\u914D key)`;
  } else if (ignoringDuration.length > 0 && want != null) {
    const caps = avail.filter((p) => p.maxDurationSec < want).map((p) => `${p.id} ${p.maxDurationSec}s`).join(" \xB7 ");
    reason = `\u8BF7\u6C42 ${want}s,\u4F46**\u6CA1\u6709\u4EFB\u4F55\u53EF\u7528\u5F15\u64CE\u652F\u6301\u8FD9\u4E48\u957F**(\u5F53\u524D\u6700\u957F ${maxAvail}s)\u3002\u5404\u5F15\u64CE\u4E0A\u9650:${caps}\u3002\u8FD9\u4E0D\u662F\u300C\u5F15\u64CE\u90FD\u6302\u4E86\u300D\u2014\u2014\u80FD\u529B\u90FD\u5728,\u53EA\u662F\u505A\u4E0D\u4E86\u8FD9\u4E48\u957F;\u8981\u4E48\u628A\u8FD9\u4E00\u955C\u7684\u65F6\u957F\u964D\u5230 ${maxAvail}s \u4EE5\u5185,\u8981\u4E48\u63A5\u4E00\u4E2A\u652F\u6301\u66F4\u957F\u7684\u5F15\u64CE\u3002`;
  } else {
    reason = `${avail.length} \u4E2A\u53EF\u7528 provider \u90FD\u4E0D\u6EE1\u8DB3\u672C\u6B21\u8BF7\u6C42\u7684\u80FD\u529B\u8981\u6C42(I2V/T2V/\u9996\u5C3E\u5E27/\u591A\u4E3B\u4F53)`;
  }
  return {
    registered: all.length,
    availableCount: avail.length,
    wouldMatchIgnoringDuration: ignoringDuration.length,
    maxAvailableDurationSec: maxAvail,
    requestedSec: want,
    reason
  };
}
function isTransientVideoError(msg) {
  const m = (msg || "").toLowerCase();
  if (/(^|\D)(401|403|402|400|429)(\D|$)/.test(m)) return false;
  if (/invalid[_ ]api[_ ]key|unauthor|forbidden|余额不足|insufficient|quota|配额|exclusive|param|审核|sensitive|policy|no available channel|saturated/i.test(msg)) return false;
  return /video-01 error|minimax-fast error|timeout|timed out|econnreset|socket hang|fetch failed|network|(^|\D)(500|502|504)(\D|$)|internal error|server error/i.test(msg);
}
var VIDEO_TRANSIENT_RETRY_DELAY_MS = 3e3;
async function dispatchVideoGenerate(input, selection) {
  const chain = selectProviders2(selection ?? {
    hasFirstFrame: !!input.firstFrameUrl,
    hasLastFrame: !!input.lastFrameUrl,
    hasSubjectReference: !!(input.subjectReferences && input.subjectReferences.length > 0),
    durationSec: input.durationSec
  });
  const tried = [];
  if (chain.length === 0) {
    const d = diagnoseEmptyChain(selection ?? {
      hasFirstFrame: !!input.firstFrameUrl,
      hasLastFrame: !!input.lastFrameUrl,
      hasSubjectReference: !!(input.subjectReferences && input.subjectReferences.length > 0),
      durationSec: input.durationSec
    });
    tried.push({ id: "(chain-empty)", error: d.reason });
    return { result: null, tried };
  }
  const plain = { ...input, prompt: toPlainPrompt(input.prompt) };
  for (const p of chain) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const r = await p.generate(p.acceptsMjParams ? input : plain);
        if (!r || !r.videoUrl) {
          tried.push({ id: p.id, error: "empty result" });
          break;
        }
        const ok = r.videoUrl.startsWith("http") || r.videoUrl.startsWith("data:video");
        if (!ok) {
          tried.push({ id: p.id, error: `invalid videoUrl: ${r.videoUrl.slice(0, 40)}` });
          break;
        }
        return { result: r, tried };
      } catch (e) {
        const _msg = e instanceof Error ? e.message : String(e);
        if (p.id.startsWith("toapis-")) throw e;
        tried.push({ id: p.id, error: _msg });
        if (attempt === 0 && isTransientVideoError(_msg)) {
          console.log(`[VideoDispatch] ${p.id} \u77AC\u65F6\u9519\u8BEF,3s \u540E\u540C\u5F15\u64CE\u91CD\u8BD5\u4E00\u6B21: ${_msg.slice(0, 80)}`);
          await new Promise((res) => setTimeout(res, VIDEO_TRANSIENT_RETRY_DELAY_MS));
          continue;
        }
        markProviderDownIfFatal(p.id, _msg);
        break;
      }
    }
  }
  return { result: null, tried };
}

// test_no_fallback.ts
clearImageProviders();
clearVideoProviders();
var imageFallback = 0;
var videoFallback = 0;
var failure = async () => {
  throw new Error("Uncertain submission; reconcile task state");
};
registerImageProvider({ id: "toapis-test", name: "test", priority: 1, supportsRefs: false, maxRefImages: 0, available: () => true, generate: failure });
registerImageProvider({ id: "other", name: "other", priority: 2, supportsRefs: false, maxRefImages: 0, available: () => true, generate: async () => {
  imageFallback++;
  return { provider: "other", imageUrl: "https://example.com/image.png" };
} });
await assert.rejects(() => dispatchImageGenerate({ prompt: "test" }, { refCount: 0 }));
assert.equal(imageFallback, 0);
var base = { name: "test", supportsImage2Video: true, supportsText2Video: false, supportsLastFrame: false, supportsSubjectReference: false, maxDurationSec: 4, available: () => true };
registerVideoProvider({ ...base, id: "toapis-test", priority: 1, generate: failure });
registerVideoProvider({ ...base, id: "other", priority: 2, generate: async () => {
  videoFallback++;
  return { provider: "other", videoUrl: "https://example.com/video.mp4" };
} });
await assert.rejects(() => dispatchVideoGenerate({ prompt: "test", firstFrameUrl: "https://example.com/image.png" }, { hasFirstFrame: true, hasLastFrame: false, hasSubjectReference: false, durationSec: 4 }));
assert.equal(videoFallback, 0);
console.log("PASS: image/video uncertain submissions never retry or fall back to another paid provider");
