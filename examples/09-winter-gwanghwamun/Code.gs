/** @OnlyCurrentDoc */

/**
 * Winter Gwanghwamun — Animated Pixel Art in Google Sheets
 *
 * How to run:
 * 1. Open a Google Sheet and go to Extensions > Apps Script.
 * 2. Paste this entire file into Code.gs and save.
 * 3. Reload the spreadsheet (or run onOpen) to see the "Winter Gwanghwamun" menu.
 * 4. Click "Winter Gwanghwamun" > "1. Setup Scene" to build the 72x36 pixel grid.
 * 5. Click "Winter Gwanghwamun" > "2. Play Animation (60s)" to animate (~2 fps, 30-frame 15s loop).
 * 6. Click "Winter Gwanghwamun" > "3. Stop Animation" to stop early.
 */

var GRID_ROWS = 36;
var GRID_COLS = 72;
var PIXEL_SIZE = 13;
var TOTAL_FRAMES = 30;
var FRAME_CELL = 'B1';
var SHEET_NAME = 'Gwanghwamun';

var PALETTE = {
  1: '#0B1026', // Deep night sky
  2: '#141D3B', // Twilight indigo sky
  3: '#1E2B52', // Horizon twilight blue
  4: '#0E152B', // Bugaksan mountain silhouette
  5: '#F4F8FF', // Snow white
  6: '#CFE0F5', // Shaded snow blue-white
  7: '#8FA8C8', // Plaza snow shadow
  8: '#5B6270', // Granite stone base
  9: '#3E4450', // Granite mortar / shadow
  10: '#1E232D', // Dark slate roof tile
  11: '#2D3544', // Roof ridge highlight
  12: '#9E1B1E', // Gwanghwamun crimson pillar
  13: '#C92A2A', // Red parka / scarf
  14: '#1B5E4A', // Dancheong jade eaves
  15: '#2563EB', // Blue parka
  16: '#F59E0B', // Warm amber lantern / lamp
  17: '#FDE047', // Bright gold glow / star / sparkle
  18: '#FFFBEB', // Intense warm white-gold core
  19: '#11131C', // Dark arch / outline / boots
  20: '#FDBA74'  // Warm peach face
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Winter Gwanghwamun')
    .addItem('1. Setup Scene', 'setup')
    .addItem('2. Play Animation (60s)', 'play')
    .addItem('3. Stop Animation', 'stop')
    .addToUi();
}

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.getActiveSheet();
    sheet.setName(SHEET_NAME);
  }

  sheet.clear();
  sheet.clearConditionalFormatRules();

  // Ensure exact dimensions (1 header row + 36 pixel rows, 72 pixel columns)
  var maxRows = sheet.getMaxRows();
  var neededRows = GRID_ROWS + 1;
  if (maxRows < neededRows) {
    sheet.insertRowsAfter(maxRows, neededRows - maxRows);
  } else if (maxRows > neededRows) {
    sheet.deleteRows(neededRows + 1, maxRows - neededRows);
  }

  var maxCols = sheet.getMaxColumns();
  if (maxCols < GRID_COLS) {
    sheet.insertColumnsAfter(maxCols, GRID_COLS - maxCols);
  } else if (maxCols > GRID_COLS) {
    sheet.deleteColumns(GRID_COLS + 1, maxCols - GRID_COLS);
  }

  // Header & frame counter in B1
  sheet.setRowHeight(1, 24);
  sheet.getRange('A1').setValue('FRAME').setFontWeight('bold').setHorizontalAlignment('center');
  sheet.getRange(FRAME_CELL).setValue(0).setFontWeight('bold').setHorizontalAlignment('center');
  sheet.getRange('C1:T1').merge();
  sheet.getRange('C1')
    .setValue('Winter Gwanghwamun (72x36, 20 colours, 30-frame 15s loop @ ~2 fps)')
    .setFontColor('#475569')
    .setVerticalAlignment('middle');

  // Make pixel cells square
  sheet.setRowHeights(2, GRID_ROWS, PIXEL_SIZE);
  sheet.setColumnWidths(1, GRID_COLS, PIXEL_SIZE);

  // Build static base grid (36 x 72)
  var bg = buildBaseScene_();
  var textMask = buildSeoulTextMask_();
  var starMap = getStarMap_();

  // Generate per-cell formulas that depend solely on $B$1
  var formulas = [];
  for (var r = 0; r < GRID_ROWS; r++) {
    var rowFormulas = [];
    for (var c = 0; c < GRID_COLS; c++) {
      rowFormulas.push(buildCellFormula_(r, c, bg[r][c], textMask[r][c], starMap[r + ',' + c]));
    }
    formulas.push(rowFormulas);
  }

  var pixelRange = sheet.getRange(2, 1, GRID_ROWS, GRID_COLS);
  pixelRange.setFormulas(formulas);
  pixelRange.setHorizontalAlignment('center').setVerticalAlignment('middle');

  // Map formula integer outputs (1..20) to solid colours via Conditional Formatting
  var rules = [];
  var keys = Object.keys(PALETTE);
  for (var i = 0; i < keys.length; i++) {
    var code = Number(keys[i]);
    var hex = PALETTE[code];
    rules.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenNumberEqualTo(code)
        .setBackground(hex)
        .setFontColor(hex)
        .setRanges([pixelRange])
        .build()
    );
  }
  sheet.setConditionalFormatRules(rules);

  // Hide gridlines for a clean pixel-art look
  try {
    sheet.setHiddenGridlines(true);
  } catch (e) {}

  SpreadsheetApp.flush();
}

