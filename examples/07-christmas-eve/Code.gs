/** @OnlyCurrentDoc */

/**
 * ============================================================================
 *  Cozy Christmas Eve 2026 — Animated Pixel Art in Google Sheets
 * ============================================================================
 *
 *  HOW TO INSTALL AND RUN:
 *  1. Open any Google Sheet (a blank spreadsheet works best).
 *  2. Go to Extensions > Apps Script.
 *  3. Delete any starter code in Code.gs and paste this entire file.
 *  4. Click Save (Ctrl+S / Cmd+S).
 *  5. In the Apps Script toolbar, select `setup` from the function dropdown
 *     and click Run (grant permission when prompted — it only accesses this
 *     spreadsheet).
 *  6. Return to the Google Sheet. Reload the page once if you want the custom
 *     "Christmas Eve" menu to appear in the menu bar, then choose:
 *       Christmas Eve > Play Animation (~60s)
 *     Or run `play` / `stop` directly from the Apps Script editor or menu!
 *
 *  HOW IT WORKS:
 *  - Every single pixel in the 64x36 grid (`B2:BM37`) contains a spreadsheet
 *    formula referencing ONLY the single frame counter cell (`$AC$1`).
 *  - Changing `$AC$1` manually (e.g. typing 0, 18, 28) re-renders the entire
 *    scene purely inside Google Sheets via Conditional Formatting!
 *  - Expected frame rate: ~2.4 FPS (~415 ms/frame), so 1 full 36-frame loop
 *    takes ~15 seconds, and `play()` runs ~4 loops (~60 seconds).
 * ============================================================================
 */

var SHEET_NAME = 'Christmas Eve 2026';
var GRID_W = 64;
var GRID_H = 36;
var LOOP_FRAMES = 36;
var TARGET_FRAME_MS = 415; // ~2.4 FPS => ~15 seconds per 36-frame loop
var PLAY_DURATION_MS = 60000;
var PIXEL_SIZE_PX = 15;
var FRAME_CELL_A1 = 'AC1';
var FRAME_CELL_REF = '$AC$1';

var PALETTE = {
  1:  '#070B19', // Deep Midnight Sky / Text Outline
  2:  '#0D1530', // Night Sky Mid
  3:  '#152145', // Night Sky Horizon
  4:  '#1C2C54', // Distant Pine Silhouette
  5:  '#F0F6FF', // Crisp Snow White
  6:  '#B8D0EC', // Snow Shadow / Ice Blue
  7:  '#7E9CC2', // Moon Crater / Smoke / Deep Ice
  8:  '#FFF5BA', // Bright Star Core / Moon Highlight
  9:  '#FFD166', // Warm Gold (Star, Moon, MERRY text)
  10: '#FF9F1C', // Cozy Amber / Window Bright / Carrot Nose
  11: '#E06D10', // Warm Deep Amber / Window Glow
  12: '#0F4C3A', // Pine Dark
  13: '#1B6B4A', // Pine Mid
  14: '#2D936C', // Pine Highlight
  15: '#5C3A21', // Dark Wood / Trunk / Reindeer Hooves
  16: '#8B5A2B', // Warm Brown (Reindeer / Cottage Walls)
  17: '#C68B59', // Light Tan (Reindeer Antlers / Belly)
  18: '#D62828', // Festive Crimson Red (Scarf, Nose, Ornament, Gift)
  19: '#FF4D6D', // Rose Magenta (Rainbow / Ornament)
  20: '#38BDF8', // Ice Cyan (Rainbow / Ornament / Gift)
  21: '#A855F7', // Festive Violet (Rainbow / Ornament)
  22: '#4ADE80', // Bright Emerald (Rainbow / Ornament / Gift)
  23: '#202433', // Charcoal (Hat, Eyes, Sleigh, Lamp Post)
  24: '#475569'  // Slate Roof / Chimney / Unlit Ornament
};

var PIXEL_FONT = {
  M: ['10001', '11011', '10101', '10001', '10001'],
  E: ['111', '100', '110', '100', '111'],
  R: ['110', '101', '110', '101', '101'],
  Y: ['101', '101', '010', '010', '010'],
  C: ['011', '100', '100', '100', '011'],
  H: ['101', '101', '111', '101', '101'],
  I: ['111', '010', '010', '010', '111'],
  S: ['011', '100', '010', '001', '110'],
  T: ['111', '010', '010', '010', '010'],
  A: ['010', '101', '111', '101', '101']
};

