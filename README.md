# 구글 시트 픽셀 애니메이션 — Gemini 4 Hydrogen 실험 기록

> 셀 하나가 픽셀 하나. 모든 셀이 **수식**으로 자기 색을 계산하고, 프레임 번호 칸 하나만 바뀌면 그림 전체가 움직입니다.
> 2026년 11월 구글이 Gemini 4 Hydrogen 발표와 함께 보여 준 "Seaside Train Station (1x1 All Formulas)" 데모를 직접 재현해 보고, 같은 방법으로 9가지 장면을 만든 기록입니다.

**갤러리(영상으로 보기): https://techkwon.github.io/sheets-pixel-animation/**

| | |
|---|---|
| 그린 모델 | Gemini 4 Hydrogen (`gemini-4-hydrogen-high`, Antigravity CLI) |
| 방식 | 프롬프트 한 번에 `Code.gs` 한 파일 (원샷), **사람이 픽셀·글자를 고치지 않음** |
| 실행 | Google Sheets + Apps Script (`@OnlyCurrentDoc`) |
| 속도 | 초당 약 2~3장 (일반 구글 시트, 2,000~4,000칸) |
| 기간 | 2026-11-13 ~ 11-14 |

---

## 1. 무엇을 확인했나

1. **구글 데모는 재현된다.** 같은 규칙(픽셀 색은 수식만, 스크립트는 시트 만들기와 프레임 올리기만)을 주자 Hydrogen이 해변 기차역 장면을 원샷으로 만들었고, 실제 시트에서 초당 약 2.7장으로 움직였습니다.
2. **주제를 바꿔도 된다.** 밈(Remember November), 캐릭터(치이카와), 아이돌 안무(A2O LITE NEON), 계절(크리스마스), 학교 행사(수능 응원), 풍경(겨울 광화문)까지 모두 같은 틀로 나왔습니다.
3. **동시에 여러 개도 된다.** 5개 주제를 동시에 돌려 약 6분 만에 다섯 개 `Code.gs`를 받았습니다.
4. **한계도 있다.** 칸 수가 3,500칸을 넘으면 초당 2장 아래로 떨어지고, 좁은 칸에 긴 글자를 넣으면 잘립니다(수능 판의 `D-DAY`).

## 2. 결과 9가지

