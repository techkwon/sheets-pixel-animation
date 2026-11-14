/** @OnlyCurrentDoc */

/**
 * Chiikawa Weeding Field — Animated Pixel Art in Google Sheets
 * ============================================================
 * How to install and run:
 *   1. Open a Google Sheet (a blank spreadsheet works best).
 *   2. Click Extensions > Apps Script.
 *   3. Replace any existing code in Code.gs with this file and save (Ctrl/Cmd + S).
 *   4. Select "setup" in the top toolbar and click Run (approve the one-time
 *      current-spreadsheet permission prompt).
 *   5. Switch back to your spreadsheet — you'll see the 64x38 pixel canvas and
 *      a "Chiikawa" menu at the top (refresh the page once if the menu is missing).
 *   6. Click Chiikawa > Play (60s) (or run "play" in Apps Script) to animate.
 *      Use Chiikawa > Stop to pause early, or edit cell C1 (0-29) to scrub manually.
 *
 * Performance & Timing:
 *   - Grid: 64 x 38 = 2,432 square pixels (B2:BM39), 14x14 px each.
 *   - Palette: 16 colors mapped purely via native Conditional Formatting rules (0-15).
 *   - Formulas: Every pixel cell has a formula depending on $C$1. Swaying grass
 *     cells use LET + MOD + SIN + ABS directly; animated sprite, cloud, and
 *     speech-bubble cells use O(1) CODE(MID(..., MOD(INT($C$1), 30)+1, 1))-65
 *     so Google Sheets recalculates all 2,432 cells in ~250-400 ms per frame.
 *   - Frame Rate: Expect ~2 FPS (typically 1.5-2.5 FPS in normal Google Sheets).
 *     At 2 FPS, 30 frames = ~15 seconds per seamless loop (~4 loops in 60s play).
 */

var GRID_W = 64;
var GRID_H = 38;
var N_FRAMES = 30;
var PIXEL_PX = 14;
var SHEET_NAME = 'Chiikawa';
var FRAME_CELL_A1 = 'C1';
var TARGET_FRAME_MS = 500; // ~2 FPS -> 30 frames = 15s per loop
var PLAY_DURATION_MS = 60000;
var STOP_CACHE_KEY = 'CHIIKAWA_STOP';

// 16-color Nagano-inspired pastel palette (indices 0..15 -> chars 'A'..'P')
var PALETTE = [
  '#AEE4FF', // 0 (A): Sky Blue
  '#FFFFFF', // 1 (B): Pure White (Chiikawa, Hachiware, Clouds, Bubble)
  '#DCEBF7', // 2 (C): Cool White Shadow / Cloud Underside
  '#3B2B26', // 3 (D): Warm Charcoal Outline / Eyes / Text
  '#FF9BB3', // 4 (E): Blush Pink / Usagi Inner Ear / Flower
  '#E85D75', // 5 (F): Deep Mouth Pink (Usagi shout / Chiikawa effort)
  '#70A9D8', // 6 (G): Hachiware Blue-Grey
  '#4F84B2', // 7 (H): Hachiware Blue-Grey Shade
  '#FFF0A8', // 8 (I): Usagi Cream-Yellow
  '#F0CF72', // 9 (J): Usagi Cream Shade
  '#A7E077', // 10 (K): Sunlit Grass Light Green
  '#7BC856', // 11 (L): Meadow Grass Mid Green
  '#4E9A3B', // 12 (M): Deep Grass / Weed Green
  '#9C6A44', // 13 (N): Earth / Weed Root Brown
  '#FFD23F', // 14 (O): Sparkle / Meadow Flower Gold
  '#52B8EC'  // 15 (P): Sweat Drop Cyan-Blue
];

var SPRITE_LEGEND = {
  '.': -1,
  'W': 1, 'S': 2, 'K': 3, 'P': 4, 'M': 5,
  'B': 6, 'D': 7, 'Y': 8, 'U': 9,
  'L': 10, 'G': 11, 'E': 12, 'R': 13, 'O': 14, 'C': 15
};

