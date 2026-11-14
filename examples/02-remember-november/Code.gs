/** @OnlyCurrentDoc */

/**
 * "Remember November 2026" — Animated Pixel-Art Scene in Google Sheets
 *
 * HOW TO INSTALL & RUN:
 * 1. Open a Google Sheet (a blank sheet works best).
 * 2. Go to Extensions > Apps Script.
 * 3. Delete any existing code in Code.gs and paste this entire file.
 * 4. Click Save (Cmd/Ctrl+S), then reload the Google Sheet tab.
 * 5. A new menu "Polar Bear 2026" will appear in the toolbar:
 *    - Click "Polar Bear 2026 > Setup Scene" (authorize when prompted).
 *    - Click "Polar Bear 2026 > Play (~60s)" to start the animation.
 *    - Click "Polar Bear 2026 > Stop" anytime to halt early.
 *    (You can also run setup() and play() directly from the Apps Script editor.)
 *
 * HOW IT WORKS:
 * - Every pixel in B3:BU40 (72 x 38 = 2,736 cells) holds a Google Sheets formula
 *   referencing only the single frame counter cell ($B$1).
 * - Apps Script never paints pixel backgrounds directly; 16 native conditional
 *   formatting rules map the formula outputs (0..15) to the colour palette.
 * - Changing B1 manually re-renders the entire scene inside Google Sheets.
 *
 * EXPECTED FRAME RATE & LOOP TIMING:
 * - Grid: 72 x 38 (2,736 cells), 16-colour palette.
 * - Expected speed in normal Google Sheets: ~3 FPS (~333 ms/frame).
 * - Loop length: 45 frames (~15 seconds per full loop at 3 FPS).
 * - play() runs for ~60 seconds (~4 loops).
 */

const CANVAS_W = 72;
const CANVAS_H = 38;
const CANVAS_START_ROW = 3;
const CANVAS_START_COL = 2; // Column B
const PIXEL_SIZE_PX = 12;

const FRAME_CELL_A1 = "B1";
const STATUS_CELL_A1 = "AC1";
const PHASE_CELL_A1 = "O1";
const STOP_CACHE_KEY = "polar_2026_stop";

const LOOP_FRAMES = 45;
const TARGET_FRAME_MS = 333; // ~3 FPS -> 45 frames ≈ 15s per loop
const PLAY_DURATION_MS = 60000;

// 16-colour palette mapped by conditional formatting (formula value 0..15)
const PALETTE = [
  "#0B152B", // 0: Deep midnight sky
  "#14264A", // 1: Night-blue dusk
  "#1F3966", // 2: Twilight horizon blue
  "#267D7A", // 3: Soft aurora teal
  "#57E3A8", // 4: Soft aurora mint-green
  "#FFE270", // 5: Starlight gold / festive accent
  "#DFEEFC", // 6: Snowy ice field
  "#B5CEE8", // 7: Ice shadow / cool fur shading / page curl
  "#FFFFFF", // 8: Pure snow white / polar bear fur / paper
  "#222B3D", // 9: Charcoal ink / tiny black eyes / calendar text
  "#FF8FA8", // 10: Rosy blush pink / inner ears
  "#D94646", // 11: Calendar header red
  "#8A5A3B", // 12: Warm wood post
  "#8E9BB0", // 13: Metal spiral rings / calendar grid
  "#4E6B94", // 14: Soft dusk-slate bear outline
  "#8A6FD6"  // 15: Soft aurora violet edge
];

// 5-row blocky pixel font for month names & year
const PIXEL_FONT = {
  S: ["###", "#..", "###", "..#", "###"],
  E: ["###", "#..", "###", "#..", "###"],
  P: ["###", "#.#", "###", "#..", "#.."],
  T: ["###", ".#.", ".#.", ".#.", ".#."],
  M: ["#...#", "##.##", "#.#.#", "#...#", "#...#"],
  B: ["##.", "#.#", "##.", "#.#", "##."],
  R: ["##.", "#.#", "##.", "#.#", "#.#"],
  O: ["###", "#.#", "#.#", "#.#", "###"],
  C: ["###", "#..", "#..", "#..", "###"],
  N: ["#..#", "##.#", "#.##", "#..#", "#..#"],
  V: ["#.#", "#.#", "#.#", "#.#", ".#."],
  "2": ["####", "...#", "####", "#...", "####"],
  "0": ["####", "#..#", "#..#", "#..#", "####"],
  "6": ["####", "#...", "####", "#..#", "####"]
};