var ORNAMENTS = [
  { x: 26, y: 28, color: 18, start: 2 },
  { x: 35, y: 28, color: 9,  start: 4 },
  { x: 30, y: 27, color: 20, start: 6 },
  { x: 37, y: 26, color: 19, start: 8 },
  { x: 27, y: 25, color: 22, start: 10 },
  { x: 33, y: 23, color: 21, start: 12 },
  { x: 28, y: 22, color: 10, start: 14 },
  { x: 35, y: 21, color: 18, start: 16 },
  { x: 30, y: 20, color: 20, start: 18 },
  { x: 32, y: 18, color: 9,  start: 20 },
  { x: 31, y: 16, color: 19, start: 22 }
];

var FINALE_GARLAND = [
  { x: 25, y: 27, phase: 1 },
  { x: 33, y: 26, phase: 3 },
  { x: 31, y: 24, phase: 5 },
  { x: 34, y: 22, phase: 2 },
  { x: 30, y: 18, phase: 4 }
];

var SLEIGH_SPRITE = [
  [0, 18, 5,  0,  0, 0, 0, 0, 0, 0, 0, 17, 0, 17],
  [23, 18, 18, 23, 0, 0, 0, 0, 0, 0, 0, 23, 16, 18],
  [23, 23, 18, 23, 23, 0, 0, 0, 0, 16, 16, 16, 0, 0],
  [0, 23, 23, 23, 0, 7, 7, 7, 7, 16, 16, 16, 0, 0],
  [23, 23, 23, 23, 23, 18, 0, 0, 0, 15, 0, 15, 0, 0]
];

var SLEIGH_START_Y = 5;
var RAINBOW_ARRAY_STR = '{18,10,9,22,20,21,19}';

/**
 * Adds the custom "Christmas Eve" menu when the spreadsheet opens.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🎄 Christmas Eve')
    .addItem('1. Build Pixel Scene (setup)', 'setup')
    .addSeparator()
    .addItem('2. Play Animation (~60s)', 'play')
    .addItem('3. Stop Animation', 'stop')
    .addSeparator()
    .addItem('Jump to Finale (Frame 28)', 'jumpToFinale')
    .addItem('Reset to Frame 0', 'resetFrame')
    .addToUi();
}

/**
 * Builds the entire pixel-art grid, formulas, square cell sizing,
 * HUD bar, and conditional formatting palette in the active spreadsheet.
 */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME, 0);
  }
  ss.setActiveSheet(sheet);

  // Clear everything cleanly before rebuilding
  sheet.clear();
  sheet.clearConditionalFormatRules();

  var totalRows = GRID_H + 2; // Row 1 = HUD, Rows 2..37 = 36 pixels, Row 38 = margin
  var totalCols = GRID_W + 2; // Col A = margin, Cols B..BM = 64 pixels, Col BN = margin

  // Ensure exact sheet dimensions so canvas feels like a framed screen
  var maxRows = sheet.getMaxRows();
  if (maxRows < totalRows) {
    sheet.insertRowsAfter(maxRows, totalRows - maxRows);
  } else if (maxRows > totalRows) {
    sheet.deleteRows(totalRows + 1, maxRows - totalRows);
  }

  var maxCols = sheet.getMaxColumns();
  if (maxCols < totalCols) {
    sheet.insertColumnsAfter(maxCols, totalCols - maxCols);
  } else if (maxCols > totalCols) {
    sheet.deleteColumns(totalCols + 1, maxCols - totalCols);
  }

  // Hide gridlines and style outer frame
  sheet.setHiddenGridlines(true);
  sheet.getRange(1, 1, totalRows, totalCols).setBackground('#070B19');

  // Size rows and columns into crisp square pixels
  sheet.setRowHeight(1, 28);
  sheet.setRowHeights(2, GRID_H, PIXEL_SIZE_PX);
  sheet.setRowHeight(totalRows, 14);

  sheet.setColumnWidth(1, 14);
  sheet.setColumnWidths(2, GRID_W, PIXEL_SIZE_PX);
  sheet.setColumnWidth(totalCols, 14);

  // Build Row 1 HUD bar
  buildHud_(sheet);

  // Generate per-pixel spreadsheet formulas
  var formulas = generatePixelFormulas_();
  var gridRange = sheet.getRange(2, 2, GRID_H, GRID_W);
  gridRange.setNumberFormat(';;;');
  gridRange.setHorizontalAlignment('center');
  gridRange.setVerticalAlignment('middle');
  gridRange.setFormulas(formulas);

  // Map formula numbers (1..24) to colors via Conditional Formatting
  var rules = [];
  var ids = Object.keys(PALETTE);
  for (var i = 0; i < ids.length; i++) {
    var id = Number(ids[i]);
    var hex = PALETTE[id];
    rules.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenNumberEqualTo(id)
        .setBackground(hex)
        .setFontColor(hex)
        .setRanges([gridRange])
        .build()
    );
  }
  sheet.setConditionalFormatRules(rules);

  // Reset frame counter to 0 and flush
  sheet.getRange(FRAME_CELL_A1).setValue(0);
  SpreadsheetApp.flush();
  ss.toast('Scene ready! Use menu "🎄 Christmas Eve > Play Animation (~60s)".', 'Setup Complete', 6);
}

