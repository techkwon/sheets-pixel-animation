/**
 * Seaside Train Station (1x1 All Formulas) — Google Sheets Pixel Art
 *
 * HOW TO INSTALL & RUN:
 * 1. Open a Google Sheet and go to Extensions > Apps Script.
 * 2. Replace the contents of Code.gs with this entire file and save (Cmd/Ctrl + S).
 * 3. In the Apps Script toolbar, select `setup` and click Run (grant permissions when asked).
 *    - This creates the `Scene` and hidden `Sprites` sheets, shrinks cells to 4x4 px,
 *      writes a live formula into every pixel cell, and configures conditional formatting.
 * 4. Select `play` and click Run to animate for ~60 seconds (or reload the sheet and use
 *    the custom "Seaside Station" menu). Run `stop` to halt early, or type any integer
 *    into cell B1 on `Scene` to render that frame immediately.
 *
 * PERFORMANCE NOTES:
 * - Grid: 88 x 48 = 4,224 pixel cells (4x4 px each), 18-color conditional formatting palette.
 * - Expected frame rate: ~2 to 4 FPS in a normal Google Sheets file (recalculation + UI flush).
 */

var SCENE_SHEET_NAME = 'Scene';
var SPRITES_SHEET_NAME = 'Sprites';
var GRID_W = 88;
var GRID_H = 48;
var GRID_TOP = 3;   // Row 3..50
var GRID_LEFT = 2;  // Col B..CK
var PIXEL_PX = 4;
var STOP_CACHE_KEY = 'SEASIDE_STATION_STOP';

// 18-color autumn coastal palette (index 1..18; 0 = transparent in sprites)
var PALETTE = [
  '#2B5B84', // 1: Deep sky / deep ocean
  '#4A89B8', // 2: Mid sky / mid ocean
  '#89C2D9', // 3: Pale sky cyan / shallow sea
  '#F3D5B5', // 4: Warm horizon peach / warm interior glow
  '#FFFFFF', // 5: Crisp white (clouds, foam, lighthouse, sign)
  '#C8D3DF', // 6: Soft cloud shadow / light concrete
  '#6D6A8A', // 7: Distant headland lavender-slate
  '#4A4E5A', // 8: Dark slate (rails, window frame, roof trim)
  '#8C939E', // 9: Medium stone / platform / seawall
  '#5C3A28', // 10: Deep wood (trunk, roof, pillars, sleepers)
  '#A45A3F', // 11: Warm terracotta / bench / roof tiles
  '#D93829', // 12: Autumn crimson leaf / tail light
  '#F27D24', // 13: Autumn burnt orange leaf
  '#F7C948', // 14: Warm gold (ginkgo leaf, lantern, train windows/headlight, reflection)
  '#1E6B52', // 15: Coastal train forest-teal stripe
  '#232733', // 16: Charcoal (wheels, bogies, undercarriage)
  '#1D4D6B', // 17: Mid-dark ocean teal-blue
  '#E8DFCA'  // 18: Warm cream (train body, station wall)
];

// Falling autumn leaf trajectories: [x0, amp, top, height, vy, yOff, freq, phase, colorIdx]
var LEAVES = [
  [4,  1, 11, 26, 0.55, 2,  0.40, 0.2, 12],
  [8,  2, 12, 25, 0.65, 9,  0.35, 1.5, 13],
  [12, 2, 10, 27, 0.50, 17, 0.30, 2.7, 14],
  [16, 1, 13, 24, 0.70, 5,  0.45, 0.9, 12],
  [21, 2, 7,  30, 0.60, 14, 0.32, 2.1, 13],
  [27, 2, 6,  31, 0.52, 22, 0.28, 3.8, 14],
  [34, 1, 8,  29, 0.68, 3,  0.42, 1.1, 12],
  [41, 2, 5,  32, 0.58, 19, 0.34, 4.4, 13],
  [48, 2, 7,  30, 0.64, 11, 0.36, 0.6, 14],
  [56, 1, 9,  28, 0.54, 25, 0.30, 2.9, 12],
  [64, 2, 6,  31, 0.62, 8,  0.38, 5.0, 13],
  [73, 2, 8,  29, 0.56, 16, 0.31, 1.8, 14],
  [82, 1, 10, 27, 0.66, 20, 0.40, 3.3, 12]
];