// Original chubby baby polar bear template (25 x 21)
// ' ' = transparent, o = outline(14), # = white fur(8), s = cool shade(7),
// @ = tiny black eye/nose(9), * = pink inner ear/blush(10)
const BEAR_TEMPLATE = [
  "   oooo       oooo       ",
  "  o#**#o     o#**#o      ",
  "  o####ooooooo####o      ",
  " o#################o     ",
  "o###################o    ",
  "o###################o    ",
  "o#####@#######@#####o    ",
  "o#########@#########o    ",
  "o###ss#########ss###o    ",
  " o#sss#########sss#o     ",
  "  ooossssssssssssooo     ",
  " o#################o     ",
  "o###o###########o###o    ",
  "o##so###########os##o    ",
  "o##so###########os##o    ",
  " oooo##sssssss##oooo     ",
  "   o#############o       ",
  "   o####o   o####o       ",
  "   o###o     o###o       ",
  "   osso       osso       ",
  "    oo         oo        "
];

// Twinkling star coordinates [x, y, phaseOffset]
const STARS = [
  [4, 2, 0], [11, 5, 3], [18, 2, 6], [25, 4, 2],
  [36, 1, 5], [48, 2, 1], [57, 1, 7], [67, 3, 4],
  [8, 8, 8], [23, 7, 1], [64, 3, 9], [2, 5, 4]
];

/**
 * Adds the custom menu when the spreadsheet opens.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Polar Bear 2026")
    .addItem("Setup Scene", "setup")
    .addSeparator()
    .addItem("Play (~60s)", "play")
    .addItem("Stop", "stop")
    .addSeparator()
    .addItem("Jump to November", "jumpToNovember")
    .addItem("Reset Frame (0)", "resetFrame")
    .addToUi();
}

/**
 * Builds the pixel-art grid, formulas, conditional formatting, and HUD.
 */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();

  ensureSheetSize_(sheet, CANVAS_START_ROW + CANVAS_H + 1, CANVAS_START_COL + CANVAS_W);

  sheet.clear();
  sheet.clearConditionalFormatRules();
  sheet.setHiddenGridlines(true);

  configureGridDimensions_(sheet);
  configureHud_(sheet);

  const formulas = buildSceneFormulas_();
  const canvasRange = sheet.getRange(CANVAS_START_ROW, CANVAS_START_COL, CANVAS_H, CANVAS_W);
  canvasRange.setNumberFormat(";;;");
  canvasRange.setFormulas(formulas);

  applyPaletteRules_(sheet, canvasRange);

  SpreadsheetApp.flush();
}

/**
 * Animates the scene by advancing $B$1 at ~3 FPS for ~60 seconds.
 */
function play() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sheet.getRange(CANVAS_START_ROW, CANVAS_START_COL).getFormula() === "") {
    setup();
  }

  const cache = CacheService.getDocumentCache();
  cache.remove(STOP_CACHE_KEY);

  const frameCell = sheet.getRange(FRAME_CELL_A1);
  const statusCell = sheet.getRange(STATUS_CELL_A1);

  let frame = Number(frameCell.getValue());
  if (!Number.isFinite(frame) || frame < 0) {
    frame = 0;
  }

  statusCell.setValue("Playing (~3 FPS)");
  SpreadsheetApp.flush();

  const startMs = Date.now();
  while (Date.now() - startMs < PLAY_DURATION_MS) {
    if (cache.get(STOP_CACHE_KEY) === "1") {
      statusCell.setValue("Stopped");
      SpreadsheetApp.flush();
      return;
    }

    const t0 = Date.now();
    frame += 1;
    frameCell.setValue(frame);
    SpreadsheetApp.flush();

    const remaining = TARGET_FRAME_MS - (Date.now() - t0);
    if (remaining > 20) {
      Utilities.sleep(remaining);
    }
  }

  statusCell.setValue("Finished (60s)");
  SpreadsheetApp.flush();
}

/**
 * Signals any active play() loop to stop cleanly.
 */
function stop() {
  CacheService.getDocumentCache().put(STOP_CACHE_KEY, "1", 300);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.getRange(STATUS_CELL_A1).setValue("Stopping...");
  SpreadsheetApp.flush();
}

/**
 * Jumps directly to the start of NOVEMBER 2026 (frame 29).
 */
function jumpToNovember() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.getRange(FRAME_CELL_A1).setValue(29);
  SpreadsheetApp.flush();
}

/**
 * Resets the frame counter to 0 (SEPTEMBER 2026).
 */