/**
 * Animates the scene for ~60 seconds (~4 loops of 15 seconds at ~2.4 FPS)
 * by advancing only the single frame counter cell ($AC$1).
 */
function play() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    setup();
    sheet = ss.getSheetByName(SHEET_NAME);
  }
  ss.setActiveSheet(sheet);

  var frameCell = sheet.getRange(FRAME_CELL_A1);
  var runId = String(Date.now());
  setPlayState_('0', runId);

  var current = Number(frameCell.getValue());
  var frame = isNaN(current) ? 0 : ((Math.floor(current) % LOOP_FRAMES) + LOOP_FRAMES) % LOOP_FRAMES;
  var startTime = Date.now();

  while (Date.now() - startTime < PLAY_DURATION_MS) {
    if (shouldStop_(runId)) {
      break;
    }

    var t0 = Date.now();
    frameCell.setValue(frame);
    SpreadsheetApp.flush();

    frame = (frame + 1) % LOOP_FRAMES;
    var elapsed = Date.now() - t0;
    var sleepMs = TARGET_FRAME_MS - elapsed;
    if (sleepMs > 20) {
      Utilities.sleep(sleepMs);
    }
  }
}

/**
 * Signals any active play() loop to stop cleanly.
 */
function stop() {
  setPlayState_('1', null);
  SpreadsheetApp.getActiveSpreadsheet().toast('Animation stopped.', '🎄 Christmas Eve', 3);
}

/**
 * Convenience helper to preview the MERRY CHRISTMAS + rainbow finale immediately.
 */
function jumpToFinale() {
  setFrame_(28);
}

/**
 * Convenience helper to reset the scene to frame 0.
 */
function resetFrame() {
  setFrame_(0);
}

function setFrame_(value) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    setup();
    sheet = ss.getSheetByName(SHEET_NAME);
  }
  sheet.getRange(FRAME_CELL_A1).setValue(value);
  SpreadsheetApp.flush();
}

function setPlayState_(stopFlag, runId) {
  try {
    var cache = CacheService.getDocumentCache();
    if (cache) {
      cache.put('XMAS_STOP', stopFlag, 300);
      if (runId !== null) {
        cache.put('XMAS_RUN_ID', runId, 300);
      }
    }
  } catch (e) {
    // Ignore cache errors if unavailable
  }
}

function shouldStop_(runId) {
  try {
    var cache = CacheService.getDocumentCache();
    if (!cache) return false;
    if (cache.get('XMAS_STOP') === '1') return true;
    var activeRun = cache.get('XMAS_RUN_ID');
    if (activeRun && activeRun !== runId) return true;
  } catch (e) {
    // Ignore cache errors if unavailable
  }
  return false;
}

/**
 * Configures the Row 1 HUD header and single frame counter cell ($AC$1).
 */