/**
 * Adds custom Chiikawa controls to the Google Sheets menu bar.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Chiikawa')
    .addItem('Setup Scene', 'setup')
    .addItem('Play (60s)', 'play')
    .addItem('Stop', 'stop')
    .addSeparator()
    .addItem('Step +1 Frame', 'stepFrame')
    .addItem('Reset to Frame 0', 'resetFrame')
    .addToUi();
}

/**
 * Builds the entire pixel-art spreadsheet: shrinks rows/columns into 14x14 px
 * squares, populates all 2,432 cells with formulas referencing $C$1, and applies
 * 16 Conditional Formatting rules to map formula values (0..15) to colors.
 */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME, 0);
  }
  ss.setActiveSheet(sheet);

  sheet.clear();
  sheet.clearConditionalFormatRules();
  sheet.setHiddenGridlines(true);

  var targetRows = GRID_H + 2;
  var targetCols = GRID_W + 2;
  adjustSheetSize_(sheet, targetRows, targetCols);

  // Header bar (Row 1) & single frame counter cell ($C$1)
  sheet.setRowHeight(1, 28);
  sheet.setRowHeight(GRID_H + 2, PIXEL_PX);
  sheet.setColumnWidth(1, PIXEL_PX);
  sheet.setColumnWidth(GRID_W + 2, PIXEL_PX);

  sheet.getRange('B1:BM1')
    .setBackground('#2D3748')
    .setFontColor('#FFFFFF')
    .setFontFamily('Roboto Mono, monospace')
    .setFontSize(10)
    .setVerticalAlignment('middle');

  sheet.getRange('B1')
    .setValue('Frame:')
    .setFontWeight('bold')
    .setHorizontalAlignment('right');

  sheet.getRange(FRAME_CELL_A1)
    .setValue(0)
    .setBackground('#FFD23F')
    .setFontColor('#3B2B26')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  sheet.getRange('E1:BM1').merge()
    .setValue('CHIIKAWA WEEDING FIELD  |  Edit C1 (0-29) to scrub, or run Chiikawa > Play (60s) (~2 FPS, 15s loop)')
    .setHorizontalAlignment('left');

  // Shrink pixel canvas cells into 14x14 px squares
  sheet.setColumnWidths(2, GRID_W, PIXEL_PX);
  sheet.setRowHeights(2, GRID_H, PIXEL_PX);

  // Write spreadsheet formulas to every pixel cell
  var formulas = buildSceneFormulas_();
  var canvasRange = sheet.getRange(2, 2, GRID_H, GRID_W);
  canvasRange
    .setFormulas(formulas)
    .setFontSize(6)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);

  // Map formula outputs (0..15) to colors via Conditional Formatting
  var rules = [];
  for (var i = 0; i < PALETTE.length; i++) {
    var color = PALETTE[i];
    rules.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenNumberEqualTo(i)
        .setBackground(color)
        .setFontColor(color)
        .setRanges([canvasRange])
        .build()
    );
  }
  sheet.setConditionalFormatRules(rules);

  SpreadsheetApp.flush();
  ss.toast('Chiikawa scene ready! Click Chiikawa > Play (60s) to animate.', 'Chiikawa', 5);
}

/**
 * Advances the frame counter cell ($C$1) in a paced loop for ~60 seconds.
 */
function play() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    setup();
    sheet = ss.getSheetByName(SHEET_NAME);
  }
  ss.setActiveSheet(sheet);

  var cache = CacheService.getDocumentCache();
  cache.remove(STOP_CACHE_KEY);

  var frameCell = sheet.getRange(FRAME_CELL_A1);
  var current = parseInt(frameCell.getValue(), 10);
  var frame = isNaN(current) ? 0 : ((current % N_FRAMES) + N_FRAMES) % N_FRAMES;

  var startTime = Date.now();
  ss.toast('Playing (~2 FPS, 15s loop). Use Chiikawa > Stop to pause.', 'Chiikawa', 4);

  while (Date.now() - startTime < PLAY_DURATION_MS) {
    if (cache.get(STOP_CACHE_KEY) === '1') {
      cache.remove(STOP_CACHE_KEY);
      ss.toast('Animation stopped.', 'Chiikawa', 3);
      return;
    }

    var stepStart = Date.now();
    frame = (frame + 1) % N_FRAMES;
    frameCell.setValue(frame);
    SpreadsheetApp.flush();

    var elapsed = Date.now() - stepStart;
    var waitMs = Math.max(40, TARGET_FRAME_MS - elapsed);
    Utilities.sleep(waitMs);
  }

  ss.toast('Finished 60s playback.', 'Chiikawa', 3);
}

