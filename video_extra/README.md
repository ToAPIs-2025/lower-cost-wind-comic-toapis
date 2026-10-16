# Wind Comic video additions and model costs

[English](README.md) · [中文](README_zh-CN.md)

Project-specific tested outputs and failed attempts are recorded separately; earlier examples remain intact.

| Model/API ID | Result | Output | Clip cost | USD/second | Cost evidence |
|---|---|---|---:|---:|---|
| Seedance 2 Mini (`seedance-2-mini`) | completed | 4.04s / 640×640 | $0.127484 | $0.031555/s | API settled; owner sheet pending |

Requested: 4 seconds, 480p, 1:1, generate_audio=false, one first frame, no video/audio input. Successful outputs are 640×640, 24 fps and 4.04 seconds. Seedance bills total tokens; USD/second divides this clip’s settled cost by actual output duration, not a fixed per-second rate.

## Seedance 2 Mini

[![Wind Comic — seedance-2-mini](previews/seedance-2-mini.jpg)](clips/seedance-2-mini.mp4)

[MP4](clips/seedance-2-mini.mp4) · [JSON](seedance-2-mini-summary.json)

Original video registry → optional ToAPIs provider → Seedance task → VideoGenerateResult validated. Full script-to-film and UI remain unvalidated.

Total-token rate at test: $3.285714/million tokens.

[Model landing page and pricing](https://go2.toapis.com/wi16sm)

## Reuse

Run from this tutorial’s root directory:

```sh
python video_extra/run_seedance_example.py --job video_extra/job.json
# One paid task with your private TOAPIS_API_KEY:
python video_extra/run_seedance_example.py --job video_extra/job.json --live
```

Default is dry-run. --live makes one paid task. Preserve .toapis-state; missing IDs and terminal failures never trigger automatic resubmission. Result downloads carry no API key.

```sh
# In the community fork, opt in explicitly:
# TOAPIS_ENABLE_VIDEO=1; TOAPIS_VIDEO_MODEL=seedance-2-mini
node smoke_video.mjs < video_extra/native-job.json
```

This native-provider example enables only 4s/480p/1:1/silent first-frame mode; last-frame, subject-reference and native audio support are not validated.

[Seedance 2 / 2 Mini API](https://docs.toapis.com/docs/cn/api-reference/videos/seedance-2/generation) · [Seedance 2.5 API](https://docs.toapis.com/docs/cn/api-reference/videos/seedance-2-5/generation)

The historical MiniMax sample is 5s/768p; these Seedance samples are 480p. They do not establish equal-quality pricing or a universal price ranking.