function buildHud_(sheet) {
  var titleRange = sheet.getRange('B1:Z1');
  titleRange.merge();
  titleRange
    .setValue('🎄 CHRISTMAS EVE 2026  •  COZY PIXEL VILLAGE')
    .setFontColor('#FFD166')
    .setFontWeight('bold')
    .setFontSize(10)
    .setVerticalAlignment('middle');

  var labelRange = sheet.getRange('AA1:AB1');
  labelRange.merge();
  labelRange
    .setValue('FRAME:')
    .setFontColor('#B8D0EC')
    .setFontWeight('bold')
    .setFontSize(9)
    .setHorizontalAlignment('right')
    .setVerticalAlignment('middle');

  var fc = sheet.getRange(FRAME_CELL_A1);
  fc.setBackground('#152145')
    .setFontColor('#FFD166')
    .setFontWeight('bold')
    .setFontSize(11)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setNumberFormat('0')
    .setBorder(true, true, true, true, false, false, '#FFD166', SpreadsheetApp.BorderStyle.SOLID);

  var statusRange = sheet.getRange('AD1:AW1');
  statusRange.merge();
  statusRange
    .setFormula('=IF(MOD(' + FRAME_CELL_REF + ',36)<24,"✨ Decorating Tree & Sleigh Ride ("&MOD(' + FRAME_CELL_REF + ',36)&"/35)","🌈 MERRY CHRISTMAS! ("&MOD(' + FRAME_CELL_REF + ',36)&"/35)")')
    .setFontColor('#F0F6FF')
    .setFontSize(9)
    .setVerticalAlignment('middle');

  var hintRange = sheet.getRange('AX1:BM1');
  hintRange.merge();
  hintRange
    .setValue('Edit AC1 to scrub • ~2.4 FPS')
    .setFontColor('#7E9CC2')
    .setFontSize(8)
    .setHorizontalAlignment('right')
    .setVerticalAlignment('middle');
}

/**
 * Generates a 36x64 matrix of Google Sheets formulas. Every cell's formula
 * depends directly on $AC$1 and computes its own palette ID (1..24).
 */