/**
 * Adds a custom menu when the spreadsheet opens.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Seaside Station')
    .addItem('Setup Scene', 'setup')
    .addItem('Play (60s)', 'play')
    .addItem('Stop', 'stop')
    .addToUi();
}

/**
 * Builds the pixel-art sheet, sprites, 4x4 px grid, cell formulas, and conditional formatting.
 */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var scene = getOrCreateSheet_(ss, SCENE_SHEET_NAME, 0);
  var sprites = getOrCreateSheet_(ss, SPRITES_SHEET_NAME, 1);

  setupSpritesSheet_(sprites);
  setupSceneSheet_(scene);

  ss.setActiveSheet(scene);
  SpreadsheetApp.flush();

  try {
    ss.toast('Seaside Train Station ready! Run play() to animate for 60s, or edit B1.', 'Setup Complete', 6);
  } catch (e) {
    // Ignore toast errors in headless triggers.
  }
}

/**
 * Advances the frame counter in Scene!B1 in a loop for ~60 seconds.
 */
function play() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var scene = ss.getSheetByName(SCENE_SHEET_NAME);
  if (!scene) {
    setup();
    scene = ss.getSheetByName(SCENE_SHEET_NAME);
  }

  var cache = CacheService.getScriptCache();
  cache.remove(STOP_CACHE_KEY);

  var frameCell = scene.getRange('B1');
  var frame = Number(frameCell.getValue());
  if (!isFinite(frame)) {
    frame = 0;
  }

  var durationMs = 60000;
  var minFrameMs = 180;
  var startMs = Date.now();

  while (Date.now() - startMs < durationMs) {
    if (cache.get(STOP_CACHE_KEY) === '1') {
      break;
    }

    var tickStart = Date.now();
    frame += 1;
    frameCell.setValue(frame);
    SpreadsheetApp.flush();

    var elapsed = Date.now() - tickStart;
    if (elapsed < minFrameMs) {
      Utilities.sleep(minFrameMs - elapsed);
    }
  }

  cache.remove(STOP_CACHE_KEY);
}

/**
 * Signals play() to stop at the next frame check.
 */
function stop() {
  CacheService.getScriptCache().put(STOP_CACHE_KEY, '1', 120);
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast('Stopping animation...', 'Seaside Station', 3);
  } catch (e) {
    // Ignore toast errors in headless triggers.
  }
}

/**
 * Returns an existing sheet by name or inserts a new one at index.
 */
function getOrCreateSheet_(ss, name, index) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name, index);
  }
  return sheet;
}

/**
 * Populates the hidden Sprites sheet with numeric palette indices for train and clouds.
 */
function setupSpritesSheet_(sheet) {
  sheet.clear();
  sheet.showSheet();

  var train = buildTrainSprite_();
  var clouds = buildCloudSprites_();

  sheet.getRange('A1').setValue('TRAIN (8x38) -> B2:AM9');
  sheet.getRange(2, 2, train.length, train[0].length).setValues(train);

  sheet.getRange('A11').setValue('CLOUD1 (5x18) -> B12:S16');
  sheet.getRange(12, 2, clouds.c1.length, clouds.c1[0].length).setValues(clouds.c1);

  sheet.getRange('A18').setValue('CLOUD2 (4x14) -> B19:O22');
  sheet.getRange(19, 2, clouds.c2.length, clouds.c2[0].length).setValues(clouds.c2);

  sheet.getRange('A24').setValue('CLOUD3 (3x12) -> B25:M27');
  sheet.getRange(25, 2, clouds.c3.length, clouds.c3[0].length).setValues(clouds.c3);

  sheet.hideSheet();
}

/**
 * Configures the Scene sheet geometry, header bar, pixel formulas, and conditional formatting.
 */