/**
 * Signals an active play() loop to stop cleanly.
 */
function stop() {
  CacheService.getDocumentCache().put(STOP_CACHE_KEY, '1', 300);
  SpreadsheetApp.getActiveSpreadsheet().toast('Stopping animation...', 'Chiikawa', 3);
}

/**
 * Advances the scene by 1 frame (useful for inspecting individual poses).
 */
function stepFrame() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    setup();
    return;
  }
  var frameCell = sheet.getRange(FRAME_CELL_A1);
  var current = parseInt(frameCell.getValue(), 10);
  var next = isNaN(current) ? 0 : (current + 1) % N_FRAMES;
  frameCell.setValue(next);
  SpreadsheetApp.flush();
}

/**
 * Resets the frame counter cell to 0.
 */
function resetFrame() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    setup();
    return;
  }
  sheet.getRange(FRAME_CELL_A1).setValue(0);
  SpreadsheetApp.flush();
}

// =============================================================================
// INTERNAL HELPERS & SPRITE SCENE BUILDER
// =============================================================================

function adjustSheetSize_(sheet, targetRows, targetCols) {
  var maxRows = sheet.getMaxRows();
  if (maxRows < targetRows) {
    sheet.insertRowsAfter(maxRows, targetRows - maxRows);
  } else if (maxRows > targetRows) {
    sheet.deleteRows(targetRows + 1, maxRows - targetRows);
  }

  var maxCols = sheet.getMaxColumns();
  if (maxCols < targetCols) {
    sheet.insertColumnsAfter(maxCols, targetCols - maxCols);
  } else if (maxCols > targetCols) {
    sheet.deleteColumns(targetCols + 1, maxCols - targetCols);
  }
}

/**
 * Builds the 38x64 matrix of Google Sheets formulas referencing $C$1.
 */
function buildSceneFormulas_() {
  var sprites = getSprites_();
  var frames = [];
  var f, y, x;

  for (f = 0; f < N_FRAMES; f++) {
    frames.push(renderSceneFrame_(f, sprites));
  }

  var formulas = [];
  for (y = 0; y < GRID_H; y++) {
    var rowFormulas = [];
    for (x = 0; x < GRID_W; x++) {
      var pureSway = getPureGrassSwayFormula_(x, y, frames);
      if (pureSway) {
        rowFormulas.push(pureSway);
        continue;
      }

      var timeline = '';
      var firstVal = frames[0][y][x];
      var allSame = true;
      for (f = 0; f < N_FRAMES; f++) {
        var v = frames[f][y][x];
        if (v !== firstVal) {
          allSame = false;
        }
        timeline += String.fromCharCode(65 + v);
      }

      if (allSame) {
        rowFormulas.push('=IF(MOD(INT($C$1),30)>=0,' + firstVal + ',' + firstVal + ')');
      } else {
        rowFormulas.push('=CODE(MID("' + timeline + '",MOD(INT($C$1),30)+1,1))-65');
      }
    }
    formulas.push(rowFormulas);
  }

  return formulas;
}

/**
 * Returns a direct LET + MOD + SIN formula for pure swaying-grass cells
 * that are never overlapped by characters, dirt, weed, or flowers.
 */