function generatePixelFormulas_() {
  var scene = buildStaticScene_();
  var base = scene.grid;
  var skyMask = scene.skyMask;

  // Lookup maps for special per-pixel layers
  var ornamentMap = {};
  for (var i = 0; i < ORNAMENTS.length; i++) {
    var o = ORNAMENTS[i];
    ornamentMap[o.x + ',' + o.y] = { index: i, color: o.color, start: o.start };
  }

  var garlandMap = {};
  for (var g = 0; g < FINALE_GARLAND.length; g++) {
    var gl = FINALE_GARLAND[g];
    garlandMap[gl.x + ',' + gl.y] = gl.phase;
  }

  var windowMap = {};
  var winCoords = [
    [2, 26], [3, 26], [2, 27], [3, 27],
    [8, 26], [9, 26], [8, 27], [9, 27],
    [54, 26], [55, 26], [56, 26],
    [54, 27], [55, 27], [56, 27],
    [54, 28], [55, 28], [56, 28]
  ];
  for (var w = 0; w < winCoords.length; w++) {
    windowMap[winCoords[w][0] + ',' + winCoords[w][1]] = w;
  }

  var merryFg = computeTextPixels_('MERRY', 11, 1);
  var xmasFg = computeTextPixels_('CHRISTMAS', 3, 7);
  var textLayer = buildTextLayerMap_(merryFg, xmasFg);

  var formulas = [];
  for (var y = 0; y < GRID_H; y++) {
    var row = [];
    for (var x = 0; x < GRID_W; x++) {
      var key = x + ',' + y;
      var expr = String(base[y][x]);
      var usesDynamic = false;

      // 1. Static ground glow & warm windows / lamp posts
      if (windowMap.hasOwnProperty(key)) {
        var wp = windowMap[key];
        expr = 'INDEX({8,10,11,10,11,10},MOD(' + FRAME_CELL_REF + '+' + wp + ',6)+1)';
        usesDynamic = true;
      } else if (x === 12 && y === 25) {
        expr = 'IF(MOD(' + FRAME_CELL_REF + ',2)=0,8,9)';
        usesDynamic = true;
      } else if (x === 50 && y === 25) {
        expr = 'IF(MOD(' + FRAME_CELL_REF + ',2)=1,8,9)';
        usesDynamic = true;
      } else if (ornamentMap.hasOwnProperty(key)) {
        // 2. Tree ornaments light up one-by-one, then blink in a rainbow pattern
        var orn = ornamentMap[key];
        expr = 'LET(u,MOD(' + FRAME_CELL_REF + ',36),IF(u>=24,INDEX(' + RAINBOW_ARRAY_STR + ',MOD(' + FRAME_CELL_REF + '+' + orn.index + ',7)+1),IF(u>=' + orn.start + ',' + orn.color + ',24)))';
        usesDynamic = true;
      } else if (garlandMap.hasOwnProperty(key)) {
        expr = 'IF(MOD(' + FRAME_CELL_REF + ',36)>=24,INDEX(' + RAINBOW_ARRAY_STR + ',MOD(' + FRAME_CELL_REF + '+' + garlandMap[key] + ',7)+1),' + base[y][x] + ')';
        usesDynamic = true;
      } else if (x === 31 && y === 13) {
        // 3. Tree star core & sparkling rays
        expr = FRAME_CELL_REF + '*0+8';
        usesDynamic = true;
      } else if ((x === 31 && (y === 12 || y === 14)) || (y === 13 && (x === 30 || x === 32))) {
        expr = 'IF(OR(MOD(' + FRAME_CELL_REF + ',2)=0,MOD(' + FRAME_CELL_REF + ',36)>=24),8,9)';
        usesDynamic = true;
      } else if ((x === 30 || x === 32) && (y === 12 || y === 14)) {
        expr = 'IF(OR(MOD(' + FRAME_CELL_REF + ',3)=0,MOD(' + FRAME_CELL_REF + ',36)>=24),9,' + base[y][x] + ')';
        usesDynamic = true;
      } else if (y === 13 && (x === 29 || x === 33)) {
        expr = 'IF(AND(MOD(' + FRAME_CELL_REF + ',36)>=24,MOD(' + FRAME_CELL_REF + ',2)=0),8,' + buildSkyExpr_(x, y, base[y][x], true) + ')';
        usesDynamic = true;
      } else if (x === 20 && y === 26) {
        // 4. Snowman arm & scarf animation
        expr = 'IF(MOD(INT(' + FRAME_CELL_REF + '/2),2)=0,23,' + base[y][x] + ')';
        usesDynamic = true;
      } else if (x === 20 && y === 27) {
        expr = 'IF(MOD(INT(' + FRAME_CELL_REF + '/2),2)=1,23,' + base[y][x] + ')';
        usesDynamic = true;
      } else if (x === 21 && y === 25) {
        expr = 'IF(MOD(INT(' + FRAME_CELL_REF + '/2),2)=0,23,' + base[y][x] + ')';
        usesDynamic = true;
      } else if (x === 21 && y === 24) {
        expr = 'IF(MOD(INT(' + FRAME_CELL_REF + '/2),2)=0,18,' + base[y][x] + ')';
        usesDynamic = true;
      } else if (x === 21 && y === 28) {
        expr = 'IF(MOD(INT(' + FRAME_CELL_REF + '/2),2)=1,23,' + base[y][x] + ')';
        usesDynamic = true;
      } else if (x === 14 && y === 27) {
        expr = 'IF(MOD(' + FRAME_CELL_REF + ',3)=0,' + base[y][x] + ',18)';
        usesDynamic = true;
      } else if (x === 14 && y === 28) {
        expr = 'IF(MOD(' + FRAME_CELL_REF + ',3)=0,18,' + base[y][x] + ')';
        usesDynamic = true;
      } else if (x === 41 && y === 23) {
        // 5. Reindeer glowing red nose & wagging tail
        expr = 'IF(MOD(' + FRAME_CELL_REF + ',3)=0,19,18)';
        usesDynamic = true;
      } else if (x === 48 && y === 26) {
        expr = 'IF(MOD(' + FRAME_CELL_REF + ',2)=0,' + base[y][x] + ',17)';
        usesDynamic = true;
      } else if (x === 48 && y === 25) {
        expr = 'IF(MOD(' + FRAME_CELL_REF + ',2)=0,17,' + base[y][x] + ')';
        usesDynamic = true;
      } else if (skyMask[y][x]) {
        // 6. Twinkling stars, chimney smoke, and falling snow
        expr = buildSkyExpr_(x, y, base[y][x], false);
        usesDynamic = true;
      }

      // 7. Santa's sleigh crossing the sky in front of the big moon (rows 5..9)
      if (y >= SLEIGH_START_Y && y < SLEIGH_START_Y + SLEIGH_SPRITE.length) {
        var sr = y - SLEIGH_START_Y;
        var uMin = Math.max(2, Math.ceil((x + 6) / 3));
        var uMax = Math.min(23, Math.floor((x + 19) / 3));
        if (uMin <= uMax) {
          var arrStr = '{' + SLEIGH_SPRITE[sr].join(',') + '}';
          var idxExpr = (x + 20) + '-3*u';
          expr = 'LET(u,MOD(' + FRAME_CELL_REF + ',36),s,IF(AND(u>=' + uMin + ',u<=' + uMax + '),INDEX(' + arrStr + ',' + idxExpr + '),0),IF(s>0,s,' + expr + '))';
          usesDynamic = true;
        }
      }

      // 8. MERRY CHRISTMAS blocky pixel text at the end (frames 24..35)
      if (textLayer.hasOwnProperty(key)) {
        expr = 'IF(MOD(' + FRAME_CELL_REF + ',36)>=24,' + textLayer[key] + ',' + expr + ')';
        usesDynamic = true;
      }

      // Guarantee every single cell in the grid references $AC$1
      if (!usesDynamic) {
        expr = FRAME_CELL_REF + '*0+' + expr;
      }

      row.push('=' + expr);
    }
    formulas.push(row);
  }
  return formulas;
}