function play() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.getActiveSheet();
  var props = PropertiesService.getDocumentProperties();
  props.setProperty('STOP_ANIM', '0');

  var frameCell = sheet.getRange(FRAME_CELL);
  var startTime = Date.now();
  var frame = Number(frameCell.getValue()) || 0;

  while (Date.now() - startTime < 58000) {
    if (props.getProperty('STOP_ANIM') === '1') {
      break;
    }
    frame = (frame + 1) % TOTAL_FRAMES;
    frameCell.setValue(frame);
    SpreadsheetApp.flush();
    Utilities.sleep(150);
  }
}

function stop() {
  PropertiesService.getDocumentProperties().setProperty('STOP_ANIM', '1');
}

/**
 * Builds the 36x72 base colour-code matrix for Winter Gwanghwamun.
 */
function buildBaseScene_() {
  var g = [];
  for (var r = 0; r < GRID_ROWS; r++) {
    var row = [];
    for (var c = 0; c < GRID_COLS; c++) {
      // Sky gradient
      if (r < 6) row.push(1);
      else if (r < 12) row.push(2);
      else if (r < 25) row.push(3);
      else row.push(5); // Snowy plaza foreground
    }
    g.push(row);
  }

  // Bugaksan mountain silhouette behind Gwanghwamun
  for (var c = 0; c < GRID_COLS; c++) {
    var mTop = 16;
    if (c < 24) {
      mTop = Math.round(10 + 4 * Math.sin(c * 0.14) + Math.abs(c - 12) * 0.25);
    } else if (c > 47) {
      mTop = Math.round(10 + 4 * Math.sin((71 - c) * 0.14) + Math.abs(c - 59) * 0.25);
    } else {
      mTop = 9;
    }
    for (var r = Math.max(7, mTop); r < 21; r++) {
      g[r][c] = 4;
    }
  }

  // Palace wing walls (left & right)
  for (var c = 0; c < 16; c++) {
    g[20][c] = 5; // Snow cap
    for (var r = 21; r <= 24; r++) {
      g[r][c] = (r % 2 === 0 && c % 3 === 0) ? 9 : 8;
    }
  }
  for (var c = 56; c < GRID_COLS; c++) {
    g[20][c] = 5;
    for (var r = 21; r <= 24; r++) {
      g[r][c] = (r % 2 === 0 && c % 3 === 0) ? 9 : 8;
    }
  }

  // Gwanghwamun Granite Base (Yukchuk): cols 16..55, rows 18..24
  for (var r = 18; r <= 24; r++) {
    for (var c = 16; c <= 55; c++) {
      if (r === 18) {
        g[r][c] = (c % 2 === 0) ? 6 : 8;
      } else {
        g[r][c] = ((r + c) % 4 === 0 || r === 21) ? 9 : 8;
      }
    }
  }

  // Three Arched Portals (Hongyemun)
  // Left arch: cols 21..25, rows 20..24
  carveArch_(g, 21, 25, 20, 24);
  // Center arch (taller & wider): cols 32..39, rows 19..24
  carveArch_(g, 32, 39, 19, 24);
  // Right arch: cols 46..50, rows 20..24
  carveArch_(g, 46, 50, 20, 24);

  // Lower Pavilion Eaves (Dancheong): row 17, cols 18..53
  for (var c = 18; c <= 53; c++) {
    g[17][c] = (c % 3 === 0) ? 12 : 14;
  }

  // Lower Roof (1st tier): rows 14..16, cols 15..56
  for (var c = 15; c <= 56; c++) {
    g[16][c] = 10;
    g[15][c] = (c % 5 === 0) ? 6 : 10;
    if (c >= 17 && c <= 54) {
      g[14][c] = (c === 17 || c === 54) ? 5 : 11;
    }
  }
  // Upturned lower roof tips with snow
  g[15][15] = 5; g[15][16] = 6;
  g[15][55] = 6; g[15][56] = 5;

  // Upper Pavilion (Nugak): rows 11..13, cols 24..47
  for (var r = 11; r <= 13; r++) {
    for (var c = 24; c <= 47; c++) {
      if (r === 11) {
        g[r][c] = (c % 3 === 0) ? 12 : 14;
      } else if (c === 24 || c === 28 || c === 32 || c === 35 || c === 36 || c === 39 || c === 43 || c === 47) {
        g[r][c] = 12; // Crimson pillars
      } else {
        g[r][c] = 19; // Dark wooden lattice windows (will glow!)
      }
    }
  }

  // Upper Roof (2nd tier): rows 7..10, cols 20..51
  for (var c = 20; c <= 51; c++) {
    g[10][c] = 10;
    if (c >= 22 && c <= 49) g[9][c] = (c % 4 === 0) ? 6 : 10;
    if (c >= 24 && c <= 47) g[8][c] = 5; // Snow-capped upper roof
    if (c >= 26 && c <= 45) g[7][c] = (c === 26 || c === 45) ? 6 : 5; // Ridge snow
  }
  // Upturned upper roof tips
  g[9][20] = 5; g[9][21] = 6;
  g[9][50] = 6; g[9][51] = 5;

  // Snowy Plaza foreground details (rows 25..35)
  for (var r = 25; r < GRID_ROWS; r++) {
    for (var c = 0; c < GRID_COLS; c++) {
      if (r === 25) {
        g[r][c] = 7; // Wall base shadow
      } else if (r >= 33) {
        g[r][c] = ((r + c) % 7 === 0) ? 7 : 6;
      } else {
        g[r][c] = ((r * 3 + c) % 11 === 0) ? 6 : 5;
      }
    }
  }

  // Two Plaza Streetlamps (cols 9 and 62)
  drawLamp_(g, 9);
  drawLamp_(g, 62);

  return g;
}

