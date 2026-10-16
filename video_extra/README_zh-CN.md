# Wind Comic 视频补测与模型费用

[English](README.md) · [中文](README_zh-CN.md)

本节仅展示该项目相关的实际测试；原始模型结果和失败记录均保留。

| 模型/API ID | 结果 | 成片 | 单次费用 | 美元/秒 | 费用依据 |
|---|---|---|---:|---:|---|
| Seedance 2 Mini (`seedance-2-mini`) | 成功 | 4.04s / 640×640 | $0.127484 | $0.031555/s | API已结算；后台表单待核对 |

请求参数：4秒、480p、1:1、generate_audio=false、单张首帧，无视频或音频输入。成功输出实际为640×640、24fps、4.04秒。Seedance按总token计费，美元/秒仅为本条已结算费用除以实际成片时长，不是固定秒价。

## Seedance 2 Mini

[![Wind Comic — seedance-2-mini](previews/seedance-2-mini.jpg)](clips/seedance-2-mini.mp4)

[MP4](clips/seedance-2-mini.mp4) · [JSON](seedance-2-mini-summary.json)

原视频注册表 → 可选ToAPIs Provider → Seedance任务 → VideoGenerateResult已验证；完整剧本到成片与UI未验收。

测试时总token报价：$3.285714/百万token。

[对应模型与价格](https://go2.toapis.com/wi16sm)

## 复用

在本教程根目录运行：

```sh
python video_extra/run_seedance_example.py --job video_extra/job.json
# One paid task with your private TOAPIS_API_KEY:
python video_extra/run_seedance_example.py --job video_extra/job.json --live
```

默认不调用API；使用--live才发起单条付费任务。保留.toapis-state；未获任务ID或终态失败时不自动重发。URL下载不携带API Key。

```sh
# In the community fork, opt in explicitly:
# TOAPIS_ENABLE_VIDEO=1; TOAPIS_VIDEO_MODEL=seedance-2-mini
node smoke_video.mjs < video_extra/native-job.json
```

此原生Provider示例只开放4秒、480p、1:1、无声、首帧模式；不宣称尾帧、多主体或原生音频已验证。

[Seedance 2 / 2 Mini API](https://docs.toapis.com/docs/cn/api-reference/videos/seedance-2/generation) · [Seedance 2.5 API](https://docs.toapis.com/docs/cn/api-reference/videos/seedance-2-5/generation)

MiniMax历史样本为5秒/768p，Seedance本节为480p；不能据此断言同画质价格或所有配置的高低。