function resetFrame() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.getRange(FRAME_CELL_A1).setValue(0);
  SpreadsheetApp.flush();
}

/**
 * Ensures the active sheet has the exact working dimensions needed.
 */
function ensureSheetSize_(sheet, minRows, minCols) {
  const maxRows = sheet.getMaxRows();
  if (maxRows < minRows) {
    sheet.insertRowsAfter(maxRows, minRows - maxRows);
  } else if (maxRows > minRows + 3) {
    sheet.deleteRows(minRows + 4, maxRows - (minRows + 3));
  }

  const maxCols = sheet.getMaxColumns();
  if (maxCols < minCols) {
    sheet.insertColumnsAfter(maxCols, minCols - maxCols);
  } else if (maxCols > minCols + 2) {
    sheet.deleteColumns(minCols + 3, maxCols - (minCols + 2));
  }
}

/**
 * Shrinks canvas columns and rows into 12x12 square pixels.
 */
function configureGridDimensions_(sheet) {
  sheet.setColumnWidth(1, 52);
  sheet.setColumnWidths(CANVAS_START_COL, CANVAS_W, PIXEL_SIZE_PX);
  sheet.setColumnWidth(CANVAS_START_COL + CANVAS_W, 24);

  sheet.setRowHeight(1, 28);
  sheet.setRowHeight(2, 8);
  sheet.setRowHeights(CANVAS_START_ROW, CANVAS_H, PIXEL_SIZE_PX);
}

/**
 * Sets up the single frame counter cell (B1) and header HUD row.
 */
function configureHud_(sheet) {
  const hud = sheet.getRange(1, 1, 1, CANVAS_START_COL + CANVAS_W);
  hud.setBackground("#0F172A").setFontColor("#E2E8F0").setVerticalAlignment("middle").setFontSize(10);

  sheet.getRange("A1").setValue("Frame:").setFontWeight("bold").setHorizontalAlignment("right");

  const frameCell = sheet.getRange(FRAME_CELL_A1);
  frameCell
    .setValue(0)
    .setNumberFormat("0")
    .setBackground("#1E293B")
    .setFontColor("#FFE270")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setBorder(true, true, true, true, false, false, "#475569", SpreadsheetApp.BorderStyle.SOLID);

  sheet.getRange("D1").setValue("Remember November 2026").setFontWeight("bold").setFontColor("#FFFFFF");

  sheet.getRange(PHASE_CELL_A1).setFormula(
    '=IF(MOD(' + FRAME_CELL_A1 + ',45)<12,"SEPTEMBER 2026",' +
    'IF(MOD(' + FRAME_CELL_A1 + ',45)<16,"Flipping -> OCT...",' +
    'IF(MOD(' + FRAME_CELL_A1 + ',45)<25,"OCTOBER 2026",' +
    'IF(MOD(' + FRAME_CELL_A1 + ',45)<29,"Flipping -> NOV...",' +
    '"NOVEMBER 2026!"))))'
  ).setFontColor("#57E3A8").setFontWeight("bold");

  sheet.getRange(STATUS_CELL_A1).setValue("Ready (change B1 or Play)").setFontColor("#94A3B8");
}

/**
 * Applies 16 conditional formatting rules to map palette IDs 0..15 to hex colours.
 */
function applyPaletteRules_(sheet, canvasRange) {
  const rules = PALETTE.map(function (hex, idx) {
    return SpreadsheetApp.newConditionalFormatRule()
      .whenNumberEqualTo(idx)
      .setBackground(hex)
      .setFontColor(hex)
      .setRanges([canvasRange])
      .build();
  });
  sheet.setConditionalFormatRules(rules);
}

/**
 * Generates the 38 x 72 matrix of spreadsheet formulas referencing $B$1.
 */
function buildSceneFormulas_() {
  const bearPoses = [
    buildBearPose_(false, 0, 0),   // 0: Idle (Sep & Oct)
    buildBearPose_(true, 1, 0),    // 1: Nov bounce base + wave in
    buildBearPose_(true, 1, -1),   // 2: Nov bounce mid + wave in
    buildBearPose_(true, 2, -2),   // 3: Nov bounce peak + wave out
    buildBearPose_(true, 2, -1)    // 4: Nov bounce down + wave out
  ];

  const calSep = buildCalendarLayer_("SEPTEMBER", false);
  const calOct = buildCalendarLayer_("OCTOBER", false);
  const calNov = buildCalendarLayer_("NOVEMBER", true);

  const starMap = {};
  for (let i = 0; i < STARS.length; i++) {
    starMap[STARS[i][0] + "," + STARS[i][1]] = STARS[i][2];
  }

  const formulas = [];
  for (let y = 0; y < CANVAS_H; y++) {
    const row = [];
    for (let x = 0; x < CANVAS_W; x++) {
      row.push(buildPixelFormula_(x, y, bearPoses, calSep, calOct, calNov, starMap));
    }
    formulas.push(row);
  }
  return formulas;
}