/**
 * Builds sky expression combining twinkling stars, chimney smoke, and falling snow.
 */
function buildSkyExpr_(x, y, baseVal, skipSmoke) {
  var under = String(baseVal);

  // Twinkling star check
  var isStar = (((x * 13 + y * 29) % 47) === 0) && y <= 14;
  if (isStar) {
    var starPhase = (x + y) % 6;
    under = 'IF(MOD(' + FRAME_CELL_REF + '+' + starPhase + ',6)<2,8,' + under + ')';
  }

  // Rising chimney smoke over left & right cottages (y = 14..17)
  if (!skipSmoke && y >= 14 && y <= 17) {
    if (x === 1 || x === 2) {
      var leftParity = (x === 1) ? 0 : 1;
      var yShiftL = (17 - y) % 2;
      under = 'IF(AND(MOD(' + FRAME_CELL_REF + '+' + y + ',3)=0,MOD(' + FRAME_CELL_REF + '+' + yShiftL + ',2)=' + leftParity + '),7,' + under + ')';
    } else if (x === 61 || x === 62) {
      var rightParity = (x === 61) ? 0 : 1;
      var yShiftR = (17 - y) % 2;
      under = 'IF(AND(MOD(' + FRAME_CELL_REF + '+' + (y + 1) + ',3)=0,MOD(' + FRAME_CELL_REF + '+' + yShiftR + ',2)=' + rightParity + '),7,' + under + ')';
    }
  }

  // Seamless falling snow (period 18 divides LOOP_FRAMES=36)
  var k1 = ((y + 7 * x) % 18 + 18) % 18;
  var snow1Check = 'MOD(' + k1 + '-' + FRAME_CELL_REF + '-7*INT(' + FRAME_CELL_REF + '/2),18)=0';

  if (x % 2 === 0) {
    var k2 = ((y + 11 * x - 7) % 18 + 18) % 18;
    var snow2Check = 'MOD(' + k2 + '-INT(' + FRAME_CELL_REF + '/2),18)=0';
    return 'IF(' + snow1Check + ',5,IF(' + snow2Check + ',6,' + under + '))';
  }
  return 'IF(' + snow1Check + ',5,' + under + ')';
}

/**
 * Builds static base pixel canvas and skyMask for non-occluded sky cells.
 */