function carveArch_(g, c1, c2, r1, r2) {
  for (var r = r1; r <= r2; r++) {
    for (var c = c1; c <= c2; c++) {
      if (r === r1 && (c === c1 || c === c2)) continue;
      g[r][c] = 19;
    }
  }
}

function drawLamp_(g, col) {
  // Warm snow pool on ground
  for (var c = col - 2; c <= col + 2; c++) {
    g[29][c] = (Math.abs(c - col) <= 1) ? 16 : 7;
    g[30][c] = (c === col) ? 16 : 6;
  }
  // Lamp post
  for (var r = 23; r <= 28; r++) {
    g[r][col] = 19;
  }
  // Lamp head
  g[21][col] = 17;
  g[22][col - 1] = 16;
  g[22][col] = 18;
  g[22][col + 1] = 16;
}

/**
 * Returns 36x72 boolean mask for crisp "SEOUL" pixel text in upper sky (rows 1..5, cols 26..44).
 * Guaranteed >= 1px margin around every letter.
 */
function buildSeoulTextMask_() {
  var mask = [];
  for (var r = 0; r < GRID_ROWS; r++) {
    mask.push(new Array(GRID_COLS).fill(false));
  }
  var letters = [
    ['###', '#..', '###', '..#', '###'], // S
    ['###', '#..', '###', '#..', '###'], // E
    ['###', '#.#', '#.#', '#.#', '###'], // O
    ['#.#', '#.#', '#.#', '#.#', '###'], // U
    ['#..', '#..', '#..', '#..', '###']  // L
  ];
  var startRow = 1;
  var startCol = 26;
  for (var li = 0; li < letters.length; li++) {
    var pat = letters[li];
    var colOff = startCol + li * 4;
    for (var pr = 0; pr < 5; pr++) {
      for (var pc = 0; pc < 3; pc++) {
        if (pat[pr][pc] === '#') {
          mask[startRow + pr][colOff + pc] = true;
        }
      }
    }
  }
  return mask;
}

