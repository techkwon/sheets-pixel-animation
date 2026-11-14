---
name: sheets-pixel-animation-lite
description: 구글 시트 픽셀 애니메이션의 간략판. 주제 한 줄을 받아 Gemini 4 Hydrogen이 Code.gs를 원샷으로 쓰고, clasp로 새 구글 시트를 만들어 코드를 넣는 데까지만 한다(녹화·mp4 없음). 사용자는 받은 링크를 열어 메뉴에서 Setup/Play를 직접 누른다. "시트 애니메이션 시트만 만들어줘", "녹화 없이 시트에 코드만 넣어줘", "시트 애니메이션 간단 버전", "Sheets animation lite" 같은 요청에 사용한다. 녹화·영상까지 원하면 sheets-pixel-animation(전체판)을 쓴다.
metadata:
  version: "1.0.0"
  date: "2026-11-14"
---

# 구글 시트 픽셀 애니메이션 (간략판: 시트 제작까지)

전체판 `sheets-pixel-animation`의 1~3단계만 한다. 프롬프트 규칙과 시트 생성 스크립트는 전체판 것을 그대로 쓴다.
작업 폴더 기본값: `./sheets-anim/<영문-슬러그>/` (현재 폴더 아래)

## 절대 규칙
- 그림(Code.gs)은 Gemini 4 Hydrogen만 쓴다. 사람이나 다른 모델이 픽셀·글자를 손으로 고치지 않는다. 고칠 점이 있으면 `Code.gs`를 `Code.orig.gs`로 옮기고 고칠 점을 prompt.txt에 더해 다시 돌린다.
  - 이 스킬을 agy(Hydrogen)가 읽고 있다면 Code.gs를 직접 쓴 뒤 3단계만 한다.
  - 다른 에이전트(Claude Code, Codex 등)는 직접 그리지 말고 `make_sheet.sh`로 Hydrogen을 부른다.
- `/** @OnlyCurrentDoc */`로 시작, 외부 라이브러리·네트워크 요청 금지(Rules 블록에 들어 있음).
- 녹화·브라우저 조작은 하지 않는다. Google 권한 승인(Allow)은 사용자가 시트에서 처음 Setup을 누를 때 직접 한다.

## 순서

### 1. 프롬프트 쓰기
`<폴더>/prompt.txt` = 영어 한 문단 장면 설명 + 같은 스킬 폴더 옆 `sheets-pixel-animation/references/prompt-rules.md`의 Rules 블록 그대로.
- 장면 요령: 누가, 어디서, 3~4박자 동작(마지막에 터지는 장면), 배경 반복 2~3개, 화면 글자는 정확한 낱말로.
- 시사성 있는 주제(밈·행사)는 먼저 웹에서 사실을 확인한다.

### 2. 한 번에 만들기 (5~7분, 백그라운드 권장)
```bash
<스킬 폴더>/sheets-pixel-animation-lite/scripts/make_sheet.sh <폴더> "<Title> (Gemini 4 Hydrogen)"
```
- `<스킬 폴더>`는 설치한 곳: `~/.gemini/antigravity-cli/skills` 또는 `~/.claude/skills`. 전체판 `sheets-pixel-animation`이 같은 폴더에 함께 설치돼 있어야 한다.
- Hydrogen 실행 → Code.gs 문법·`setup/play/stop/onOpen` 확인 → clasp로 새 시트 생성 + push.
- 끝에 agy가 네트워크 오류로 끝나도 Code.gs가 있고 검사를 통과하면 그대로 진행한다.
- 다시 실행하면 Hydrogen은 건너뛰고 같은 시트에 push만 한다.
- 여러 주제는 폴더마다 백그라운드로 동시에 돌려도 된다.
- clasp가 로그인돼 있어야 한다(`clasp show-authorized-user`, 안 돼 있으면 사용자에게 `clasp login`을 부탁). 처음이면 https://script.google.com/home/usersettings 에서 Google Apps Script API를 켠다.

### 3. 보고
출력의 `SHEET_URL`, 메뉴 이름(`MENU`), `setup=`/`play=` 항목을 사용자에게 알려 준다.
안내 문구: "링크 열기 → 상단 메뉴 <MENU> → <setup 항목> (처음 한 번 권한 승인) → <play 항목>".
Code.gs 안 주석에 적힌 예상 fps가 있으면 같이 전한다.