function buildStaticScene_() {
  var grid = [];
  var skyMask = [];
  for (var y = 0; y < GRID_H; y++) {
    var row = [];
    var sRow = [];
    for (var x = 0; x < GRID_W; x++) {
      if (y <= 6) row.push(1);
      else if (y <= 15) row.push(2);
      else if (y <= 29) row.push(3);
      else row.push(5);
      sRow.push(y <= 29);
    }
    grid.push(row);
    skyMask.push(sRow);
  }

  // Distant pine ridge silhouette (rows 23..29)
  var treeHeights = [
    2,3,4,3,2,1,2,3,2,1,2,4,5,3,2,1, 2,3,4,2,1,2,3,4,5,3,2,1,2,3,2,1,
    1,2,3,2,1,2,4,5,3,2,1,2,3,4,2,1, 2,3,4,3,2,1,2,3,4,5,3,2,1,2,3,2
  ];
  for (var x = 0; x < GRID_W; x++) {
    var top = 28 - treeHeights[x];
    for (var y = top; y <= 29; y++) {
      grid[y][x] = 4;
    }
  }

  // Big full moon centered at (50, 7)
  for (var y = 2; y <= 12; y++) {
    for (var x = 45; x <= 55; x++) {
      var dx = x - 50;
      var dy = y - 7;
      if (dx * dx + dy * dy <= 22) {
        if ((x === 48 && y === 6) || (x === 52 && y === 8) || (x === 49 && y === 9) || (x === 53 && y === 5)) {
          grid[y][x] = 7;
        } else if (dx + dy <= -2) {
          grid[y][x] = 8;
        } else {
          grid[y][x] = 9;
        }
        skyMask[y][x] = false;
      }
    }
  }

  // Snowy village square ground (rows 30..35)
  for (var y = 30; y < GRID_H; y++) {
    for (var x = 0; x < GRID_W; x++) {
      var drift = Math.round(Math.sin(x * 0.22) * 0.8);
      if (y === 30) {
        grid[y][x] = 5;
      } else if (y === 32 + drift || y === 34) {
        grid[y][x] = 6;
      } else {
        grid[y][x] = 5;
      }
    }
  }

  function stamp(x0, y0, lines, map) {
    for (var r = 0; r < lines.length; r++) {
      var line = lines[r];
      for (var c = 0; c < line.length; c++) {
        var ch = line.charAt(c);
        if (ch === '.' || !map[ch]) continue;
        var gx = x0 + c;
        var gy = y0 + r;
        if (gx >= 0 && gx < GRID_W && gy >= 0 && gy < GRID_H) {
          grid[gy][gx] = map[ch];
          skyMask[gy][gx] = false;
        }
      }
    }
  }

  // Left cozy cottage (x = 0..11, y = 18..29)
  stamp(0, 18, [
    '.CC.........',
    '.CC..SSSS...',
    '.CC.SSSSSS..',
    '.SSSSSSSSSS.',
    'SSRRRRRRRRSS',
    'SRRRRRRRRRRS',
    '.WWWWWWWWWW.',
    '.WWWWWWWWWW.',
    '.WGGWWWWGGW.',
    '.WGGWWWWGGW.',
    '.WWWWDDWWWW.',
    '.WWWWDDWWWW.'
  ], { C: 24, S: 5, R: 24, W: 16, G: 10, D: 15 });

  // Right cozy cottage (x = 52..63, y = 18..29)
  stamp(52, 18, [
    '.........CC.',
    '...SSSS..CC.',
    '..SSSSSS.CC.',
    '.SSSSSSSSSS.',
    'SSRRRRRRRRSS',
    'SRRRRRRRRRRS',
    '.WWWWWWWWWW.',
    '.WWWWWWWWWW.',
    '.WWGGGWWDDW.',
    '.WWGGGWWDDW.',
    '.WWGGGWWDDW.',
    '.WWWWWWWDDW.'
  ], { C: 24, S: 5, R: 24, W: 16, G: 10, D: 15 });

  // Village streetlamp posts
  stamp(12, 24, ['P', 'G', 'P', 'P', 'P', 'P'], { G: 9, P: 23 });
  stamp(50, 24, ['P', 'G', 'P', 'P', 'P', 'P'], { G: 9, P: 23 });

  // Big Christmas tree (centered at x = 31, y = 15..29)
  stamp(22, 15, [
    '.........M.........',
    '........DMH........',
    '.......SDMH........',
    '......DDMMHHS......',
    '.......DDMHH.......',
    '......SDMMHHS......',
    '.....DDDMMMHHH.....',
    '....SDDDMMMHHHS....',
    '...DDDDMMMMMHHHH...',
    '.....DDDMMMHHH.....',
    '....SDDDMMMHHHS....',
    '...DDDDMMMMMHHHH...',
    '..SDDDDMMMMMHHHHS..',
    '.DDDDDMMMMMMMHHHHH.',
    'SDDDDMMMMMMMMMHHHHS'
  ], { D: 12, M: 13, H: 14, S: 5 });

  // Tree trunk & wrapped presents (y = 30..31)
  for (var y = 30; y <= 31; y++) {
    for (var x = 30; x <= 32; x++) {
      grid[y][x] = 15;
    }
  }
  stamp(25, 30, ['RRR.CCC', 'RGR.CYC'], { R: 18, G: 9, C: 20, Y: 9 });
  stamp(34, 30, ['EEE.PPP', 'EYE.PYP'], { E: 22, P: 21, Y: 9 });

  // Original little snowman (x = 14..21, y = 20..29)
  stamp(14, 20, [
    '..HHH...',
    '..RRR...',
    '.HHHHH..',
    '..EWE...',
    '..WWWCC.',
    '..RRRR..',
    '.RWWWW..',
    '..WWBW..',
    '..WWBW..',
    '..SSSS..'
  ], { H: 23, W: 5, S: 6, E: 23, C: 10, R: 18, B: 23 });

  // Original small reindeer (x = 41..48, y = 20..29)
  stamp(41, 20, [
    '..A..A..',
    '..AA.AA.',
    '..EBB...',
    'NBBBB...',
    '..BBB...',
    '..GYG...',
    '..BBBBBT',
    '..BTTBB.',
    '..B..B..',
    '..K..K..'
  ], { A: 17, B: 16, E: 23, N: 18, G: 22, Y: 9, T: 17, K: 15 });

  return { grid: grid, skyMask: skyMask };
}

