# 更低成本的 Wind Comic 图片与视频方案

<!-- TOAPIS-MODEL-COST-UPDATE-20261016 -->
## 模型类型、测试档位与花费

更新：2026-10-16。下表为已验证案例的历史档位与价格；本段补充不改变下方原批次记录。

| 模型（API ID） | 类型 | 测试档位 | 单次报价 | 已确认单次消费 | 数量 |
|---|---|---|---:|---:|---:|
| gpt-image-2(VIP) (`gpt-image-2-vip`) | 图片 | low / 1K / n=1 | $0.0019/image | $0.0019 | 1 |
| gpt-image-2.5-flare | 图片 | high / 1K / n=1 | $0.0225/image | $0.0225 | 1 |
| Nano Banana 2.1 (`gemini-nano-banana-2.1`) | 图片 | 1K / n=1 | $0.015/image | $0.015 | 1 |

原图片/视频案例已核对消费小计：**$0.0394**。

原图片Provider注册表已验证；新增视频补测走原视频注册表及可选ToAPIs Provider，完整成片未验收。

gpt-image-2(VIP) **$0.0019/image 起**；本表 low/1K 实测档位为 **$0.0019/image**。不同模型、质量和分辨率不代表同质效果。

[视频补测、参数、费用与复用](video_extra/README_zh-CN.md)
<!-- TOAPIS-VIDEO-PREVIEWS-20261016 -->
### Seedance 视频演示与本条消费

[![Wind Comic · Seedance 2 Mini](video_extra/previews/seedance-2-mini.jpg)](https://raw.githubusercontent.com/ToAPIs-2025/lower-cost-wind-comic-toapis/community/toapis-low-cost/video_extra/clips/seedance-2-mini.mp4)

**Seedance 2 Mini** · 480p · 4.04s · **$0.127484/clip** · 约 $0.031555/s

API结算金额；新三条后台表单待交叉核对。美元/秒为本条配置折算。

<!-- /TOAPIS-VIDEO-PREVIEWS-20261016 -->
<!-- /TOAPIS-MODEL-COST-UPDATE-20261016 -->

[English](README.md) · [上游说明](README.upstream.md)

[ToAPIs · 对应模型价格与接入](https://go2v.toapis.com/wi15gc)

**2026-10-15：3 张真实输出，图片实扣合计 $0.0394（7.88积分），后台截图已确认。**

原 ImageProvider/VideoProvider注册表 → 新ToAPIs Provider；全剧本到成片与Next.js页面未验收。

## 演示

![真实输出与实扣](screenshots/cn/01-models.png)

## 本次对应模型价格

| Model | Requested preset | Actual pixels | Quote / request | Actual charge |
|---|---|---|---:|---|
| [`gpt-image-2-vip`](https://go2v.toapis.com/wi15v) | low / 1K | 1024×1024 | $0.0019 | $0.0019 / 0.38 credits |
| [`gemini-nano-banana-2.1`](https://x.toapis.com/wi15n) | 1K | 1024×1024 | $0.0150 | $0.0150 / 3 credits |
| [`gpt-image-2.5-flare`](https://im25.toapis.com/wi15f) | high / 1K | 1024×1024 | $0.0225 | $0.0225 / 4.5 credits |

本次图片实扣合计： **$0.0394**. 本次图片实扣已由后台截图确认；1积分=$0.005。除 global 为用户提供价表，其余为当天实时 `/v1/pricing`。不同模型/画质不是等效质量比较。

## 复现

环境：Python 3.11及以上；Node/TS原生入口验收另需Node 22及以上。

```bash
python -m pip install Pillow
python generate_case.py --model gpt-image-2-vip --prompt "An original product photograph, no text"
# 默认演练不联网。实测前在本机私下配置 TOAPIS_API_KEY，再显式加 --live。
python generate_case.py --model gpt-image-2-vip --prompt "An original product photograph, no text" --run-id my-unique-case --output result.png --live
```

`TOAPIS_BASE_URL`可填`https://toapis.com`或`https://toapis.cn`，只补一次`/v1`。`TOAPIS_STATE_DIR`保存本地私有任务状态；`TOAPIS_MAX_IMAGE_USD`默认单图报价上限为0.10。不要提交Key或私有状态目录。

### 原生入口与范围

`lib/image-providers/toapis.ts`注册`toapis-image`；`smoke_native.ts`通过原注册表选择该Provider。 Build with `npx esbuild smoke_native.ts --bundle --platform=node --format=esm --external:../../toapis_tools/toapis_bridge.mjs --outfile=smoke_native.mjs`, then fix the external bridge path to `./toapis_tools/toapis_bridge.mjs` or use the supplied compiled file. Set `NODE_ENV=test`, `TOAPIS_PYTHON`, `TOAPIS_IMAGE_MODEL`, and a unique `TOAPIS_RUN_ID`.

`node smoke_native.mjs < case.json`. 原生图片响应包含HTTPS结果URL与上游任务ID。参考图和非方图预设尚未开放。

**视频未验收通过：** `lib/video-providers/toapis.ts` and `smoke_video.ts` 是待完成验收的接入代码。 Grok 1.5 / 4s / 480p quoted $0.0408, 提交返回HTTP503且没有任务ID，无视频输出、实扣未知，没有自动重试。ToAPIs报错会中止当前注册表派发，不自动转向另一付费Provider。

### 接口映射

`POST /v1/images/generations`提交一次并保存返回任务ID，再通过`GET /v1/images/generations/{id}`查询结果。下载CDN图片时不转发API Key；Bearer仅发给允许的API域名。没有自动POST重试，未确认是否受理的提交会保留并阻止重复生成。

适配器将像素提示转换为画幅比例，并按模型发送分辨率字段。JPEG结果保留原始字节，另存PNG供展示；真实尺寸均写入记录。请求1K不保证返回恰好1024×1024。

## 证据与截图教程

- [逐任务记录](evidence/)
- [原始输出](examples/)
- [模型对比](screenshots/cn/01-models.png)
- [API调用步骤](screenshots/cn/02-api.png)
- [复用与验收边界](screenshots/cn/03-reuse.png)

Upstream: [ChrisChen667788/wind-comic](https://github.com/ChrisChen667788/wind-comic/tree/7e39f530cfc809e23990b8fcf5e0855e9177ebe6), pinned `7e39f530cfc809e23990b8fcf5e0855e9177ebe6`. 社区独立示例，不代表作者背书或已有合作。[署名与许可](NOTICE.md)。

[后台确认的逐项图片消费](evidence/actual-charges.json)。未取得任务ID的视频提交不计入图片合计，仍单独待核。

## Upstream sponsor entry preserved

<a href='https://metaso.cn/minimax-h3/?s=wind-comic'><img src='assets/sponsors/metaso.png' width='163' alt='MetaSota - upstream sponsor'></a>

Preserved from the original project; no exclusivity or ToAPIs partnership is inferred.

Experimental video registration is disabled by default. It requires an explicit server setting TOAPIS_ENABLE_VIDEO=1 after reconciling the failed submission and confirming a working API contract.
