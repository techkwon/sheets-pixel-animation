# Rules block (append to every scene description)

Rules:
- Every pixel's colour must come from a spreadsheet formula in that cell (LET, SIN, MOD, INDEX and so on are fine) that depends on a single frame counter cell. Changing the frame counter must re-render the whole picture inside the spreadsheet; Apps Script must not paint pixels itself.
- Use Apps Script only to (1) build the sheet: shrink rows and columns so each cell is a small square pixel, write the formulas, add conditional formatting (or another native method) that maps the formula values to colours, and (2) advance the frame counter in a loop so it animates.
- Make the characters big and clear enough to read, but keep it fast enough to run in a normal Google Sheets file: choose a grid size and colour palette that recalculates quickly, and say what frame rate to expect. One full loop should take about 15 seconds at that frame rate.
- Deliver one file named Code.gs in the current directory. Start it with the line /** @OnlyCurrentDoc */. Include setup() to build everything in the active spreadsheet, play() to animate for about 60 seconds, stop(), an onOpen() menu, and a short comment block explaining how to paste it into Extensions > Apps Script and run it. No external libraries or network requests.
Do it in one go, do not ask questions.

# Scene description recipe (one paragraph, English)
"Turn Google Sheets into an animated pixel-art scene of <WHO, drawn as faithfully as you can / or: draw your own original characters: ...>. <WHERE + time of day>. <3-4 beats of action in order, ending in a payoff moment>. <2-3 ambient loops: snow, sparkles, clouds, spotlights>. <Optional readable blocky pixel text: exact words>. Loop it."

# Proven results (2026-11-14, gemini-4-hydrogen-high, one shot each)
| topic | grid | measured |
|---|---|---|
| Seaside train station | 80x45 | ~2.7 fps |
| Remember November polar bear | 72x38, 16 colours | ~2-2.4 fps |
| Chiikawa weeding (YAHA!) | 64x38 | ~2 fps |
| A2O LITE NEON duo intro | 64x38 | 133 frames / 60 s (~2.2 fps) |
| RESCENE five-member stage | 72x35, 24 colours | ~2 fps |
| Christmas Eve village | 64x36 | ~2.4 fps |
| Suneung cheer D-5 -> D-DAY | 56x32 | ~2 fps |

Lessons:
- About 2,000-2,700 cells and 16-24 colours keeps ~2 fps. 30 frames = one 15 s loop.
- Ask for exact text; long words in a narrow box get clipped (suneung "D-DAY" lost its D). Say "the text must fit inside its box with one pixel of margin".
- Real characters / idols: "drawn as faithfully as you can" works; the user accepts the result as-is.