function setupSceneSheet_(sheet) {
  sheet.clear();
  sheet.clearConditionalFormatRules();

  var targetCols = GRID_LEFT + GRID_W; // A + 88 grid cols + CL margin = 90
  var targetRows = GRID_TOP + GRID_H;  // 2 header/spacer rows + 48 grid rows + 1 margin = 51

  ensureSheetSize_(sheet, targetRows, targetCols);
  sheet.setHiddenGridlines(true);

  // Header & margin sizing
  sheet.setRowHeight(1, 28);
  sheet.setRowHeight(2, 6);
  sheet.setRowHeight(targetRows, 12);
  sheet.setColumnWidth(1, 14);
  sheet.setColumnWidth(targetCols, 14);

  // Pixel grid sizing (~4x4 px)
  sheet.setColumnWidths(GRID_LEFT, GRID_W, PIXEL_PX);
  if (typeof sheet.setRowHeightsForced === 'function') {
    sheet.setRowHeightsForced(GRID_TOP, GRID_H, PIXEL_PX);
  } else {
    sheet.setRowHeights(GRID_TOP, GRID_H, PIXEL_PX);
  }

  // Header bar (UI only, outside the pixel grid)
  var headerRange = sheet.getRange(1, 1, 1, targetCols);
  headerRange.breakApart();
  headerRange
    .setBackground('#1B202B')
    .setFontColor('#E2E8F0')
    .setFontFamily('Roboto Mono')
    .setFontSize(10)
    .setVerticalAlignment('middle');

  sheet.getRange('B1:M1')
    .merge()
    .setValue(0)
    .setBackground('#2A3142')
    .setFontColor('#F7C948')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  sheet.getRange(1, 14, 1, GRID_W - 12) // N1:CK1
    .merge()
    .setFontSize(8)
    .setValue('  Frame B1  |  Seaside Train Station (1x1 All Formulas)')
    .setHorizontalAlignment('left');

  // Pixel grid formatting (numbers hidden; colors come exclusively from formulas + CF)
  var gridRange = sheet.getRange(GRID_TOP, GRID_LEFT, GRID_H, GRID_W);
  gridRange
    .setNumberFormat(';;;')
    .setFontSize(2)
    .setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);

  // Build and write per-cell formulas
  var bg = buildStaticBackground_();
  var formulas = [];
  for (var r = 0; r < GRID_H; r++) {
    var rowFormulas = [];
    for (var c = 0; c < GRID_W; c++) {
      rowFormulas.push(buildPixelFormula_(r, c, bg[r][c]));
    }
    formulas.push(rowFormulas);
  }
  gridRange.setFormulas(formulas);

  // Map numeric formula outputs 1..18 to palette hex colors via conditional formatting
  var rules = PALETTE.map(function(hex, idx) {
    return SpreadsheetApp.newConditionalFormatRule()
      .whenNumberEqualTo(idx + 1)
      .setBackground(hex)
      .setFontColor(hex)
      .setRanges([gridRange])
      .build();
  });
  sheet.setConditionalFormatRules(rules);
}

/**
 * Adjusts sheet dimensions to match exact row and column counts.
 */
function ensureSheetSize_(sheet, rows, cols) {
  var maxRows = sheet.getMaxRows();
  if (maxRows < rows) {
    sheet.insertRowsAfter(maxRows, rows - maxRows);
  } else if (maxRows > rows) {
    sheet.deleteRows(rows + 1, maxRows - rows);
  }

  var maxCols = sheet.getMaxColumns();
  if (maxCols < cols) {
    sheet.insertColumnsAfter(maxCols, cols - maxCols);
  } else if (maxCols > cols) {
    sheet.deleteColumns(cols + 1, maxCols - cols);
  }
}

/**
 * Generates the spreadsheet formula for pixel (r, c) driven by $B$1.
 */