/**
 * Builds the formula for a single pixel cell (x, y).
 */
function buildPixelFormula_(x, y, bearPoses, calSep, calOct, calNov, starMap) {
  const key = x + "," + y;
  const fRef = "$" + FRAME_CELL_A1.replace(/(\D+)(\d+)/, "$1$$$2"); // "$B$1"

  // Snowfall lattice constants (2 layers with diagonal wind drift)
  const c1 = x * 7 + y * 11;
  const c2 = x * 13 + y * 17;
  const snowExpr = "OR(MOD(" + c1 + "-7*INT(fr/2)-11*fr,59)=0,MOD(" + c2 + "+13*INT(fr/4)-17*INT(fr/2),83)=0)";

  // 1. Calendar frame/header/paper (keep calendar & letters crisp: no snow overlap)
  const inCalBox = (x >= 28 && x <= 69 && y >= 5 && y <= 29);
  const inCalPaper = (x >= 29 && x <= 68 && y >= 14 && y <= 27);
  const inCalHeader = (x >= 29 && x <= 68 && y >= 6 && y <= 12);

  if (inCalHeader) {
    const baseCol = calSep[key];
    const isHeaderSparkle = ((x === 31 && y === 8) || (x === 32 && y === 10) || (x === 66 && y === 8) || (x === 65 && y === 10));
    if (isHeaderSparkle) {
      return "=LET(fr," + fRef + ",ph,MOD(fr," + LOOP_FRAMES + "),IF(AND(ph>=29,MOD(ph,2)=0),5," + baseCol + "))";
    }
    return "=IF(" + fRef + ">=0," + baseCol + ")";
  }

  if (inCalPaper) {
    const s = calSep[key];
    const o = calOct[key];
    const n = calNov[key];
    return (
      "=LET(fr," + fRef + ",ph,MOD(fr," + LOOP_FRAMES + ")," +
      "IF(ph<12," + s + "," +
      "IF(ph<16,LET(cut,13+(ph-11)*3,IF(" + y + "<cut," + o + ",IF(" + y + "=cut,7,IF(" + y + "=cut+1,13," + s + "))))," +
      "IF(ph<25," + o + "," +
      "IF(ph<29,LET(cut,13+(ph-24)*3,IF(" + y + "<cut," + n + ",IF(" + y + "=cut,7,IF(" + y + "=cut+1,13," + o + "))))," +
      n + ")))))"
    );
  }

  if (inCalBox) {
    return "=IF(" + fRef + ">=0," + calSep[key] + ")";
  }

  // 2. Background expression (sky + aurora + twinkling stars OR snowy ice ground)
  const bgExpr = buildBackgroundExpr_(x, y, starMap);

  // 3. Calendar border / rings / wooden posts
  const cStatic = calSep[key];
  if (cStatic !== undefined) {
    return "=LET(fr," + fRef + ",sn," + snowExpr + ",IF(sn,8," + cStatic + "))";
  }

  // 4. Bear foreground layer (takes priority over snow so face & fur stay clean)
  const b0 = bearPoses[0][key] !== undefined ? bearPoses[0][key] : -1;
  const b1 = bearPoses[1][key] !== undefined ? bearPoses[1][key] : -1;
  const b2 = bearPoses[2][key] !== undefined ? bearPoses[2][key] : -1;
  const b3 = bearPoses[3][key] !== undefined ? bearPoses[3][key] : -1;
  const b4 = bearPoses[4][key] !== undefined ? bearPoses[4][key] : -1;

  const hasBear = (b0 >= 0 || b1 >= 0 || b2 >= 0 || b3 >= 0 || b4 >= 0);
  if (hasBear) {
    let brExpr;
    if (b0 === b1 && b1 === b2 && b2 === b3 && b3 === b4) {
      brExpr = String(b0);
    } else if (b1 === b2 && b2 === b3 && b3 === b4) {
      brExpr = "IF(ph<29," + b0 + "," + b1 + ")";
    } else {
      brExpr = "IF(ph<29," + b0 + ",CHOOSE(MOD(ph-29,4)+1," + b1 + "," + b2 + "," + b3 + "," + b4 + "))";
    }
    return "=LET(fr," + fRef + ",ph,MOD(fr," + LOOP_FRAMES + "),br," + brExpr + ",IF(br>=0,br,IF(" + snowExpr + ",8," + bgExpr + ")))";
  }

  // 5. Pure sky / aurora / star / ice ground pixel
  if (bgExpr.indexOf("ph") !== -1) {
    return "=LET(fr," + fRef + ",ph,MOD(fr," + LOOP_FRAMES + "),IF(" + snowExpr + ",8," + bgExpr + "))";
  }
  return "=LET(fr," + fRef + ",IF(" + snowExpr + ",8," + bgExpr + "))";
}