function getStarMap_() {
  var stars = [
    [1, 5], [2, 14], [1, 21], [3, 9], [4, 18], [2, 51],
    [1, 58], [3, 65], [5, 61], [4, 49], [2, 68], [5, 3]
  ];
  var map = {};
  for (var i = 0; i < stars.length; i++) {
    map[stars[i][0] + ',' + stars[i][1]] = true;
  }
  return map;
}

/**
 * Builds a concise, fast spreadsheet formula for pixel (r, c) driven by $B$1.
 */
function buildCellFormula_(r, c, base, isText, isStar) {
  var fExpr = 'MOD($B$1,' + TOTAL_FRAMES + ')';

  // 1. SEOUL text in upper sky: white (5), shimmers gold/white (17/18) during payoff f >= 18
  if (isText) {
    return '=LET(f,' + fExpr + ',IF(f>=18,IF(MOD(f+' + c + ',2)=0,17,18),5))';
  }

  // 2. Twinkling stars in upper sky
  if (isStar) {
    return '=LET(f,' + fExpr + ',IF(MOD(f+' + (r + c) + ',6)=0,17,1))';
  }

  // 3. Upper pavilion windows (rows 12..13, cols 25..46) glow warm during payoff
  if ((r === 12 || r === 13) && c >= 25 && c <= 46 && base === 19) {
    return '=LET(f,' + fExpr + ',IF(f>=18,IF(MOD(f+' + c + ',3)=0,18,17),IF(MOD(f+' + c + ',8)=0,16,19)))';
  }

  // 4. Three arched portals: lantern flicker (f<18) -> golden blaze (f>=18)
  var isLeftArch = (r >= 20 && r <= 24 && c >= 21 && c <= 25 && base === 19);
  var isCenterArch = (r >= 19 && r <= 24 && c >= 32 && c <= 39 && base === 19);
  var isRightArch = (r >= 20 && r <= 24 && c >= 46 && c <= 50 && base === 19);
  if (isLeftArch || isCenterArch || isRightArch) {
    var isLanternCore = (c === 23 && r === 22) || ((c === 35 || c === 36) && r === 21) || (c === 48 && r === 22);
    if (isLanternCore) {
      return '=LET(f,' + fExpr + ',IF(f>=18,18,IF(MOD(f,4)<2,17,16)))';
    }
    return '=LET(f,' + fExpr + ',IF(f>=18,IF(MOD(' + (r + c) + '+f,3)=0,18,17),IF(' + r + '>=22,IF(MOD(f,6)<3,16,19),19)))';
  }

  // 5. Streetlamp glow flicker
  if ((c === 9 || c === 62) && r === 22) {
    return '=LET(f,' + fExpr + ',IF(MOD(f+' + c + ',5)=0,17,18))';
  }

  // 6. Plaza characters + snowman zone (rows 25..34, cols 13..58)
  if (r >= 25 && r <= 34 && c >= 13 && c <= 58) {
    var expr = String(base);

    // Snowman (cols 34..37, rows 27..31) built during frames 9..17, stays 18..29
    if (r >= 27 && r <= 31 && c >= 34 && c <= 37) {
      var smCode = getSnowmanPixel_(r, c);
      if (smCode > 0) {
        var minF = (r >= 30) ? 9 : 13;
        if (r === 29 && (c === 35 || c === 36)) {
          expr = 'IF(f>=18,13,IF(f>=' + minF + ',' + smCode + ',' + expr + '))';
        } else {
          expr = 'IF(f>=' + minF + ',' + smCode + ',' + expr + ')';
        }
      }
    }

    // Visitor A (Red Parka, walks col 14 -> 28 in f=0..7, jumps at 28 in f>=18)
    if (c >= 14 && c <= 31) {
      expr = wrapVisitorFormula_('A', r, c, 13, 16, expr);
    }

    // Visitor B (Blue Parka, walks col 54 -> 42 in f=0..6, jumps at 42 in f>=18)
    if (c >= 42 && c <= 57) {
      expr = wrapVisitorFormula_('B', r, c, 15, 17, expr);
    }

    return '=LET(f,' + fExpr + ',' + expr + ')';
  }

  // 7. Sky & mountain: falling snow + rising golden sparkles above roof during payoff
  if (base === 1 || base === 2 || base === 3 || base === 4) {
    var snowCond = 'OR(AND(MOD(' + r + '-f,15)=MOD(' + (c * 7) + ',15),MOD(' + c + ',3)=1),AND(MOD(' + r + '-INT(f/2),15)=MOD(' + (c * 11 + 5) + ',15),MOD(' + c + ',4)=2))';
    if (r >= 4 && r <= 13 && c >= 14 && c <= 57) {
      var sparkCond = 'AND(f>=18,MOD(' + r + '+f,10)=MOD(' + (c * 5) + ',10),MOD(' + c + ',3)=0)';
      return '=LET(f,' + fExpr + ',IF(' + sparkCond + ',17,IF(' + snowCond + ',5,' + base + ')))';
    }
    return '=LET(f,' + fExpr + ',IF(' + snowCond + ',5,' + base + '))';
  }

  // 8. Remaining static architecture / snow ground: gentle snow overlay on dark tiles
  if (base === 8 || base === 9 || base === 10 || base === 11) {
    var roofSnow = 'AND(MOD(' + r + '-f,15)=MOD(' + (c * 7) + ',15),MOD(' + c + ',4)=1)';
    return '=LET(f,' + fExpr + ',IF(' + roofSnow + ',5,' + base + '))';
  }

  // Pure static pixel still depends on $B$1 via LET
  return '=LET(f,' + fExpr + ',' + base + ')';
}