function computeTextPixels_(str, startX, startY) {
  var coords = [];
  var cx = startX;
  for (var i = 0; i < str.length; i++) {
    var ch = str.charAt(i);
    if (ch === ' ') {
      cx += 3;
      continue;
    }
    var glyph = PIXEL_FONT[ch];
    var gw = glyph[0].length;
    for (var r = 0; r < glyph.length; r++) {
      for (var c = 0; c < gw; c++) {
        if (glyph[r].charAt(c) === '1') {
          coords.push([cx + c, startY + r]);
        }
      }
    }
    cx += gw + 1;
  }
  return coords;
}

function buildTextLayerMap_(merryCoords, xmasCoords) {
  var map = {};
  var fgSet = {};
  var i, pt;

  for (i = 0; i < merryCoords.length; i++) {
    pt = merryCoords[i];
    fgSet[pt[0] + ',' + pt[1]] = 9; // Warm Gold
  }
  for (i = 0; i < xmasCoords.length; i++) {
    pt = xmasCoords[i];
    fgSet[pt[0] + ',' + pt[1]] = 5; // Crisp Snow White
  }

  // 1-px dark midnight outline for high readability over stars & snow
  var keys = Object.keys(fgSet);
  for (i = 0; i < keys.length; i++) {
    var parts = keys[i].split(',');
    var px = Number(parts[0]);
    var py = Number(parts[1]);
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        var nx = px + dx;
        var ny = py + dy;
        if (nx >= 0 && nx < GRID_W && ny >= 0 && ny < GRID_H) {
          var nKey = nx + ',' + ny;
          if (!fgSet.hasOwnProperty(nKey)) {
            map[nKey] = 1;
          }
        }
      }
    }
  }
  for (i = 0; i < keys.length; i++) {
    map[keys[i]] = fgSet[keys[i]];
  }
  return map;
}