| # | 장면 | 격자(칸) | 속도 | 볼거리 | 폴더 | 시트 |
|---|---|---|---|---|---|---|
| 1 | 해변 기차역 (구글 데모 재현) | 88×48 (4,224) | 실측 약 2.7장/초 | 기차, 구름, 낙엽 | [01-seaside-station](examples/01-seaside-station) | [보기](https://docs.google.com/spreadsheets/d/1m6LBBL5cDwkIMeNK3vybOcFgF7f0BA17q6kqjBclD0s/edit?usp=sharing) · [사본](https://docs.google.com/spreadsheets/d/1m6LBBL5cDwkIMeNK3vybOcFgF7f0BA17q6kqjBclD0s/copy) |
| 2 | Remember November 2026 북극곰 | 72×38 (2,736) | 실측 약 2.4장/초 | 달력 9월→10월→11월, 볼 빨개지며 손 흔들기 | [02-remember-november](examples/02-remember-november) | [보기](https://docs.google.com/spreadsheets/d/1Ld7whQD9JxKisNTpY-QEYstR8Hzj2mmRypyh0f8S2F0/edit?usp=sharing) · [사본](https://docs.google.com/spreadsheets/d/1Ld7whQD9JxKisNTpY-QEYstR8Hzj2mmRypyh0f8S2F0/copy) |
| 3 | 치이카와 풀 뽑기 | 64×38 | 예상 약 2장/초 | 하치와레 가르마, 우사기 "YAHA!" | [03-chiikawa](examples/03-chiikawa) | [보기](https://docs.google.com/spreadsheets/d/1PV8_GNtLJD_oO00zcL6lBPt1vKArpdn_JLy4Vqyak3g/edit?usp=sharing) · [사본](https://docs.google.com/spreadsheets/d/1PV8_GNtLJD_oO00zcL6lBPt1vKArpdn_JLy4Vqyak3g/copy) |
| 4 | A2O LITE 〈NEON〉 2인 인트로 | 64×38 | 실측 약 2.2장/초 | 아이징·시리 안무, 자막 "NEON AND BEYOND" ↔ "MIHON N BIHON?!" | [04-a2o-lite-neon](examples/04-a2o-lite-neon) | [보기](https://docs.google.com/spreadsheets/d/16IqpbuEA2qwEGz05GYlRoqEpu8h8PmgmpAthf0cVwQk/edit?usp=sharing) · [사본](https://docs.google.com/spreadsheets/d/16IqpbuEA2qwEGz05GYlRoqEpu8h8PmgmpAthf0cVwQk/copy) |
| 5 | 리센느 무대 v1 | 72×35 | 예상 약 2장/초 | 다섯 명 솔로 포즈 → 하트 (멤버 구분이 어려움) | [05-rescene-v1](examples/05-rescene-v1) | [보기](https://docs.google.com/spreadsheets/d/1fEpJEWywIxpJBjIfydYfHegHvSDN0XGztbSNUR5uL5o/edit?usp=sharing) · [사본](https://docs.google.com/spreadsheets/d/1fEpJEWywIxpJBjIfydYfHegHvSDN0XGztbSNUR5uL5o/copy) |
| 6 | 리센느 무대 v2 | 94×38 (3,572) | 예상 약 1.6장/초 | 이름표 + 멤버별 시그니처 동작 | [06-rescene-v2](examples/06-rescene-v2) | [보기](https://docs.google.com/spreadsheets/d/1opWlQT42DmNEkv1cd3D--UxNh6o-7I0NMY-Kr_s5fOc/edit?usp=sharing) · [사본](https://docs.google.com/spreadsheets/d/1opWlQT42DmNEkv1cd3D--UxNh6o-7I0NMY-Kr_s5fOc/copy) |
| 7 | 크리스마스 이브 마을 | 64×36 | 예상 약 2.4장/초 | 산타 썰매, 트리 불빛, MERRY CHRISTMAS | [07-christmas-eve](examples/07-christmas-eve) | [보기](https://docs.google.com/spreadsheets/d/1mc7P6mslOY-ixMUcP6AoRuoHFq6INOisqOsh_E3q79k/edit?usp=sharing) · [사본](https://docs.google.com/spreadsheets/d/1mc7P6mslOY-ixMUcP6AoRuoHFq6INOisqOsh_E3q79k/copy) |
| 8 | 수능 응원 D-5 → D-DAY | 56×32 | 예상 약 2장/초 | 카운트다운, 엿·찹쌀떡, FIGHTING! | [08-suneung-cheer](examples/08-suneung-cheer) | [보기](https://docs.google.com/spreadsheets/d/11p-ik9Z2REhNWDkPpsFI_h0dz_90Blzp1tgcgaErBGw/edit?usp=sharing) · [사본](https://docs.google.com/spreadsheets/d/11p-ik9Z2REhNWDkPpsFI_h0dz_90Blzp1tgcgaErBGw/copy) |
| 9 | 겨울 광화문 (스킬로 만든 첫 결과) | 72×36 | 예상 약 2장/초 | 눈 오는 광화문, 눈사람 만들기 | [09-winter-gwanghwamun](examples/09-winter-gwanghwamun) | [보기](https://docs.google.com/spreadsheets/d/1mZ__wr-_bx8Fzxepp1ete6WjgKCBkpUCf5BI25xJ2SY/edit?usp=sharing) · [사본](https://docs.google.com/spreadsheets/d/1mZ__wr-_bx8Fzxepp1ete6WjgKCBkpUCf5BI25xJ2SY/copy) |

- "실측"은 60초 동안 실제 시트에서 프레임 번호가 얼마나 올라갔는지로 잰 값, "예상"은 Hydrogen이 코드 주석에 적은 값입니다.
- 각 폴더에는 `prompt.txt`(보낸 프롬프트 전문), `Code.gs`(Hydrogen 원본 그대로), `frames.jpg`(8초 간격 장면 8칸)가 있습니다. 60초 영상은 [갤러리](https://techkwon.github.io/sheets-pixel-animation/)와 `docs/media/`에 있습니다.
- 3~6번은 실제 캐릭터·아이돌을 "최대한 닮게" 그려 달라고 한 팬아트 실험입니다. 원작·초상의 권리는 각 권리자에게 있습니다.

## 3. 원리 (짧게)

```
B1 (프레임 번호) ──► 모든 픽셀 셀: =LET(f,$B$1, ... SIN/MOD/INDEX ... ) → 숫자(색 번호)
                                     │
                         조건부 서식: 색 번호 → 배경색
Apps Script play(): B1 += 1 → SpreadsheetApp.flush() → 반복 (약 60초)
```

- 그림을 그리는 건 **셀 수식**입니다. 스크립트가 셀에 색을 칠하면 규칙 위반으로 봤습니다.
- 스프라이트(캐릭터 모양)는 문자열 표나 숨은 시트에 두고, 수식이 `MID`·`INDEX`로 읽어 위치·프레임에 맞게 찍습니다.
- 색은 조건부 서식 규칙 16~24개로 바꿉니다. 색이 많을수록, 칸이 많을수록 느려집니다.

## 4. 직접 해 보기 — 손으로 (설치 없이)

**가장 쉬운 방법: 공유 시트 사본 만들기**

위 표의 **보기** 링크는 보기 전용이라 멈춘 그림만 보입니다(Play 메뉴는 편집 권한이 있어야 동작). 움직이게 하려면:

1. 표의 **사본** 링크를 누르거나, 시트에서 **파일 → 사본 만들기**를 합니다. Apps Script도 같이 복사됩니다.
2. 내 사본을 열면 메뉴가 생깁니다(몇 초 걸릴 수 있음). 메뉴에서 **Play**를 누르고, 처음 한 번 권한을 승인합니다(이 시트에만 접근하는 `@OnlyCurrentDoc`).
3. 약 60초 동안 움직입니다. 멈추려면 **Stop**.

**코드를 직접 붙여 넣는 방법**


1. 새 구글 시트를 만듭니다.
2. **확장 프로그램 → Apps Script**를 열고, 원하는 예제 폴더의 `Code.gs` 내용을 통째로 붙여 넣고 저장합니다.
3. 함수 목록에서 `setup`을 고르고 **실행** → 권한 승인(이 시트 하나에만 접근하는 `@OnlyCurrentDoc` 권한).
4. 시트로 돌아가 새로 생긴 메뉴에서 **Play**를 누르면 약 60초 동안 움직입니다. 멈추려면 **Stop**.

## 5. 스킬 설치 — 주제만 주면 자동으로 (Antigravity CLI / Claude Code)

`sheets-pixel-animation` 스킬은 주제 한 줄을 받아 **프롬프트 작성 → Hydrogen이 Code.gs 작성 → clasp로 새 시트 만들고 코드 넣기 → (선택) 녹화·mp4** 까지 진행합니다.

### 준비물

| 도구 | 용도 | 설치 |
|---|---|---|
| Antigravity CLI (`agy`) + Gemini 4 Hydrogen 사용 권한 | 그림 그리기 | Antigravity 설치 문서 참고 |
| Node.js, Python 3 | 문법 검사, 보조 스크립트 | |
| clasp | 새 시트 만들기·코드 넣기 | `npm i -g @google/clasp` → `clasp login` |
| Google Apps Script API | clasp가 쓰는 API | https://script.google.com/home/usersettings 에서 켜기 |
| ffmpeg (선택) | 녹화를 mp4로 | `brew install ffmpeg` |
| ego-lite / ego-browser (선택) | Setup·Play 자동 실행과 녹화 | 없으면 시트를 직접 열어 메뉴를 누르면 됩니다 |

### 설치

```bash
git clone https://github.com/techkwon/sheets-pixel-animation.git
cd sheets-pixel-animation
./install.sh            # agy용: ~/.gemini/antigravity-cli/skills/sheets-pixel-animation
./install.sh --claude   # Claude Code에도 같이 설치하려면
```

설치 확인:

```bash
agy -p "Which skills are available to you? Reply with only the names."
```

목록에 `sheets-pixel-animation`이 보이면 됩니다.

### 사용

```bash
agy -p "구글 시트 애니메이션 만들어줘: 벚꽃 날리는 학교 운동장에서 강아지가 공을 쫓는 장면" --model gemini-4-hydrogen-high
```

또는 agy 대화창에서 "주제: ○○로 구글 시트 애니메이션 만들어줘"라고 말하면 됩니다. 끝나면 시트 링크가 나옵니다. 처음 한 번은 시트에서 **Setup**을 누를 때 Google 권한 승인(Allow)을 직접 해야 합니다.

### 스킬 구성

```
skill/sheets-pixel-animation/
├── SKILL.md                    # 순서와 규칙 (agy·Claude가 읽음)
├── references/prompt-rules.md  # 매번 붙이는 규칙 블록, 장면 설명 요령, 측정 결과
└── scripts/
    ├── new_sheet.sh            # clasp로 새 시트 + 코드 넣기, 시트 링크·메뉴 이름 출력
    ├── record.sh / record.mjs.tpl  # ego-lite로 Setup → Play → 68초 캡처 (선택)
    └── make_video.sh           # 캡처를 30fps mp4 + 장면 8칸 이미지로
```

## 6. 프롬프트 요령 (실험에서 배운 것)

- **한 문단 장면 설명 + 규칙 블록**이 기본형입니다. 규칙 블록은 [references/prompt-rules.md](skill/sheets-pixel-animation/references/prompt-rules.md)에 그대로 있습니다.
- 동작은 **3~4박자로, 마지막에 터지는 장면**을 넣습니다(달력이 11월로 넘어가면 손 흔들기, D-DAY에 FIGHTING!).
- 배경 반복(눈, 별, 구름, 조명) 2~3개를 넣으면 프레임마다 화면이 살아 있습니다.
- 화면 글자는 **정확한 낱말**로 주고, "글자가 칸 안에 1픽셀 여백을 두고 들어가야 한다"고 적습니다.
- 실제 인물·캐릭터는 생김새만으로는 구분이 어렵습니다. **이름표 + 그 사람만의 시그니처 동작**(리센느 v2)을 넣으면 확실히 알아봅니다.
- 2,000~2,700칸, 16~24색이면 초당 약 2장. 30프레임이면 15초 한 바퀴입니다.

## 7. 실험 조건과 한계

- 모든 `Code.gs`는 Hydrogen의 **원샷 결과 그대로**입니다. 다듬을 점이 있으면 고칠 점을 적어 Hydrogen에게 다시 시켰습니다(리센느 v1 → v2).
- 과제마다 한 번씩만 실행했습니다. 다시 돌리면 그림이 달라집니다.
- 속도는 시트 크기, 브라우저, 네트워크에 따라 달라집니다. 녹화 영상은 실제 갱신 시점을 그대로 이어 붙인 것입니다(빨리 감기 없음).
- 수능 판은 Hydrogen이 코드를 다 쓴 뒤 마지막 응답에서 네트워크 오류가 났지만, `Code.gs`는 완성돼 있었고 그대로 썼습니다.
- 구글 공식 데모의 프롬프트 원문은 공개되지 않아, 데모 설명을 바탕으로 직접 쓴 프롬프트입니다.

## 8. 폴더 구조

```
examples/      9가지 장면: prompt.txt · Code.gs · frames.jpg
skill/         Antigravity CLI / Claude Code 스킬
docs/          GitHub Pages 갤러리 (index.html, media/*.mp4)
install.sh     스킬 설치 스크립트
```

---

만든 사람: [누구나쉽게 · TechKwon](https://github.com/techkwon) · 그림: Gemini 4 Hydrogen · 정리: Claude