/**
 * Builds the background formula snippet for (x, y).
 */
function buildBackgroundExpr_(x, y, starMap) {
  const xm = x % 16;
  const horizon = 29 + (xm >= 4 && xm <= 9 ? 1 : 0);

  if (y < horizon) {
    const skyBase = y < 9 ? 0 : (y < 19 ? 1 : 2);
    let expr = String(skyBase);

    if (y <= 14) {
      const a1 = (x * 0.14).toFixed(3);
      const a2 = (x * 0.25).toFixed(3);
      expr =
        "LET(wy,6.5+2.2*SIN(" + a1 + "+fr*0.18)+1.1*COS(" + a2 + "-fr*0.12)," +
        "dist,ABS(" + y + "-wy)," +
        "IF(dist<1.1,4,IF(dist<2.4,3,IF(AND(dist<3.3," + y + "<wy),15," + skyBase + "))))";
    }

    const starPhase = starMap[x + "," + y];
    if (starPhase !== undefined) {
      expr = "LET(st,MOD(fr+" + starPhase + ",10),IF(st<6,5,IF(st<8,8," + expr + ")))";
    }
    return expr;
  }

  // Snowy ice field
  let iceBase = 6;
  if (y === horizon && (x % 7) < 3) {
    iceBase = 8;
  } else if ((x + y * 3) % 19 === 0 && y > 31) {
    iceBase = 7;
  }
  if (y === 33 && ((x >= 35 && x <= 38) || (x >= 59 && x <= 62))) {
    iceBase = 7;
  }

  // Bear's ground shadow at y=32 shrinks when bouncing into the air
  if (y === 32 && x >= 6 && x <= 18) {
    if (x === 6 || x === 18) {
      return "IF(AND(ph>=29,MOD(ph-29,4)>0)," + iceBase + ",7)";
    }
    if (x === 7 || x === 8 || x === 16 || x === 17) {
      return "IF(AND(ph>=29,MOD(ph-29,4)=2)," + iceBase + ",7)";
    }
    return "7";
  }

  return String(iceBase);
}

/**
 * Generates a coordinate -> palette ID map for a bear pose.
 */
function buildBearPose_(blush, wave, dy) {
  const rows = BEAR_TEMPLATE.map(function (r) { return r.split(""); });

  if (blush) {
    [7, 8].forEach(function (rr) {
      [3, 4, 16, 17].forEach(function (cc) {
        rows[rr][cc] = "*";
      });
    });
    rows[8][5] = "#";
    rows[8][15] = "#";
  }

  if (wave > 0) {
    // Tuck lowered right arm cleanly against torso
    rows[11][17] = "#"; rows[11][18] = "o"; rows[11][19] = " "; rows[11][20] = " ";
    rows[12][16] = "#"; rows[12][17] = "o"; rows[12][18] = " "; rows[12][19] = " "; rows[12][20] = " ";
    rows[13][16] = "#"; rows[13][17] = "o"; rows[13][18] = " "; rows[13][19] = " "; rows[13][20] = " ";
    rows[14][16] = "#"; rows[14][17] = "o"; rows[14][18] = " "; rows[14][19] = " "; rows[14][20] = " ";
    rows[15][16] = "o"; rows[15][17] = "o"; rows[15][18] = " "; rows[15][19] = " ";

    if (wave === 1) {
      rows[5][21] = "o"; rows[5][22] = "o";
      rows[6][20] = "o"; rows[6][21] = "#"; rows[6][22] = "#"; rows[6][23] = "o";
      rows[7][20] = "o"; rows[7][21] = "#"; rows[7][22] = "#"; rows[7][23] = "o";
      rows[8][20] = "o"; rows[8][21] = "s"; rows[8][22] = "o";
      rows[9][19] = "o"; rows[9][20] = "#"; rows[9][21] = "o";
      rows[10][18] = "o"; rows[10][19] = "#"; rows[10][20] = "o";
      rows[11][18] = "#"; rows[11][19] = "o";
    } else if (wave === 2) {
      rows[6][22] = "o"; rows[6][23] = "o";
      rows[7][21] = "o"; rows[7][22] = "#"; rows[7][23] = "#"; rows[7][24] = "o";
      rows[8][21] = "o"; rows[8][22] = "#"; rows[8][23] = "#"; rows[8][24] = "o";
      rows[9][20] = "o"; rows[9][21] = "#"; rows[9][22] = "s"; rows[9][23] = "o";
      rows[10][19] = "o"; rows[10][20] = "#"; rows[10][21] = "o";
      rows[11][18] = "#"; rows[11][19] = "#"; rows[11][20] = "o";
    }
  }

  const charMap = { o: 14, "#": 8, s: 7, "@": 9, "*": 10 };
  const xOffset = 1;
  const yOffset = 11 + dy;
  const dict = {};

  for (let ly = 0; ly < rows.length; ly++) {
    for (let lx = 0; lx < rows[ly].length; lx++) {
      const col = charMap[rows[ly][lx]];
      if (col !== undefined) {
        dict[(xOffset + lx) + "," + (yOffset + ly)] = col;
      }
    }
  }
  return dict;
}