function getPureGrassSwayFormula_(x, y, frames) {
  var horizon = (x % 14 < 8) ? 28 : 27;
  if (y < horizon) {
    return null;
  }
  var phase = x * 0.45;
  var phaseStr = phase.toFixed(4);
  var formula = null;
  var pred = null;

  if (y === horizon) {
    if (x % 3 === 0) {
      formula = '=LET(f,MOD(INT($C$1),30),IF(ABS(SIN(f*0.2094395+' + phaseStr + '))>0.35,11,10))';
      pred = function(s) { return Math.abs(s) > 0.35 ? 11 : 10; };
    } else if (x % 3 === 1) {
      formula = '=LET(f,MOD(INT($C$1),30),IF(SIN(f*0.2094395+' + phaseStr + ')<-0.35,10,11))';
      pred = function(s) { return s < -0.35 ? 10 : 11; };
    } else {
      formula = '=LET(f,MOD(INT($C$1),30),IF(SIN(f*0.2094395+' + phaseStr + ')>0.35,10,11))';
      pred = function(s) { return s > 0.35 ? 10 : 11; };
    }
  } else if (y === 30) {
    if (x % 5 === 0) {
      formula = '=LET(f,MOD(INT($C$1),30),IF(SIN(f*0.2094395+' + phaseStr + ')>0.2,11,12))';
      pred = function(s) { return s > 0.2 ? 11 : 12; };
    } else if (x % 5 === 4) {
      formula = '=LET(f,MOD(INT($C$1),30),IF(SIN(f*0.2094395+' + phaseStr + ')>0.2,12,11))';
      pred = function(s) { return s > 0.2 ? 12 : 11; };
    }
  } else if (y === 33 || y === 36) {
    if (x % 4 === 0) {
      formula = '=LET(f,MOD(INT($C$1),30),IF(SIN(f*0.2094395+' + phaseStr + ')>0.25,11,12))';
      pred = function(s) { return s > 0.25 ? 11 : 12; };
    } else if (x % 4 === 3) {
      formula = '=LET(f,MOD(INT($C$1),30),IF(SIN(f*0.2094395+' + phaseStr + ')>0.25,12,11))';
      pred = function(s) { return s > 0.25 ? 12 : 11; };
    }
  }

  if (!formula) {
    return null;
  }
  for (var f = 0; f < N_FRAMES; f++) {
    var sVal = Math.sin(f * 0.2094395 + phase);
    if (frames[f][y][x] !== pred(sVal)) {
      return null;
    }
  }
  return formula;
}

