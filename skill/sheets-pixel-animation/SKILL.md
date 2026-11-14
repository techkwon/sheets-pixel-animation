---
name: sheets-pixel-animation
description: 주제 한 줄을 받아 구글 시트 셀 수식만으로 움직이는 픽셀 애니메이션을 만든다(Gemini 4 Hydrogen이 Code.gs를 원샷으로 작성). clasp로 새 구글 시트를 만들고 Apps Script 코드를 넣은 뒤, 시트 메뉴의 Setup/Play로 돌리고 ego-lite로 60초 녹화해 mp4로 만든다. "구글 시트 애니메이션", "시트로 그림 그려", "스프레드시트 픽셀 아트", "Sheets animation", "셀 수식 애니메이션" 같은 요청에 사용한다.
metadata:
  version: "1.0.0"
  date: "2026-11-14"
---

# 구글 시트 픽셀 애니메이션

주제를 받아 "모든 셀이 프레임 번호 하나에 반응하는 수식"으로 그린 애니메이션 시트를 만든다.
작업 폴더 기본값: `./sheets-anim/<영문-슬러그>/ (현재 폴더 아래)`

## 절대 규칙
- **그림(Code.gs)은 Gemini 4 Hydrogen만 쓴다.** 사람이나 다른 모델이 픽셀·글자를 손으로 고치지 않는다. 다듬을 게 있으면 고칠 점을 적어 Hydrogen에게 다시 시킨다(원본은 `Code.orig.gs`로 남긴다).
  - 이 스킬을 agy(Hydrogen)가 읽고 있다면: 아래 2단계를 직접 한다.
  - 다른 에이전트(Claude Code, Codex 등)가 읽고 있다면: 직접 그리지 말고 2단계의 agy 명령으로 Hydrogen을 부른다.
- Apps Script는 시트 만들기와 프레임 칸 올리기만 한다. 픽셀을 스크립트가 직접 칠하면 안 된다.
- `/** @OnlyCurrentDoc */`로 시작해 권한을 이 시트 하나로 묶는다. 외부 라이브러리·네트워크 요청 금지.
- Google 권한 승인(Allow)은 사용자가 직접 누른다. 대신 누르지 않는다.
- 자동 녹화(4·5단계)는 ego-lite(ego-browser)가 있을 때만 한다. 없으면 시트 링크를 주고 사용자가 메뉴에서 Setup → Play를 누르게 한 뒤 화면 녹화를 안내한다.

## 순서

### 1. 프롬프트 쓰기
`<폴더>/prompt.txt`에 영어 한 문단 장면 설명 + `references/prompt-rules.md`의 Rules 블록을 그대로 붙인다.
- 장면 설명 요령: 누가(실제 캐릭터면 "drawn as faithfully as you can" + 생김새 특징), 어디서, 3~4박자 동작(마지막에 터지는 장면), 배경 반복 2~3개, 화면 글자는 정확한 낱말로.
- 시사성 있는 주제(밈·행사)는 먼저 웹에서 사실(날짜, 멤버 이름, 밈 내용)을 확인하고 넣는다.

### 2. Hydrogen으로 Code.gs 만들기 (5~6분)
```bash
mkdir -p <폴더>/runs/hydrogen && cd <폴더>/runs/hydrogen
env -i HOME=$HOME PATH=$PATH USER=$USER agy -p "$(cat ../../prompt.txt)" --model gemini-4-hydrogen-high --sandbox --dangerously-skip-permissions --output-format json < /dev/null > log.json 2> err.txt
```
- 여러 주제는 폴더마다 백그라운드로 동시에 돌려도 된다(5개 동시 성공).
- 끝에 네트워크 오류(exit 3)가 나도 `Code.gs`가 있고 문법이 맞으면 쓴다. 확인: `node -e "new Function(require('fs').readFileSync('Code.gs','utf8'))"` + `setup/play/stop/onOpen` 함수가 다 있는지.
- 그다음 `cp Code.gs ../../Code.gs`.

### 3. clasp로 새 시트 만들고 코드 넣기
```bash
~/.gemini/antigravity-cli/skills/sheets-pixel-animation/scripts/new_sheet.sh <폴더> "<Title> (Gemini 4 Hydrogen)"
```
- 출력: `SHEET_ID`, `SHEET_URL`, `MENU`, `setup=<메뉴 항목>`, `play=<메뉴 항목>`. 다시 실행하면 같은 시트에 push만 한다.
- clasp가 로그인돼 있어야 한다(`clasp show-authorized-user`로 확인, 안 돼 있으면 사용자에게 `clasp login`을 부탁). 처음이면 https://script.google.com/home/usersettings 에서 Google Apps Script API를 켜야 한다. 시트는 그 계정 드라이브에 생긴다.

### 4. 돌리고 녹화 (ego-lite, 선택)
```bash
~/.gemini/antigravity-cli/skills/sheets-pixel-animation/scripts/record.sh <이름> <SHEET_ID> "<MENU>" "<setup 항목>" "<play 항목>" <폴더>/rec
```
- 처음엔 `{"need":"auth"}`가 나오고 Google 동의 창이 열린 채 사용자에게 넘어간다. 사용자에게 "Allow를 눌러 달라"고 하고, 승인 뒤 같은 명령을 다시 실행한다. 스크립트(시트)마다 한 번씩 필요하다.
- 성공하면 `{"shots":…, "B1":…}`과 `<폴더>/rec/<이름>/setup.png`, `frames/`가 생긴다.
- ego-lite는 한 TaskSpace에서 열 수 있는 페이지 수에 한도가 있다. 시트는 한 페이지(p1)에서 차례로 연다.

### 5. mp4 만들기
`setup.png`(1788×1041 CSS px)에서 그림 영역의 폭:높이:x:y를 잰다(보통 y=165, x=46~60).
```bash
~/.gemini/antigravity-cli/skills/sheets-pixel-animation/scripts/make_video.sh <폴더>/rec/<이름>/frames <폴더>/runs/hydrogen/play-60s.mp4 964:600:60:165
```
- 프레임은 2배 해상도로 찍히므로 스크립트가 crop을 2배로 바꾼다. 결과와 함께 `play-60s-sheet.jpg`(8칸 미리보기)가 생긴다. 미리보기를 보고 동작·글자가 맞는지 확인한다.

### 6. 보고
사용자에게: 시트 링크, 예상/실측 fps, 미리보기 이미지, mp4 경로, Hydrogen이 틀린 점(고치지 않고 그대로 보고).

## 자주 생기는 문제
- 메뉴가 안 보임(`zero-sized bounding box`): 시트 상단 메뉴가 접힌 상태. record 스크립트가 `#viewModeButton`("Show the menus")을 눌러 펴고 Gemini 옆 패널을 닫는다.
- 메뉴 이름이 시트 제목과 겹쳐 `matched 3 elements`: 스크립트는 `#docs-menubar .menu-button`에서 정확히 같은 글자를 찾아 id로 누른다(id에 `:`가 있어 `[id="…"]` 형식).
- zsh에서 `"$h:flags"`처럼 쓰면 `:f` 수식자로 깨진다. `${h}`로 감싼다.
- 셀 수가 많으면 1fps 아래로 떨어진다. 2,000~2,700칸·16~24색이 약 2fps.