/**
 * Generates a coordinate -> palette ID map for a calendar month page.
 */
function buildCalendarLayer_(monthName, festive) {
  const dict = {};

  for (let y = 5; y <= 29; y++) {
    for (let x = 28; x <= 69; x++) {
      if (y === 5 || y === 29 || x === 28 || x === 69) {
        dict[x + "," + y] = 9;
      } else if (y >= 6 && y <= 12) {
        dict[x + "," + y] = 11;
      } else if (y === 13) {
        dict[x + "," + y] = 9;
      } else if (y >= 14 && y <= 27) {
        dict[x + "," + y] = 8;
      } else if (y === 28) {
        dict[x + "," + y] = 7;
      }
    }
  }

  // Spiral binding rings
  [34, 43, 53, 62].forEach(function (rx) {
    dict[rx + ",4"] = 13; dict[(rx + 1) + ",4"] = 13;
    dict[rx + ",5"] = 7;  dict[(rx + 1) + ",5"] = 13;
    dict[rx + ",6"] = 9;  dict[(rx + 1) + ",6"] = 9;
  });

  // Year "2026" centered in header
  const yearW = measurePixelText_("2026");
  drawPixelText_(dict, "2026", 29 + Math.floor((40 - yearW) / 2), 7, 8);

  // Month name centered on page
  const monthW = measurePixelText_(monthName);
  drawPixelText_(dict, monthName, 29 + Math.floor((40 - monthW) / 2), 15, 9);

  // Mini calendar day blocks (7 cols x 3 rows)
  for (let r = 0; r < 3; r++) {
    const yy = 21 + r * 2;
    for (let c = 0; c < 7; c++) {
      const xx = 34 + c * 5;
      let col = 13;
      if (festive && r === 0 && c === 0) {
        col = 11;
      } else if (festive && ((r === 1 && c === 3) || (r === 2 && c === 5))) {
        col = 5;
      }
      dict[xx + "," + yy] = col;
      dict[(xx + 1) + "," + yy] = col;
      dict[(xx + 2) + "," + yy] = col;
    }
  }

  if (festive) {
    dict["31,22"] = 5;
    dict["67,22"] = 5;
  }

  // Wooden mounting posts standing in the ice field
  for (let y = 30; y <= 32; y++) {
    [36, 37, 60, 61].forEach(function (px) {
      dict[px + "," + y] = 12;
    });
  }

  return dict;
}

function measurePixelText_(text) {
  let width = 0;
  for (let i = 0; i < text.length; i++) {
    if (i > 0) width += 1;
    width += PIXEL_FONT[text[i]][0].length;
  }
  return width;
}

function drawPixelText_(dict, text, startX, startY, color) {
  let x = startX;
  for (let i = 0; i < text.length; i++) {
    const glyph = PIXEL_FONT[text[i]];
    const w = glyph[0].length;
    for (let dy = 0; dy < glyph.length; dy++) {
      for (let dx = 0; dx < w; dx++) {
        if (glyph[dy][dx] === "#") {
          dict[(x + dx) + "," + (startY + dy)] = color;
        }
      }
    }
    x += w + 1;
  }
}