function renderSceneFrame_(f, sp) {
  var grid = [];
  var y, x;
  for (y = 0; y < GRID_H; y++) {
    var row = [];
    for (x = 0; x < GRID_W; x++) {
      row.push(0); // Sky Blue
    }
    grid.push(row);
  }

  // 1. Drifting clouds (seamless 30-frame wrap)
  var c1x = ((f * 2) % 60) - 5;
  drawSprite_(grid, sp.cloudBig, c1x, 2);
  if (c1x + 60 < GRID_W + 5) {
    drawSprite_(grid, sp.cloudBig, c1x + 60, 2);
  }
  if (c1x - 60 > -15) {
    drawSprite_(grid, sp.cloudBig, c1x - 60, 2);
  }

  var c2x = (f + 18) % 30;
  drawSprite_(grid, sp.cloudSmall, c2x, 7);
  drawSprite_(grid, sp.cloudSmall, c2x + 30, 7);

  // 2. Swaying grassy field (horizon around row 27-28)
  for (x = 0; x < GRID_W; x++) {
    var horizon = (x % 14 < 8) ? 28 : 27;
    var sway = Math.sin(2 * Math.PI * f / N_FRAMES + x * 0.45);
    var shift = sway > 0.35 ? 1 : (sway < -0.35 ? -1 : 0);

    for (y = horizon; y < GRID_H; y++) {
      if (y === horizon) {
        grid[y][x] = (((x + shift + 30) % 3) === 0) ? 10 : 11;
      } else if (y <= 31) {
        if ((x * 7 + y * 3) % 19 === 0) {
          grid[y][x] = (x % 2 === 0) ? 14 : 4; // Tiny meadow flowers
        } else if (y === 30 && ((x + (sway > 0.2 ? 1 : 0)) % 5 === 0)) {
          grid[y][x] = 12;
        } else if ((x + y) % 7 === 0) {
          grid[y][x] = 10;
        } else {
          grid[y][x] = 11;
        }
      } else {
        if ((y === 33 || y === 36) && ((x + (sway > 0.25 ? 1 : 0)) % 4 === 0)) {
          grid[y][x] = 12;
        } else if ((x * 5 + y * 11) % 17 === 0) {
          grid[y][x] = 10;
        } else {
          grid[y][x] = 11;
        }
      }
    }
  }

  // Soil patch where Chiikawa pulls the weed (x=18..22, y=30..32)
  for (var dx = 0; dx < 5; dx++) {
    grid[31][18 + dx] = 13;
    if (dx >= 1 && dx <= 3) {
      grid[30][18 + dx] = 13;
      grid[32][18 + dx] = 13;
    }
  }

  // 3. Chiikawa + Weed (pulling -> straining -> popping out & falling on bottom -> recovering)
  if (f <= 4) {
    drawSprite_(grid, sp.weedPlanted, 18, 26);
    drawSprite_(grid, sp.chiiGrab, 4 - (f % 2), 18);
  } else if (f <= 11) {
    var shake = (f % 2 === 0) ? 1 : 0;
    var strainSprite = (f % 2 === 0) ? sp.chiiStrain1 : sp.chiiStrain2;
    drawSprite_(grid, sp.weedPlanted, 18 - shake, 26 - (f >= 9 ? 1 : 0));
    drawSprite_(grid, strainSprite, 3 - shake, 18);
    if (f >= 9) {
      grid[28][17] = 13;
      grid[29][22] = 13;
    }
  } else if (f === 12) {
    drawSprite_(grid, sp.weedPulled, 18, 21);
    grid[23][17] = 14;
    grid[24][23] = 14;
    grid[27][19] = 13;
    drawSprite_(grid, sp.chiiFallMid, 2, 16);
  } else if (f === 13 || f === 14) {
    drawSprite_(grid, sp.weedPulled, 17, (f === 13) ? 18 : 20);
    drawSprite_(grid, sp.chiiFallMid, 1, 18);
  } else if (f <= 25) {
    var bob = (f === 15 || f === 16) ? 1 : 0;
    var sitSprite = (f <= 19) ? sp.chiiSitStun : sp.chiiSitHappy;
    drawSprite_(grid, sitSprite, 1, 19 + bob);
    drawSprite_(grid, sp.weedPulled, 16, 25);
    if (f === 15) {
      grid[31][0] = 2;
      grid[30][0] = 14;
      grid[31][15] = 2;
    }
  } else {
    var hop = (f === 27 || f === 28) ? -1 : 0;
    var cx = (f === 26) ? 2 : ((f === 27 || f === 28) ? 3 : 4);
    drawSprite_(grid, sp.chiiGrab, cx, 18 + hop);
    if (f >= 27) {
      drawSprite_(grid, sp.weedPlanted, 18, (f === 27) ? 27 : 26);
    }
  }

  // 4. Hachiware cheering in the center (x=24..40)
  var hSprite, hy;
  if (f >= 12 && f <= 19) {
    hSprite = (f % 2 === 0) ? sp.hachiCheerBig : sp.hachiCheer2;
    hy = 15 - (f % 2 === 0 ? 1 : 0);
  } else {
    var hCycle = f % 4;
    hSprite = (hCycle <= 1) ? sp.hachiCheer1 : sp.hachiCheer2;
    hy = 15 - (hCycle === 2 ? 1 : 0);
  }
  drawSprite_(grid, hSprite, 24, hy);

  // 5. Usagi jumping up and down shouting "YAHA!" (x=45..61)
  var jc = f % 6;
  var uSprite, uy;
  if (jc === 0) {
    uSprite = sp.usagiCrouch;
    uy = 14;
  } else if (jc === 1 || jc === 4) {
    uSprite = sp.usagiJumpUp;
    uy = 12;
  } else if (jc === 2 || jc === 3) {
    uSprite = sp.usagiJumpPeak;
    uy = 10;
  } else {
    uSprite = sp.usagiCrouch;
    uy = 13;
  }
  drawSprite_(grid, uSprite, 45, uy);

  var bubbleY = (jc === 2 || jc === 3) ? 0 : 1;
  var bubble = (jc === 2 || jc === 3) ? sp.yahaHighlight : sp.yahaNormal;
  drawSprite_(grid, bubble, 34, bubbleY);

  return grid;
}

function drawSprite_(grid, sprite, x0, y0) {
  for (var dy = 0; dy < sprite.length; dy++) {
    var y = y0 + dy;
    if (y < 0 || y >= GRID_H) {
      continue;
    }
    var row = sprite[dy];
    for (var dx = 0; dx < row.length; dx++) {
      var x = x0 + dx;
      if (x < 0 || x >= GRID_W) {
        continue;
      }
      var colIdx = SPRITE_LEGEND[row.charAt(dx)];
      if (colIdx !== undefined && colIdx >= 0) {
        grid[y][x] = colIdx;
      }
    }
  }
}

