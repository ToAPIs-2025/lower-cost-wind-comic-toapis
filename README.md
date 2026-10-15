# Lower-cost Wind Comic ToAPIs images

[中文](README_zh-CN.md) · [Original README](README.upstream.md)

[ToAPIs · model pricing & API](https://go2v.toapis.com/wi15ge)

**2026-10-15: 3 real outputs; actual image charges $0.0394 (7.88 credits), confirmed from the backend screenshot.**

The original image-provider registry selects the optional ToAPIs provider and generates real images. Video submission returned HTTP 503; no video output or full-app validation.

## Demo

![Real outputs and actual charges](screenshots/en/01-models.png)

## Prices for the tested models

| Model | Requested preset | Actual pixels | Quote / request | Actual charge |
|---|---|---|---:|---|
| [`gpt-image-2-vip`](https://go2v.toapis.com/wi15v) | low / 1K | 1024×1024 | $0.0019 | $0.0019 / 0.38 credits |
| [`gemini-nano-banana-2.1`](https://x.toapis.com/wi15n) | 1K | 1024×1024 | $0.0150 | $0.0150 / 3 credits |
| [`gpt-image-2.5-flare`](https://im25.toapis.com/wi15f) | high / 1K | 1024×1024 | $0.0225 | $0.0225 / 4.5 credits |

Actual image total: **$0.0394**. Image charges were confirmed from the backend screenshot; 1 credit = $0.005. Global uses owner-provided pricing; other quotes use the live `/v1/pricing` catalog. Different models and quality tiers do not imply equal quality.

## Reproduce

Python 3.11+; Node 22+ for Node/TS native-entry checks.

```bash
python -m pip install Pillow
python generate_case.py --model gpt-image-2-vip --prompt "An original product photograph, no text"
# Dry-run: no network call. Set TOAPIS_API_KEY privately before --live.
python generate_case.py --model gpt-image-2-vip --prompt "An original product photograph, no text" --run-id my-unique-case --output result.png --live
```

`TOAPIS_BASE_URL=https://toapis.com` or `https://toapis.cn`; `/v1` is appended once. `TOAPIS_STATE_DIR` stores private durable task state. `TOAPIS_MAX_IMAGE_USD` defaults to 0.10. Never commit the key or private state.

### Native entry and scope

`lib/image-providers/toapis.ts` registers `toapis-image`; `smoke_native.ts` selects it through the original registry. Build with `npx esbuild smoke_native.ts --bundle --platform=node --format=esm --external:../../toapis_tools/toapis_bridge.mjs --outfile=smoke_native.mjs`, then fix the external bridge path to `./toapis_tools/toapis_bridge.mjs` or use the supplied compiled file. Set `NODE_ENV=test`, `TOAPIS_PYTHON`, `TOAPIS_IMAGE_MODEL`, and a unique `TOAPIS_RUN_ID`.

`node smoke_native.mjs < case.json`. Native image response contains an HTTPS output URL and upstream task ID. References and non-square presets are intentionally disabled.

**Video not accepted:** `lib/video-providers/toapis.ts` and `smoke_video.ts` are supplied as integration work in progress. Grok 1.5 / 4s / 480p quoted $0.0408, submission returned HTTP 503 without an ID. No output, no settled charge confirmed, no automatic retry. ToAPIs errors stop the registry rather than triggering another paid provider.

### API mapping

`POST /v1/images/generations` → persist returned task ID → `GET /v1/images/generations/{id}` → download result without forwarding the API key to the CDN. Bearer authentication is used only for the API origin. No automatic POST retries. Uncertain submissions remain blocked until reconciled.

The adapter maps explicit pixel hints to aspect ratio and sends model-specific resolution fields. JPEG responses are preserved as original JPEG and separately converted to PNG for display; real pixel sizes are recorded. A requested 1K tier is not a guarantee of exactly 1024×1024 pixels.

## Evidence and screenshot walkthrough

- [Per-task records](evidence/)
- [Original outputs](examples/)
- [Model comparison](screenshots/en/01-models.png)
- [API steps](screenshots/en/02-api.png)
- [Reuse and limits](screenshots/en/03-reuse.png)

Upstream: [ChrisChen667788/wind-comic](https://github.com/ChrisChen667788/wind-comic/tree/7e39f530cfc809e23990b8fcf5e0855e9177ebe6), pinned `7e39f530cfc809e23990b8fcf5e0855e9177ebe6`. Community work; no author endorsement or existing partnership is implied. [Attribution](NOTICE.md).

[Dashboard-confirmed itemized image charges](evidence/actual-charges.json). Video submissions without task IDs are excluded and remain unreconciled.

## Upstream sponsor entry preserved

<a href='https://metaso.cn/minimax-h3/?s=wind-comic'><img src='assets/sponsors/metaso.png' width='163' alt='MetaSota - upstream sponsor'></a>

Preserved from the original project; no exclusivity or ToAPIs partnership is inferred.