function buildPixelFormula_(r, c, base) {
  var expr = String(base);
  var usesF = false;

  // 1. Sky clouds (only on open sky pixels 1..4)
  if (base >= 1 && base <= 4) {
    if (r >= 2 && r <= 6) {
      usesF = true;
      expr = 'LET(cx,92-MOD(ROUND(f*0.35,0),112),cv,IF(AND(cx<=' + c + ',cx>' + (c - 18) + '),INDEX(' +
        SPRITES_SHEET_NAME + '!$B$12:$S$16,' + (r - 1) + ',' + (c + 1) + '-cx),0),IF(cv>0,cv,' + base + '))';
    } else if (r >= 7 && r <= 10) {
      usesF = true;
      expr = 'LET(cx,90-MOD(ROUND(f*0.2,0)+52,108),cv,IF(AND(cx<=' + c + ',cx>' + (c - 14) + '),INDEX(' +
        SPRITES_SHEET_NAME + '!$B$19:$O$22,' + (r - 6) + ',' + (c + 1) + '-cx),0),IF(cv>0,cv,' + base + '))';
    } else if (r >= 12 && r <= 14) {
      usesF = true;
      expr = 'LET(cx,89-MOD(ROUND(f*0.28,0)+25,104),cv,IF(AND(cx<=' + c + ',cx>' + (c - 12) + '),INDEX(' +
        SPRITES_SHEET_NAME + '!$B$25:$M$27,' + (r - 11) + ',' + (c + 1) + '-cx),0),IF(cv>0,cv,' + base + '))';
    }
  }

  // 2. Lighthouse beacon (r=13, c=76..79)
  if (r === 13 && (c === 77 || c === 78)) {
    usesF = true;
    expr = 'IF(MOD(f,10)<3,14,5)';
  } else if (r === 13 && (c === 76 || c === 79)) {
    usesF = true;
    expr = 'IF(MOD(f,10)<3,14,' + expr + ')';
  }

  // 3. Station hanging lantern pulse (r=20, c=29..30)
  if (r === 20 && (c === 29 || c === 30)) {
    usesF = true;
    expr = 'IF(MOD(f,16)<2,4,14)';
  }

  // 4. Background sea shimmer (r=22..29, c>=50)
  if (r >= 22 && r <= 29 && c >= 50) {
    usesF = true;
    var bgSeaPhase = (r * 1.9).toFixed(1);
    expr = 'IF(MOD(' + (c + r * 5) + '+ROUND(SIN(f*0.3+' + bgSeaPhase + ')*2,0),15)=0,3,' + base + ')';
  }

  // 5. Commuter train (r=23..30)
  if (r >= 23 && r <= 30) {
    usesF = true;
    var trainPos = 'm,MOD(f,64),tx,IF(m<20,ROUND(15-53*(1-m/20)^2,0),IF(m<30,15,IF(m<52,ROUND(15+74*((m-30)/21)^2,0),99)))';
    expr = 'LET(' + trainPos + ',tv,IF(AND(tx<=' + c + ',tx>' + (c - 38) + '),INDEX(' +
      SPRITES_SHEET_NAME + '!$B$2:$AM$9,' + (r - 22) + ',' + (c + 1) + '-tx),0),IF(tv>0,tv,' + expr + '))';
  }

  // 6. Foreground coastal sea, foam, and warm reflections (r=35..47)
  if (r === 35) {
    usesF = true;
    expr = 'IF(SIN(' + (c * 0.55).toFixed(2) + '+f*0.45)>0.25,5,3)';
  } else if (r >= 36 && r <= 47) {
    usesF = true;
    if (r <= 40) {
      var wCol = (r <= 38) ? 3 : 6;
      expr = 'IF(SIN(' + (c * 0.32 + r * 1.5).toFixed(2) + '-f*0.3)>0.72,' + wCol + ',' + base + ')';
    } else if (r <= 44) {
      expr = 'IF(SIN(' + (c * 0.28 + r * 1.6).toFixed(2) + '+f*0.24)>0.74,2,' + base + ')';
    } else {
      expr = 'IF(SIN(' + (c * 0.25 + r * 1.3).toFixed(2) + '-f*0.2)>0.76,17,' + base + ')';
    }

    // Station lantern water reflection
    if (r <= 38 && (c === 29 || c === 30)) {
      expr = 'IF(MOD(f+' + (r + c) + ',3)<>0,14,' + expr + ')';
    }

    // Moving train window reflection on coastal water
    if (r <= 39) {
      var reflTrainPos = 'm,MOD(f,64),tx,IF(m<20,ROUND(15-53*(1-m/20)^2,0),IF(m<30,15,IF(m<52,ROUND(15+74*((m-30)/21)^2,0),99)))';
      expr = 'LET(' + reflTrainPos + ',IF(AND(tx<=' + (c - 3) + ',tx>' + (c - 35) + ',MOD(' + c + '-tx,4)<2,MOD(f+' + (r + c) + ',3)=0),14,' + expr + '))';
    }
  }

  // 7. Falling autumn leaves (only leaves whose horizontal sway can reach column c)
  var leafConds = [];
  for (var i = 0; i < LEAVES.length; i++) {
    var lf = LEAVES[i];
    var x0 = lf[0], amp = lf[1], top = lf[2], lh = lf[3], vy = lf[4], yOff = lf[5], freq = lf[6], phase = lf[7], lCol = lf[8];
    if (c >= x0 - amp && c <= x0 + amp && r >= top && r < top + lh) {
      var cond = 'AND(MOD(INT(f*' + vy + '+' + yOff + '),' + lh + ')=' + (r - top) +
        ',ROUND(' + amp + '*SIN(f*' + freq + '+' + phase + '),0)=' + (c - x0) + ')';
      leafConds.push([cond, lCol]);
    }
  }

  if (leafConds.length > 0) {
    usesF = true;
    for (var j = leafConds.length - 1; j >= 0; j--) {
      expr = 'IF(' + leafConds[j][0] + ',' + leafConds[j][1] + ',' + expr + ')';
    }
  }

  if (!usesF) {
    return '=IF(ISNUMBER($B$1),' + base + ',' + base + ')';
  }
  return '=LET(f,$B$1,' + expr + ')';
}