function makeYahaBubble_(highlight) {
  var font = {
    'Y': ['K.K', 'K.K', '.K.', '.K.', '.K.'],
    'A': ['.K.', 'K.K', 'KKK', 'K.K', 'K.K'],
    'H': ['K.K', 'K.K', 'KKK', 'K.K', 'K.K'],
    '!': ['K', 'K', 'K', '.', 'K']
  };
  var text = 'YAHA!';
  var textRows = ['', '', '', '', ''];
  var i, r;
  for (i = 0; i < text.length; i++) {
    var glyph = font[text.charAt(i)];
    for (r = 0; r < 5; r++) {
      if (i > 0) {
        textRows[r] += 'W';
      }
      textRows[r] += glyph[r].replace(/\./g, 'W');
    }
  }

  var w = textRows[0].length + 4;
  var bubble = [];
  bubble.push('.' + repeatChar_('K', w - 2) + '.');
  if (highlight) {
    bubble.push('KO' + repeatChar_('W', w - 4) + 'OK');
  } else {
    bubble.push('K' + repeatChar_('W', w - 2) + 'K');
  }
  for (r = 0; r < 5; r++) {
    bubble.push('KW' + textRows[r] + 'WK');
  }
  bubble.push('K' + repeatChar_('W', w - 2) + 'K');

  var tailPos = w - 8;
  var bot = ('.' + repeatChar_('K', w - 2) + '.').split('');
  bot[tailPos] = 'W';
  bot[tailPos + 1] = 'W';
  bubble.push(bot.join(''));

  var tail1 = repeatChar_('.', w).split('');
  tail1[tailPos] = 'K';
  tail1[tailPos + 1] = 'W';
  tail1[tailPos + 2] = 'K';
  bubble.push(tail1.join(''));

  var tail2 = repeatChar_('.', w).split('');
  tail2[tailPos + 1] = 'K';
  bubble.push(tail2.join(''));

  return bubble;
}

function repeatChar_(ch, count) {
  var s = '';
  for (var i = 0; i < count; i++) {
    s += ch;
  }
  return s;
}