function getSnowmanPixel_(r, c) {
  // Base snowball (rows 30..31, cols 34..37)
  if (r === 31 && (c >= 34 && c <= 37)) return (c === 34 || c === 37) ? 6 : 5;
  if (r === 30 && (c >= 34 && c <= 37)) return 5;
  // Middle / scarf (row 29, cols 35..36)
  if (r === 29 && (c === 35 || c === 36)) return 5;
  // Head (rows 27..28, cols 35..36)
  if (r === 28 && c === 35) return 19; // Eye
  if (r === 28 && c === 36) return 16; // Carrot nose
  if (r === 27 && (c === 35 || c === 36)) return 5;
  return 0;
}

function wrapVisitorFormula_(who, r, c, coatColor, scarfColor, fallbackExpr) {
  var xExpr = (who === 'A')
    ? 'MIN(28,14+f*2)'
    : 'MAX(42,54-f*2)';
  var jumpPhase = (who === 'A') ? 'MOD(f,4)<2' : 'MOD(f+2,4)<2';
  var topExpr = 'IF(AND(f>=18,' + jumpPhase + '),27,28)';
  var dx = '(' + c + '-x)';
  var dy = '(' + r + '-y)';

  return 'LET(x,' + xExpr + ',y,' + topExpr + ',dx,' + dx + ',dy,' + dy + ',' +
    'IF(AND(dx>=0,dx<=3,dy>=0,dy<=5),' +
      'IF(dy=0,IF(OR(dx=1,dx=2),5,' + fallbackExpr + '),' +
      'IF(dy=1,IF(OR(dx=1,dx=2),20,' + fallbackExpr + '),' +
      'IF(dy=2,IF(OR(dx=1,dx=2),' + scarfColor + ',' + coatColor + '),' +
      'IF(dy<=4,' + coatColor + ',' +
      'IF(OR(dx=1,dx=2),19,' + fallbackExpr + '))))),' +
    fallbackExpr + '))';
}