/**
 * Builds the 88x48 static background palette index matrix.
 */
function buildStaticBackground_() {
  var bg = [];
  var r, c, v;

  for (r = 0; r < GRID_H; r++) {
    var row = [];
    for (c = 0; c < GRID_W; c++) {
      if (r <= 4) {
        v = 1;
      } else if (r <= 10) {
        v = 2;
      } else if (r <= 15) {
        v = 3;
      } else if (r <= 20) {
        v = 4;
      } else if (r === 21) {
        v = 17;
      } else if (r <= 27) {
        v = 2;
      } else if (r <= 30) {
        v = (r === 29 && c % 9 < 3) ? 3 : 2;
      } else if (r === 31) {
        v = (c % 3 !== 0) ? 8 : 10;
      } else if (r === 32) {
        v = (c % 5 === 0) ? 6 : 9;
      } else if (r === 33 || r === 34) {
        v = ((c + (r - 33) * 3) % 6 === 0) ? 8 : 9;
      } else if (r <= 37) {
        v = 3;
      } else if (r <= 40) {
        v = 2;
      } else if (r <= 44) {
        v = 17;
      } else {
        v = 1;
      }
      row.push(v);
    }
    bg.push(row);
  }

  // Distant headland (cols 58..87)
  for (c = 58; c < 88; c++) {
    var dist = Math.abs(c - 75);
    var top;
    if (c < 64) {
      top = 20 - Math.floor((c - 58) / 2);
    } else if (c <= 81) {
      top = (dist <= 5) ? 16 : 17;
    } else {
      top = 17 + Math.floor((c - 82) / 3);
    }
    for (r = top; r <= 20; r++) {
      bg[r][c] = 7;
    }
  }

  // Lighthouse on headland (c=77..78, r=12..16)
  bg[12][77] = 12; bg[12][78] = 12;
  bg[13][77] = 5;  bg[13][78] = 5;
  bg[14][77] = 5;  bg[14][78] = 5;
  bg[15][77] = 5;  bg[15][78] = 5;
  bg[16][77] = 6;  bg[16][78] = 6;

  // Station platform (c=13..51, r=29..30)
  for (c = 13; c <= 51; c++) {
    bg[29][c] = (c >= 15 && c <= 49) ? 14 : 9;
    bg[30][c] = 9;
  }

  // Station back wall (c=19..41, r=19..28)
  for (r = 19; r <= 28; r++) {
    for (c = 19; c <= 41; c++) {
      bg[r][c] = (r <= 23) ? 18 : 11;
    }
  }

  // Wooden pillars
  for (r = 19; r <= 28; r++) {
    bg[r][19] = 10;
    bg[r][30] = 10;
    bg[r][41] = 10;
  }

  // Warm waiting room window (c=32..38, r=21..25)
  for (r = 21; r <= 25; r++) {
    for (c = 32; c <= 38; c++) {
      if (r === 21 || r === 25 || c === 32 || c === 38) {
        bg[r][c] = 8;
      } else {
        bg[r][c] = (r === 22 || r === 23) ? 14 : 4;
      }
    }
  }

  // Station door (c=22..25, r=21..28)
  for (r = 21; r <= 28; r++) {
    for (c = 22; c <= 25; c++) {
      bg[r][c] = ((r === 22 || r === 23) && (c === 23 || c === 24)) ? 14 : 10;
    }
  }

  // Waiting bench (c=27..35, r=26..28)
  for (c = 27; c <= 35; c++) {
    bg[26][c] = 11;
    bg[27][c] = 10;
  }
  bg[28][28] = 8;
  bg[28][34] = 8;

  // Station tiled roof (r=15..18)
  for (c = 20; c <= 40; c++) bg[15][c] = 8;
  for (c = 18; c <= 42; c++) bg[16][c] = (c % 3 === 0) ? 10 : 11;
  for (c = 17; c <= 43; c++) {
    bg[17][c] = (c % 3 === 0) ? 10 : 11;
    bg[18][c] = 10;
  }

  // Hanging lantern bracket & lamp
  bg[19][29] = 8; bg[19][30] = 8;
  bg[20][29] = 14; bg[20][30] = 14;

  // Station signboard (c=43..49, r=20..28)
  for (r = 24; r <= 28; r++) bg[r][46] = 8;
  for (r = 20; r <= 23; r++) {
    for (c = 43; c <= 49; c++) {
      if (r === 20 || r === 23 || c === 43 || c === 49) {
        bg[r][c] = 8;
      } else if (r === 22) {
        bg[r][c] = 15;
      } else {
        bg[r][c] = 5;
      }
    }
  }

  // Coastal platform railing (c=43..51, r=26..28)
  for (c = 43; c <= 51; c++) {
    bg[26][c] = 6;
    if (c % 3 === 1) {
      bg[27][c] = 8;
      bg[28][c] = 8;
    }
  }

  // Autumn tree trunk & branches (c=1..16, r=8..30)
  for (r = 19; r <= 30; r++) {
    bg[r][6] = 10;
    bg[r][7] = 10;
  }
  bg[29][5] = 10; bg[30][5] = 10; bg[30][8] = 10;
  bg[18][5] = 10; bg[18][8] = 10;
  bg[17][4] = 10; bg[17][9] = 10;

  var canopy = [
    [8,  5, 11],
    [9,  3, 13],
    [10, 2, 14],
    [11, 1, 15],
    [12, 1, 16],
    [13, 1, 16],
    [14, 1, 16],
    [15, 2, 15],
    [16, 2, 14],
    [17, 3, 13],
    [18, 4, 11]
  ];
  for (var i = 0; i < canopy.length; i++) {
    var cr = canopy[i][0], c0 = canopy[i][1], c1 = canopy[i][2];
    for (c = c0; c <= c1; c++) {
      if ((cr === 17 || cr === 18) && bg[cr][c] === 10) continue;
      var h = (cr * 7 + c * 13) % 10;
      if (cr <= 10 || h === 1 || h === 5) {
        bg[cr][c] = (h % 2 === 0) ? 14 : 13;
      } else if (h === 0 || h === 3 || h === 7) {
        bg[cr][c] = 12;
      } else if (h === 2 || h === 4 || h === 8) {
        bg[cr][c] = 13;
      } else {
        bg[cr][c] = (cr >= 15) ? 12 : 13;
      }
    }
  }
  bg[15][6] = 10; bg[15][7] = 10;
  bg[16][6] = 10; bg[16][8] = 10;

  return bg;
}