function getSprites_() {
  return {
    // Chiikawa (17x15): small white hamster-like creature, tiny round ears, dot eyes, pink blush
    chiiGrab: [
      '...KK.......KK...',
      '..KWWKKKKKKKWWK..',
      '.KWWWWWWWWWWWWWK.',
      '.KWWWWWWWWWWWWWK.',
      'KWWWWKWWWWWKWWWWK',
      'KWWPPWWKKKWWPPWWK',
      'KWWWWWWWWWWWWWWWK',
      '.KWWWWWWWWWWWWWK.',
      '.KWWWWWWWWWWWWWWK',
      '.KWWWWWWWWWWWWKK.',
      '.KSSWWWWWWWWSSK..',
      '..KWWWWWWWWWWK...',
      '...KKWWKKWWKK....',
      '...KWWK..KWWK....',
      '....KK....KK.....'
    ],
    chiiStrain1: [
      '.C...............',
      '...KK.......KK...',
      '..KWWKKKKKKKWWK..',
      '.KWWWWWWWWWWWWWK.',
      '.KWWKWWWWWWWKWWK.',
      'KWWWWKWWWWWKWWWWK',
      'KWWPPWWKMKWWPPWWK',
      'KWWWWWWWWWWWWWWWK',
      '.KWWWWWWWWWWWWWWK',
      'KWWWWWWWWWWWWWWK.',
      '.KSSWWWWWWWWSSK..',
      '..KWWWWWWWWWWK...',
      '..KKWWK..KWWKK...',
      '..KWWK....KWWK...',
      '...KK......KK....'
    ],
    chiiStrain2: [
      '.C.........C.....',
      '..KK.......KK....',
      '.KWWKKKKKKKWWK...',
      'KWWWWWWWWWWWWWK..',
      'KWWKWWWWWWWKWWK..',
      'KWWWKWWWWWKWWWK..',
      'KWWPPWWKMKWWPPWK.',
      'KWWWWWWWWWWWWWK..',
      'KWWWWWWWWWWWWWWK.',
      '.KWWWWWWWWWWWWKK.',
      '.KSSWWWWWWWWSSK..',
      '..KWWWWWWWWWWK...',
      '..KKWWK..KWWKK...',
      '..KWWK....KWWK...',
      '...KK......KK....'
    ],
    chiiFallMid: [
      'C............O...',
      '..KK.......KK....',
      '.KWWKKKKKKKWWK...',
      'KWWWWWWWWWWWWWK..',
      'KWWWKWWWWWKWWWK..',
      'KWWPPWWKMKWWPPK..',
      'KWWWWWWKKKWWWWK..',
      'KWWWWWWWWWWWWWK..',
      '.KWWWWWWWWWWWWK..',
      'KWKWWWWWWWWWWKWK.',
      '.KKSSWWWWWWSSKK..',
      '...KWWWWWWWWK....',
      '...KKWW..WWKK....',
      '....KWWKKWWK.....',
      '.....KK..KK......'
    ],
    chiiSitStun: [
      '..C..............',
      '.................',
      '...KK.......KK...',
      '..KWWKKKKKKKWWK..',
      '.KWWWWWWWWWWWWWK.',
      'KWWWKWWWWWWWKWWWK',
      'KWWPPWWKMKWWPPWWK',
      'KWWWWWWKKKWWWWWWK',
      '.KWWWWWWWWWWWWWK.',
      'KWKWWWWWWWWWWKWK.',
      '.KKWWWWWWWWWWKK..',
      '..KSSWWWWWWSSKK..',
      '..KWWWWWWWWKWWWK.',
      '...KKKKKKKKKKKK..',
      '.................'
    ],
    chiiSitHappy: [
      '.................',
      '.................',
      '...KK.......KK...',
      '..KWWKKKKKKKWWK..',
      '.KWWWWWWWWWWWWWK.',
      'KWWWWKWWWWWKWWWWK',
      'KWWPPWWKKKWWPPWWK',
      'KWWWWWWWWWWWWWWWK',
      '.KWWWWWWWWWWWWWK.',
      'KWKWWWWWWWWWWKWK.',
      '.KKWWWWWWWWWWKK..',
      '..KSSWWWWWWSSKK..',
      '..KWWWWWWWWKWWWK.',
      '...KKKKKKKKKKKK..',
      '.................'
    ],

    // Hachiware (17x18): white cat-like creature, blue-grey parted "hachiware" head pattern, pointed ears
    hachiCheer1: [
      '..KK.........KK..',
      '.KBBK.......KBBK.',
      '.KBBBK.....KBBBK.',
      '.KBBBBKKKKKBBBBK.',
      '.KBBBBBBWBBBBBBK.',
      '.KBBBBBWWWBBBBBK.',
      '.KBBBBWWWWWBBBBK.',
      'KBBBWWWWWWWWWBBBK',
      'KBBWWWKWWWKWWWBBK',
      'KWWPPWWWKKWWPPWWK',
      '.KWWWWWWWWWWWWWK.',
      '.KWWWWWWWWWWWWWK.',
      'KWKWWWWWWWWWWWKWK',
      '.KKSSWWWWWWWSSKK.',
      '...KWWWWWWWWWK...',
      '...KKWWKKKWWKK...',
      '...KWWK...KWWK...',
      '....KK.....KK....'
    ],
    hachiCheer2: [
      'O.KK.........KK.O',
      '..KBBK.....KBBK..',
      '..KBBBK...KBBBK..',
      '..KBBBBKKKBBBBK..',
      '..KBBBBBWBBBBBK..',
      '.KKBBBBWWWBBBBKK.',
      'KWKBBBWWWWWBBBKWK',
      'KWKBBWWWWWWWBBKWK',
      '.KKWWKWWWWWKWWKK.',
      '..KWWPPWKKWPPWWK.',
      '..KWWWWWWWWWWWWK.',
      '...KWWWWWWWWWWK..',
      '...KSSWWWWWWSSK..',
      '....KWWWWWWWWK...',
      '...KKWWK..KWWKK..',
      '...KWWK....KWWK..',
      '....KK......KK...',
      '.................'
    ],
    hachiCheerBig: [
      'O.KK.........KK.O',
      '..KBBK.....KBBK..',
      '..KBBBK...KBBBK..',
      '..KBBBBKKKBBBBK..',
      '..KBBBBBWBBBBBK..',
      'KKKBBBBWWWBBBBKKK',
      'KWKBBBWWWWWBBBKWK',
      '.KKWWKWWWWWKWWKK.',
      '..KWWWWWWWWWWWWK.',
      '..KWWPPWMMWPPWWK.',
      '..KWWWWWWWWWWWWK.',
      '...KWWWWWWWWWWK..',
      '...KSSWWWWWWSSK..',
      '....KWWWWWWWWK...',
      '...KKWWK..KWWKK..',
      '...KWWK....KWWK..',
      '....KK......KK...',
      '.................'
    ],

    // Usagi (17x20): cream-yellow rabbit-like creature, long upright ears, wide open shouting mouth
    usagiCrouch: [
      '....KK.....KK....',
      '...KYYK...KYYK...',
      '...KYPK...KPYK...',
      '...KYPK...KPYK...',
      '...KYPK...KPYK...',
      '...KYYKKKKKYYK...',
      '..KYYYYYYYYYYYK..',
      '.KYYYYYYYYYYYYYK.',
      '.KYYYYKYYYKYYYYK.',
      '.KYYPPYKKKYPPYYK.',
      '.KYYYYKMMMKYYYYK.',
      '..KYYYYKKKYYYYK..',
      '..KYYYYYYYYYYYK..',
      '.KKYYYYYYYYYYYKK.',
      'KYKYYYYYYYYYYYKYK',
      '.KKUUYYYYYYYUUKK.',
      '...KYYYYYYYYYK...',
      '...KKYYKKKYYKK...',
      '...KYYK...KYYK...',
      '....KK.....KK....'
    ],
    usagiJumpUp: [
      '....KK.....KK....',
      '...KYYK...KYYK...',
      '...KYPK...KPYK...',
      '...KYPK...KPYK...',
      '...KYPK...KPYK...',
      '...KYYKKKKKYYK...',
      '..KYYYYYYYYYYYK..',
      '.KYYYYYYYYYYYYYK.',
      'KKYYYYKYYYKYYYYKK',
      'KYKYPPYKKKYPPYKYK',
      '.KKYYYKMMMKYYYKK.',
      '...KYYKMMMKYYK...',
      '...KYYYKKKYYYK...',
      '...KYYYYYYYYYK...',
      '...KUUYYYYYYUUK..',
      '....KYYYYYYYYK...',
      '...KKYYK..KYYKK..',
      '...KYYK....KYYK..',
      '....KK......KK...',
      '.................'
    ],
    usagiJumpPeak: [
      '....KK.....KK....',
      '...KYYK...KYYK...',
      '...KYPK...KPYK...',
      '...KYPK...KPYK...',
      '...KYPK...KPYK...',
      '...KYYKKKKKYYK...',
      '..KYYYYYYYYYYYK..',
      'KKYYYYYYYYYYYYYKK',
      'KYKYYYKYYYKYYYKYK',
      '.KKYPPYKKKYPPYKK.',
      '...KYYKMMMKYYK...',
      '...KYYKMMMKYYK...',
      '...KYYYKKKYYYK...',
      '...KYYYYYYYYYK...',
      '...KUUYYYYYYUUK..',
      '...KYYYYYYYYYYK..',
      '..KKYYK....KYYKK.',
      '..KYYK......KYYK.',
      '...KK........KK..',
      '.................'
    ],

    weedPlanted: [
      'L.E.L',
      'GLELG',
      '.KEK.',
      '..E..',
      '..R..'
    ],
    weedPulled: [
      'L.E.L',
      'GLELG',
      '.KEK.',
      '.RRR.',
      'R.R.R'
    ],

    cloudBig: [
      '...WWWW....',
      '.WWWWWWWW..',
      'WWWWWWWWWW.',
      'SSWWWWWWWS.',
      '.SSSSSSSS..'
    ],
    cloudSmall: [
      '..WWWW...',
      'WWWWWWWW.',
      'SSWWWWSS.'
    ],

    yahaNormal: makeYahaBubble_(false),
    yahaHighlight: makeYahaBubble_(true)
  };
}