/**
 * Builds the 8x38 2-car commuter train sprite matrix.
 */
function buildTrainSprite_() {
  var t = [];
  var r, x;
  for (r = 0; r < 8; r++) {
    var row = [];
    for (x = 0; x < 38; x++) row.push(0);
    t.push(row);
  }

  // Row 0: AC units & pantograph
  [4, 5, 6, 11, 12, 13, 23, 24, 25, 30, 31, 32].forEach(function(px) { t[0][px] = 9; });
  t[0][8] = 8; t[0][9] = 8; t[0][27] = 8;

  // Row 1: roof line
  for (x = 1; x <= 36; x++) t[1][x] = 8;
  [2, 3, 14, 15, 21, 22, 33, 34].forEach(function(px) { t[1][px] = 9; });

  // Rows 2..3: upper body, warm lit windows, coupler gap, front cab
  [2, 3].forEach(function(dy) {
    for (x = 0; x <= 36; x++) t[dy][x] = 18;
    t[dy][0] = 8;
    [2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15].forEach(function(wx) { t[dy][wx] = 14; });
    t[dy][17] = 8;
    t[dy][18] = 0;
    t[dy][19] = 0;
    t[dy][20] = 8;
    [22, 23, 25, 26, 27, 29, 30, 31, 33, 34].forEach(function(wx) { t[dy][wx] = 14; });
    t[dy][35] = 8;
    t[dy][36] = (dy === 2) ? 3 : 8;
  });
  t[3][37] = 8;

  // Row 4: coastal teal stripe, rear tail light, front headlight
  for (x = 0; x < 38; x++) t[4][x] = 15;
  t[4][18] = 8; t[4][19] = 8;
  t[4][0] = 12;
  t[4][37] = 14;

  // Row 5: lower skirt & door seams
  for (x = 0; x <= 36; x++) {
    t[5][x] = (x === 0 || x === 17 || x === 20 || x === 36) ? 15 : 18;
  }
  t[5][18] = 8; t[5][19] = 8;
  [5, 13, 24, 32].forEach(function(dx) { t[5][dx] = 8; });

  // Row 6: undercarriage
  for (x = 1; x <= 16; x++) t[6][x] = 16;
  for (x = 21; x <= 36; x++) t[6][x] = 16;

  // Row 7: bogie wheels
  [3, 4, 5, 12, 13, 14, 23, 24, 25, 32, 33, 34].forEach(function(px) {
    t[7][px] = (px % 2 === 1) ? 16 : 8;
  });

  return t;
}

/**
 * Builds the 3 cloud sprite matrices.
 */
function buildCloudSprites_() {
  return {
    c1: [
      [0,0,0,0,0,5,5,5,5,0,0,0,0,0,0,0,0,0],
      [0,0,0,5,5,5,5,5,5,5,5,0,0,5,5,0,0,0],
      [0,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,0,0],
      [5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,0],
      [0,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,0,0]
    ],
    c2: [
      [0,0,0,5,5,5,5,0,0,0,0,0,0,0],
      [0,5,5,5,5,5,5,5,5,5,5,0,0,0],
      [5,5,5,5,5,5,5,5,5,5,5,5,5,0],
      [0,6,6,6,6,6,6,6,6,6,6,6,0,0]
    ],
    c3: [
      [0,0,5,5,5,5,5,0,0,0,0,0],
      [5,5,5,5,5,5,5,5,5,5,0,0],
      [0,6,6,6,6,6,6,6,6,0,0,0]
    ]
  };
}
