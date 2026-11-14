/** @OnlyCurrentDoc */
/**
 * A2O LITE — "NEON" (October 2026) Viral Duo Intro in Google Sheets Pixel Art
 * Featuring AIJING & XILI (Mirrored Arm Moves, Hair Whips & AIJING's One-Foot Spin)
 *
 * ============================================================================
 * HOW TO INSTALL & RUN IN GOOGLE SHEETS
 * ============================================================================
 * 1. Create or open a Google Sheet.
 * 2. Open Extensions > Apps Script.
 * 3. Delete any starter code in Code.gs and paste this entire file.
 * 4. Save (Ctrl+S / Cmd+S), then select `setup` in the toolbar and click Run
 *    (grant permission when prompted), OR reload the Google Sheet and use the
 *    custom menu: `A2O LITE - NEON > 1. Setup Scene (Build Sheet)`.
 * 5. Run `A2O LITE - NEON > 2. Play Animation (~60s)` (or run `play()` from the
 *    Apps Script editor) to animate. Use `3. Stop Animation` / `stop()` to halt.
 * 6. You can also type any frame number directly into cell `Stage!B1` — every
 *    pixel is driven purely by spreadsheet formulas + conditional formatting.
 *
 * PERFORMANCE & FRAME RATE NOTE
 * - Grid: 64 x 38 = 2,432 square pixel cells (14px x 14px).
 * - Palette: 16 colors mapped via 16 native conditional formatting rules.
 * - Expected speed: ~2.5 to 3.5 FPS (paced to 3 FPS = ~333 ms/frame).
 * - Full loop length: 45 frames (~15 seconds per loop at 3 FPS).
 * - `play()` runs for ~60 seconds (~4 full loops).
 * ============================================================================
 */

var STAGE_SHEET_NAME = 'Stage';
var SPRITES_SHEET_NAME = 'Sprites';
var GRID_COLS = 64;
var GRID_ROWS = 38;
var PIXEL_SIZE_PX = 14;
var LOOP_FRAMES = 45;
var TARGET_FRAME_MS = 333; // ~3 FPS -> 45 frames = ~15 seconds per loop
var PLAY_DURATION_MS = 60000;
var STOP_CACHE_KEY = 'A2O_NEON_STOP';

// 16-color cyber/neon pixel palette (IDs 0..15, encoded as 'A'..'P' in sprites)
var PALETTE = [
  '#0B0A14', // 0  A: Deep Stage Black / Outlines / Xili Hair Base / Boots
  '#181330', // 1  B: Dark Stage Indigo / Xili Hair Mid
  '#2D284D', // 2  C: Stage Floor Charcoal / Tech Skirt
  '#124873', // 3  D: Cyan Spotlight Beam Glow
  '#54164E', // 4  E: Pink Spotlight Beam Glow
  '#00E5FF', // 5  F: Electric Neon Cyan
  '#FF2E93', // 6  G: Hot Neon Pink
  '#FF99CC', // 7  H: Pastel Neon Pink / Cheek Blush
  '#FFFFFF', // 8  I: Crisp White / Tops / Eye Sparkle / Caption
  '#B5D3F0', // 9  J: Silver-Ice Shading / Neon Highlight
  '#FFD5BA', // 10 K: Warm Chibi Skin
  '#E6A382', // 11 L: Warm Skin Shadow
  '#7D4326', // 12 M: AIJING Chestnut Brown Hair
  '#B86D40', // 13 N: AIJING Hair Caramel Highlight
  '#472012', // 14 O: AIJING Hair Shadow / Eyes
  '#495885'  // 15 P: XILI Hair Slate Shine / Cyber Steel Trim
];

/**
 * Adds custom menu on spreadsheet open.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('A2O LITE - NEON')
    .addItem('1. Setup Scene (Build Sheet)', 'setup')
    .addItem('2. Play Animation (~60s)', 'play')
    .addItem('3. Stop Animation', 'stop')
    .addSeparator()
    .addItem('4. Reset Frame to 0', 'resetFrame')
    .addToUi();
}

/**
 * Builds the `Sprites` lookup sheet and the `Stage` 64x38 pixel canvas,
 * writing spreadsheet formulas and 16 conditional formatting rules.
 */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var spritesSheet = getOrCreateSheet_(ss, SPRITES_SHEET_NAME);
  var stageSheet = getOrCreateSheet_(ss, STAGE_SHEET_NAME);

  buildSpritesSheet_(spritesSheet);
  buildStageSheet_(stageSheet);

  ss.setActiveSheet(stageSheet);
  stageSheet.getRange('B1').activate();
  SpreadsheetApp.flush();
}

/**
 * Advances the frame counter cell `Stage!B1` in a loop for ~60 seconds.
 */
function play() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var stageSheet = ss.getSheetByName(STAGE_SHEET_NAME);
  if (!stageSheet) {
    setup();
    stageSheet = ss.getSheetByName(STAGE_SHEET_NAME);
  }

  var cache = CacheService.getDocumentCache();
  cache.put(STOP_CACHE_KEY, '0', 120);

  var frameCell = stageSheet.getRange('B1');
  var statusCell = stageSheet.getRange('AT1');
  var rawVal = Number(frameCell.getValue());
  var frame = isNaN(rawVal) ? 0 : Math.floor(rawVal);

  statusCell.setValue('PLAYING (~3 FPS)');
  SpreadsheetApp.flush();

  var startTime = Date.now();
  while (Date.now() - startTime < PLAY_DURATION_MS) {
    if (cache.get(STOP_CACHE_KEY) === '1') {
      statusCell.setValue('STOPPED');
      SpreadsheetApp.flush();
      return;
    }

    var tickStart = Date.now();
    frame += 1;
    frameCell.setValue(frame);
    SpreadsheetApp.flush();

    var elapsed = Date.now() - tickStart;
    if (elapsed < TARGET_FRAME_MS) {
      Utilities.sleep(TARGET_FRAME_MS - elapsed);
    }
  }

  statusCell.setValue('DONE (60s)');
  SpreadsheetApp.flush();
}

/**
 * Signals `play()` to stop cleanly on its next frame check.
 */
function stop() {
  var cache = CacheService.getDocumentCache();
  cache.put(STOP_CACHE_KEY, '1', 120);

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var stageSheet = ss.getSheetByName(STAGE_SHEET_NAME);
  if (stageSheet) {
    stageSheet.getRange('AT1').setValue('STOPPING...');
    SpreadsheetApp.flush();
  }
}

/**
 * Resets the frame counter cell `Stage!B1` to 0.
 */
function resetFrame() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var stageSheet = ss.getSheetByName(STAGE_SHEET_NAME);
  if (stageSheet) {
    stageSheet.getRange('B1').setValue(0);
    stageSheet.getRange('AT1').setValue('READY');
    SpreadsheetApp.flush();
  }
}

// ============================================================================
// INTERNAL BUILDERS (Setup Only)
// ============================================================================

function getOrCreateSheet_(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function buildSpritesSheet_(sheet) {
  sheet.clear();

  // Live frame state formulas in A1:B10 (all driven by Stage!$B$1)
  var stateRows = [
    ['loopFrame',  '=MOD(Stage!$B$1,' + LOOP_FRAMES + ')'],
    ['aijingPose', '=INDEX(J2:J46,B1+1)'],
    ['xiliPose',   '=INDEX(K2:K46,B1+1)'],
    ['aijingDy',   '=INDEX(L2:L46,B1+1)'],
    ['xiliDy',     '=INDEX(M2:M46,B1+1)'],
    ['spotPinkX',  '=32+25*SIN(B1*2*PI()/' + LOOP_FRAMES + ')'],
    ['spotCyanX',  '=32-25*SIN(B1*2*PI()/' + LOOP_FRAMES + ')'],
    ['neonState',  '=INDEX(N2:N46,B1+1)'],
    ['capMode',    '=INDEX(O2:O46,B1+1)'],
    ['capFlash',   '=INDEX(P2:P46,B1+1)']
  ];
  sheet.getRange(1, 1, stateRows.length, 2).setValues(stateRows);

  // Col C (C1:C210): AIJING 10 poses x 21 rows
  var aijingCol = flattenSprites_(getAijingPoses_());
  sheet.getRange(1, 3, aijingCol.length, 1).setValues(aijingCol);

  // Col D (D1:D126): XILI 6 poses x 21 rows
  var xiliCol = flattenSprites_(getXiliPoses_());
  sheet.getRange(1, 4, xiliCol.length, 1).setValues(xiliCol);

  // Col E (E1:E9): Big pink-blue NEON sign
  var neonCol = getNeonSignRows_().map(function (r) { return [r]; });
  sheet.getRange(1, 5, neonCol.length, 1).setValues(neonCol);

  // Col F (F1:F5) & Col G (G1:G5): Blocky pixel captions
  var cap1Col = getCaptionRows_(1).map(function (r) { return [r]; });
  var cap2Col = getCaptionRows_(2).map(function (r) { return [r]; });
  sheet.getRange(1, 6, cap1Col.length, 1).setValues(cap1Col);
  sheet.getRange(1, 7, cap2Col.length, 1).setValues(cap2Col);

  // Cols I..P (I1:P46): 45-frame choreography schedule
  var timeline = getTimeline_();
  var table = [['f', 'aPose', 'xPose', 'aDy', 'xDy', 'neon', 'capMode', 'capFlash']];
  for (var i = 0; i < timeline.length; i++) {
    var t = timeline[i];
    table.push([i, t[0], t[1], t[2], t[3], t[4], t[5], t[6]]);
  }
  sheet.getRange(1, 9, table.length, 8).setValues(table);
}

function buildStageSheet_(sheet) {
  sheet.clear();
  sheet.clearConditionalFormatRules();
  sheet.setHiddenGridlines(true);

  // Ensure exact dimensions: 40 rows (2 header + 38 pixels), 64 cols
  var maxCols = sheet.getMaxColumns();
  if (maxCols < GRID_COLS) {
    sheet.insertColumnsAfter(maxCols, GRID_COLS - maxCols);
  } else if (maxCols > GRID_COLS) {
    sheet.deleteColumns(GRID_COLS + 1, maxCols - GRID_COLS);
  }

  var maxRows = sheet.getMaxRows();
  var totalRows = GRID_ROWS + 2; // rows 1-2 header, rows 3-40 canvas
  if (maxRows < totalRows) {
    sheet.insertRowsAfter(maxRows, totalRows - maxRows);
  } else if (maxRows > totalRows) {
    sheet.deleteRows(totalRows + 1, maxRows - totalRows);
  }

  // Size columns & rows into small square pixels
  sheet.setColumnWidths(1, GRID_COLS, PIXEL_SIZE_PX);
  sheet.setRowHeight(1, 26);
  sheet.setRowHeight(2, 6);
  sheet.setRowHeights(3, GRID_ROWS, PIXEL_SIZE_PX);

  // Header control bar (Rows 1-2)
  var headerBg = sheet.getRange(1, 1, 2, GRID_COLS);
  headerBg.setBackground('#0B0A14').setFontColor('#E0ECFF').setFontFamily('Roboto Mono').setFontSize(9).setVerticalAlignment('middle');

  sheet.getRange('A1:BL1').breakApart();
  sheet.getRange('A1:A1').setValue('F').setFontColor('#FF2E93').setFontWeight('bold').setHorizontalAlignment('center');
  sheet.getRange('B1').setValue(0).setBackground('#181330').setFontColor('#00E5FF').setFontWeight('bold').setHorizontalAlignment('center')
    .setBorder(true, true, true, true, false, false, '#00E5FF', SpreadsheetApp.BorderStyle.SOLID);

  sheet.getRange('D1:X1').merge().setValue('A2O LITE - NEON (AIJING & XILI)').setFontColor('#FFFFFF').setFontWeight('bold');
  sheet.getRange('Z1:AR1').merge().setFormula('=IF(Sprites!B9=1,"LYRIC: NEON AND BEYOND","MEME: MIHON N BIHON?!")').setFontColor('#FF99CC').setFontWeight('bold').setHorizontalAlignment('center');
  sheet.getRange('AT1:BL1').merge().setValue('READY').setFontColor('#00E5FF').setHorizontalAlignment('right');

  // Build 64x38 pixel formula matrix (every cell depends on $B$1)
  var formulas = [];
  for (var y = 0; y < GRID_ROWS; y++) {
    var rowFormulas = [];
    for (var x = 0; x < GRID_COLS; x++) {
      rowFormulas.push(buildPixelFormula_(x, y));
    }
    formulas.push(rowFormulas);
  }

  var pixelRange = sheet.getRange(3, 1, GRID_ROWS, GRID_COLS);
  pixelRange.setNumberFormat(';;;');
  pixelRange.setFormulas(formulas);

  // Map formula values 0..15 to hex colors via native Conditional Formatting
  var rules = [];
  for (var c = 0; c < PALETTE.length; c++) {
    rules.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenNumberEqualTo(c)
        .setBackground(PALETTE[c])
        .setFontColor(PALETTE[c])
        .setRanges([pixelRange])
        .build()
    );
  }
  sheet.setConditionalFormatRules(rules);
}

/**
 * Generates the spreadsheet formula for pixel (x, y) in 0..63 x 0..37.
 * Every formula references the single frame counter cell $B$1.
 */
function buildPixelFormula_(x, y) {
  // Caption divider top (y = 31)
  if (y === 31) {
    return '=IF(MOD(' + x + '+$B$1,6)<3,5,6)';
  }
  // Caption blocky pixel text (y = 32..36)
  if (y >= 32 && y <= 36) {
    var capRow = y - 31;
    var capCol = x + 1;
    return '=LET(f,$B$1,ch,MID(INDEX(IF(Sprites!$B$9=1,Sprites!$F$1:$F$5,Sprites!$G$1:$G$5),' + capRow + '),' + capCol + ',1),' +
      'IF(ch=".",0,IF(Sprites!$B$10=1,5,IF(ch="W",8,IF(ch="P",6,IF(ch="H",7,5))))))';
  }
  // Caption divider bottom (y = 37)
  if (y === 37) {
    return '=IF(MOD(' + x + '-$B$1,6)<3,6,5)';
  }

  // Stage backdrop + sweeping spotlight formula
  var bg = buildBgExpr_(x, y);

  // Big pink-blue NEON sign (x = 13..50, y = 0..8)
  if (x >= 13 && x <= 50 && y >= 0 && y <= 8) {
    var nx = x - 13 + 1;
    var ny = y + 1;
    return '=LET(f,$B$1,ch,MID(INDEX(Sprites!$E$1:$E$9,' + ny + '),' + nx + ',1),st,Sprites!$B$8,' +
      'IF(ch=".",' + bg + ',IF(ch="B",2,IF(st=0,1,IF(ch="C",5,IF(ch="J",IF(st=1,5,9),IF(ch="P",IF(st=1,4,6),IF(st=1,6,8))))))))';
  }

  // AIJING sprite box (x = 9..30, y = 9..29)
  if (x >= 9 && x <= 30 && y >= 9 && y <= 29) {
    var ax = x - 9 + 1;
    var ay = y - 9 + 1;
    return '=LET(f,$B$1,ry,' + ay + '-Sprites!$B$4,' +
      'ch,IF(OR(ry<1,ry>21),".",MID(INDEX(Sprites!$C$1:$C$210,21*(Sprites!$B$2-1)+ry),' + ax + ',1)),' +
      'IF(ch<>".",CODE(ch)-65,' + bg + '))';
  }

  // XILI sprite box (x = 33..54, y = 9..29)
  if (x >= 33 && x <= 54 && y >= 9 && y <= 29) {
    var xx = x - 33 + 1;
    var xy = y - 9 + 1;
    return '=LET(f,$B$1,ry,' + xy + '-Sprites!$B$5,' +
      'ch,IF(OR(ry<1,ry>21),".",MID(INDEX(Sprites!$D$1:$D$126,21*(Sprites!$B$3-1)+ry),' + xx + ',1)),' +
      'IF(ch<>".",CODE(ch)-65,' + bg + '))';
  }

  // Pure stage / spotlight pixel
  return '=LET(f,$B$1,' + bg + ')';
}

function buildBgExpr_(x, y) {
  if (y < 26) {
    if (y <= 1 && Math.abs(x - 8) <= 1) return '6';
    if (y <= 1 && Math.abs(x - 55) <= 1) return '5';
    var t = (y / 26).toFixed(4);
    var hw = (1.35 + y * 0.21).toFixed(2);
    var base = y < 17 ? 0 : 1;
    return 'IF(ABS(' + x + '-(55+(Sprites!$B$7-55)*' + t + '))<=' + hw + ',3,' +
      'IF(ABS(' + x + '-(8+(Sprites!$B$6-8)*' + t + '))<=' + hw + ',4,' + base + '))';
  }
  if (y === 26) {
    return 'IF(ABS(' + x + '-Sprites!$B$6)<=4,6,IF(ABS(' + x + '-Sprites!$B$7)<=4,5,2))';
  }
  var rp = (4 + (y - 26)).toFixed(1);
  var gcol = ((x + y * 2) % 8 === 0 || y === 28) ? 2 : 1;
  return 'IF(ABS(' + x + '-Sprites!$B$6)<=1.5,6,IF(ABS(' + x + '-Sprites!$B$7)<=1.5,5,' +
    'IF(ABS(' + x + '-Sprites!$B$6)<=' + rp + ',4,IF(ABS(' + x + '-Sprites!$B$7)<=' + rp + ',3,' + gcol + '))))';
}

// ============================================================================
// SPRITE & CHOREOGRAPHY DATA
// ============================================================================

function flattenSprites_(poses) {
  var rows = [];
  for (var p = 0; p < poses.length; p++) {
    for (var r = 0; r < poses[p].length; r++) {
      rows.push([poses[p][r]]);
    }
  }
  return rows;
}

function getAijingPoses_() {
  return [
    // 1: A_IDLE — Straight brown hair, cyber white/cyan-trimmed top, dark pleated skirt, boots
    [
      '.......OOOOOOOO.......',
      '......OMMNNNNMMO......',
      '.....OMMMKKKKMMMO.....',
      '....OMMKKMKKMKKMMO....',
      '....OMKKIOKKOIKKMO....',
      '....OMKKOOKKOOKKMO....',
      '....OMKHKKKKKKHKMO....',
      '....OMMKKKLLKKKMMO....',
      '....OMMOLLLLLLOMMO....',
      '...OMM.AFIIIIFA.MMO...',
      '..OMM.KAIIJJIIAK.MMO..',
      '..OM.K.AIIFFIIA.K.MO..',
      '....K..AIGGGGIA..K....',
      '......ACCCCCCCCA......',
      '.....ACPCCCCCCPCA.....',
      '.....AFFFFFFFFFFA.....',
      '......AKKA..AKKA......',
      '......AKKA..AKKA......',
      '......APPA..APPA......',
      '......AAAA..AAAA......',
      '.....AGGGG..GGGGA.....'
    ],
    // 2: A_WAVE_L — Mirrored arm move (Left arm up/out)
    [
      '.......OOOOOOOO.......',
      '......OMMNNNNMMO......',
      '.....OMMMKKKKMMMO.....',
      '....OMMKKMKKMKKMMO....',
      '....OMKKIOKKOIKKMO....',
      '....OMKKOOKKOOKKMO....',
      '....OMKHKKKKKKHKMO....',
      '....OMMKKKLLKKKMMO....',
      '.KK.OMMOLLLLLLOMMO....',
      'KFFKMM.AFIIIIFA.MMO...',
      '.AIIK..AIIJJIIAK.MMO..',
      '..AII..AIIFFIIAK..MO..',
      '...A...AIGGGGIA.......',
      '......ACCCCCCCCA......',
      '.....ACPCCCCCCPCA.....',
      '.....AFFFFFFFFFFA.....',
      '......AKKA..AKKA......',
      '.....AKKA....AKKA.....',
      '.....APPA....APPA.....',
      '.....AAAA....AAAA.....',
      '....AGGGG....GGGGA....'
    ],
    // 3: A_WAVE_R — Mirrored arm move (Right arm up/out)
    [
      '.......OOOOOOOO.......',
      '......OMMNNNNMMO......',
      '.....OMMMKKKKMMMO.....',
      '....OMMKKMKKMKKMMO....',
      '....OMKKIOKKOIKKMO....',
      '....OMKKOOKKOOKKMO....',
      '....OMKHKKKKKKHKMO....',
      '....OMMKKKLLKKKMMO....',
      '....OMMOLLLLLLOMMO.KK.',
      '...OMM.AFIIIIFA.MMKFFK',
      '..OMM.KAIIJJIIAK..KIIA',
      '..OM..KAIIFFIIA...IIA.',
      '.......AIGGGGIA...A...',
      '......ACCCCCCCCA......',
      '.....ACPCCCCCCPCA.....',
      '.....AFFFFFFFFFFA.....',
      '......AKKA..AKKA......',
      '.....AKKA....AKKA.....',
      '.....APPA....APPA.....',
      '.....AAAA....AAAA.....',
      '....AGGGG....GGGGA....'
    ],
    // 4: A_WHIP_L — Hair whip snapping right
    [
      '......OOOOOOOO........',
      '.....OMMNNNNMMOO......',
      '....OMMMKKKKMMNNMO....',
      '...OMMKKMKKMKKMMNNMO..',
      '...OMKKIOKKOIKKMMNNMO.',
      '...OMKKOOKKOOKKMMMNO..',
      '...OMKHKKKKKKHKMMMO...',
      '...OMMKKKLLKKKMMO.....',
      '....OMMOLLLLLLOMMO....',
      '.....M.AFIIIIFA.MMO...',
      '....K..AIIJJIIA..KK...',
      '...K...AIIFFIIA...K...',
      '..K....AIGGGGIA....K..',
      '......ACCCCCCCCA......',
      '.....ACPCCCCCCPCA.....',
      '.....AFFFFFFFFFFA.....',
      '......AKKA..AKKA......',
      '.....AKKA....AKKA.....',
      '.....APPA....APPA.....',
      '.....AAAA....AAAA.....',
      '....AGGGG....GGGGA....'
    ],
    // 5: A_WHIP_R — Hair whip snapping left
    [
      '........OOOOOOOO......',
      '......OOMMNNNNMMO.....',
      '....OMNNMMKKKKMMMO....',
      '..OMNNMMKKMKKMKKMMO...',
      '.OMNNMMKKIOKKOIKKMO...',
      '..ONMMMKKOOKKOOKKMO...',
      '...OMMMKHKKKKKKHKMO...',
      '.....OMMKKKLLKKKMMO...',
      '....OMMOLLLLLLOMMO....',
      '...OMM.AFIIIIFA.M.....',
      '...KK..AIIJJIIA..K....',
      '..K....AIIFFIIA...K...',
      '.K.....AIGGGGIA....K..',
      '......ACCCCCCCCA......',
      '.....ACPCCCCCCPCA.....',
      '.....AFFFFFFFFFFA.....',
      '......AKKA..AKKA......',
      '.....AKKA....AKKA.....',
      '.....APPA....APPA.....',
      '.....AAAA....AAAA.....',
      '....AGGGG....GGGGA....'
    ],
    // 6: A_SPIN_PREP — Coiled crouch & kick-out before one-foot spin
    [
      '......................',
      '.......OOOOOOOO.......',
      '......OMMNNNNMMO......',
      '.....OMMMKKKKMMMO.....',
      '....OMMKKMKKMKKMMO....',
      '....OMKKIOKKOIKKMO....',
      '....OMKKOOKKOOKKMO....',
      '....OMKHKKKKKKHKMO....',
      '....OMMKKKLLKKKMMO....',
      '...OMM.AFIIIIFA.MMO...',
      '..OM..KAIIJJIIAK..MO..',
      '.KK....AIIFFIIA....KK.',
      '.......AIGGGGIA.......',
      '......ACCCCCCCCA......',
      '.....ACPCCCCCCPCA.....',
      '.....AFFFFFFFFFFA.....',
      '......AKKA..AKKAA.....',
      '......AKKA...AKKAA....',
      '......APPA....APPA....',
      '......AAAA....AGGA....',
      '.....AGGGG............'
    ],
    // 7: A_SPIN_S1 — One-foot spin 90 deg (balanced on 1 boot, knee tucked)
    [
      '.......OOOOOOO........',
      '......OMNNNNMMO.......',
      '....OMMMMKKKMMMO......',
      '..OMNNMMKKKIOKKMO.....',
      '.OMNNMMKKKKOOKKMO.....',
      '.ONMMMKKKKKKKHKMO.....',
      '..OMMMKKKKKLLKKMO.....',
      '....OMMMOLLLLOMMO.....',
      '.......AFIIIIFA.......',
      '.......AIIFFIIA.......',
      '.......AIJJJJIAK......',
      '.......AIGGGGIA.......',
      '......ACCCCCCCCA......',
      '......ACPCCCCPCA......',
      '......AFFFFFFFFA......',
      '.......AKKAAKKK.......',
      '.......AKKA.AKKPA.....',
      '.......APPA..AAGA.....',
      '.......AAAA...........',
      '.......AAAA...........',
      '......AGGGG...........'
    ],
    // 8: A_SPIN_BACK — One-foot spin 180 deg (back view, hair flaring)
    [
      '.......OOOOOOOO.......',
      '......OMMNNNNMMO......',
      '.....OMMMNNNNMMMO.....',
      '....OMMMNNNNNNMMMO....',
      '...OMMMMNNNNNNMMMMO...',
      '...OMMMMMNNNNMMMMMO...',
      '..OMMMMMMMNNMMMMMMMO..',
      '..OMMMMMMMMMMMMMMMMO..',
      '...OMMMOMMMMMMOMMMO...',
      '....OM.AFIIIIFA.MO....',
      '.......AIFFFFIA.......',
      '......KAIGGGGIAK......',
      '.......AIIJJIIA.......',
      '......ACCCCCCCCA......',
      '.....ACPCCCCCCPCA.....',
      '.....AFFFFFFFFFFA.....',
      '.......AKKA.AKK.......',
      '.......AKKA.APPA......',
      '.......APPA..AGA......',
      '.......AAAA...........',
      '......AGGGG...........'
    ],
    // 9: A_SPIN_S2 — One-foot spin 270 deg (opposite profile)
    [
      '........OOOOOOO.......',
      '.......OMMNNNNMO......',
      '......OMMMKKKMMMMO....',
      '.....OMKKOIKKKMMNNMO..',
      '.....OMKKOOKKKKMMNNMO.',
      '.....OMKHKKKKKKKMMNNO.',
      '.....OMKKLLKKKKKMMMO..',
      '.....OMMOLLLLOOMMMO...',
      '.......AFIIIIFA.......',
      '.......AIIFFIIA.......',
      '......KAIJJJJIA.......',
      '.......AIGGGGIA.......',
      '......ACCCCCCCCA......',
      '......ACPCCCCPCA......',
      '......AFFFFFFFFA......',
      '.......KKKAAKKA.......',
      '.....APKKA.AKKA.......',
      '.....AGAA..APPA.......',
      '...........AAAA.......',
      '...........AAAA.......',
      '..........AGGGG.......'
    ],
    // 10: A_SPIN_LAND — Killing part wink landing pose
    [
      '.......OOOOOOOO.......',
      '......OMMNNNNMMO......',
      '.....OMMMKKKKMMMO.....',
      '....OMMKKMKKMKKMMO....',
      '....OMKKIOKKKKKKMO....',
      '....OMKKOOKKOOKKMO....',
      '....OMKHKKKKKKHKMO....',
      '....OMMKKKLLKKKMMO.KK.',
      '....OMMOLLLLLLOMMOKFFK',
      '...OMM.AFIIIIFA.MMAII.',
      '..OM..KAIIJJIIA...IIA.',
      '.KK....AIIFFIIA...AA..',
      '.......AIGGGGIA.......',
      '......ACCCCCCCCA......',
      '.....ACPCCCCCCPCA.....',
      '.....AFFFFFFFFFFA.....',
      '......AKKA..AKKA......',
      '.....AKKA....AKKA.....',
      '.....APPA....APPA.....',
      '.....AAAA....AAAA.....',
      '....AGGGG....GGGGA....'
    ]
  ];
}

function getXiliPoses_() {
  return [
    // 1: X_IDLE — Sleek jet-black hair with straight bangs, matching pink-trimmed stage outfit
    [
      '.......AAAAAAAA.......',
      '......ABBPPPPBBA......',
      '.....ABBBBBBBBBBA.....',
      '....ABBAAAAAAAABBA....',
      '....ABKKIAKKAIKKBA....',
      '....ABKKAAKKAAKKBA....',
      '....ABKHKKKKKKHKBA....',
      '....ABBKKKLLKKKBBA....',
      '....ABBALLLLLLABBA....',
      '...ABB.AGIIIIGA..BBA..',
      '..ABB.KAIIJJIIAK..BBA.',
      '..AB.K.AIIGGIIA.K..BA.',
      '....K..AIFFFFIA..K....',
      '......ACCCCCCCCA......',
      '.....ACPCCCCCCPCA.....',
      '.....AGGGGGGGGGGA.....',
      '......AKKA..AKKA......',
      '......AKKA..AKKA......',
      '......APPA..APPA......',
      '......AAAA..AAAA......',
      '.....AFFFF..FFFFA.....'
    ],
    // 2: X_WAVE_R — Mirrors AIJING's Wave L
    [
      '.......AAAAAAAA.......',
      '......ABBPPPPBBA......',
      '.....ABBBBBBBBBBA.....',
      '....ABBAAAAAAAABBA....',
      '....ABKKIAKKAIKKBA....',
      '....ABKKAAKKAAKKBA....',
      '....ABKHKKKKKKHKBA....',
      '....ABBKKKLLKKKBBA....',
      '....ABBALLLLLLABBA.KK.',
      '...ABB.AGIIIIGA..BKGGK',
      '..ABB.KAIIJJIIAK..KIIA',
      '..AB..KAIIGGIIA...IIA.',
      '.......AIFFFFIA...A...',
      '......ACCCCCCCCA......',
      '.....ACPCCCCCCPCA.....',
      '.....AGGGGGGGGGGA.....',
      '......AKKA..AKKA......',
      '.....AKKA....AKKA.....',
      '.....APPA....APPA.....',
      '.....AAAA....AAAA.....',
      '....AFFFF....FFFFA....'
    ],
    // 3: X_WAVE_L — Mirrors AIJING's Wave R
    [
      '.......AAAAAAAA.......',
      '......ABBPPPPBBA......',
      '.....ABBBBBBBBBBA.....',
      '....ABBAAAAAAAABBA....',
      '....ABKKIAKKAIKKBA....',
      '....ABKKAAKKAAKKBA....',
      '....ABKHKKKKKKHKBA....',
      '....ABBKKKLLKKKBBA....',
      '.KK.ABBALLLLLLABBA....',
      'KGGKBB.AGIIIIGA..BBA..',
      '.AIIK..AIIJJIIAK..BBA.',
      '..AII..AIIGGIIAK...BA.',
      '...A...AIFFFFIA.......',
      '......ACCCCCCCCA......',
      '.....ACPCCCCCCPCA.....',
      '.....AGGGGGGGGGGA.....',
      '......AKKA..AKKA......',
      '.....AKKA....AKKA.....',
      '.....APPA....APPA.....',
      '.....AAAA....AAAA.....',
      '....AFFFF....FFFFA....'
    ],
    // 4: X_WHIP_L — Black hair whip snapping right
    [
      '......AAAAAAAA........',
      '.....ABBPPPPBBAA......',
      '....ABBBBBBBBBPPBA....',
      '...ABBAAAAAAAABBPPBA..',
      '...ABKKIAKKAIKBBPPBA..',
      '...ABKKAAKKAAKBBBPBA..',
      '...ABKHKKKKKKHKBBBA...',
      '...ABBKKKLLKKKBBA.....',
      '....ABBALLLLLLABBA....',
      '.....B.AGIIIIGA..BBA..',
      '....K..AIIJJIIA..KK...',
      '...K...AIIGGIIA...K...',
      '..K....AIFFFFIA....K..',
      '......ACCCCCCCCA......',
      '.....ACPCCCCCCPCA.....',
      '.....AGGGGGGGGGGA.....',
      '......AKKA..AKKA......',
      '.....AKKA....AKKA.....',
      '.....APPA....APPA.....',
      '.....AAAA....AAAA.....',
      '....AFFFF....FFFFA....'
    ],
    // 5: X_WHIP_R — Black hair whip snapping left
    [
      '........AAAAAAAA......',
      '......AABBPPPPBBA.....',
      '....ABPPBBBBBBBBBA....',
      '..ABPPBBAAAAAAAABBA...',
      '..ABPPBBKKIAKKAIKKBA..',
      '..ABPBBBKKAAKKAAKKBA..',
      '...ABBBKHKKKKKKHKBA...',
      '.....ABBKKKLLKKKBBA...',
      '....ABBALLLLLLABBA....',
      '..ABB..AGIIIIGA..B....',
      '...KK..AIIJJIIA..K....',
      '..K....AIIGGIIA...K...',
      '.K.....AIFFFFIA....K..',
      '......ACCCCCCCCA......',
      '.....ACPCCCCCCPCA.....',
      '.....AGGGGGGGGGGA.....',
      '......AKKA..AKKA......',
      '.....AKKA....AKKA.....',
      '.....APPA....APPA.....',
      '.....AAAA....AAAA.....',
      '....AFFFF....FFFFA....'
    ],
    // 6: X_SUPPORT — Sharp low cyber frame-up pose during AIJING's spin
    [
      '......................',
      '.......AAAAAAAA.......',
      '......ABBPPPPBBA......',
      '.....ABBBBBBBBBBA.....',
      '....ABBAAAAAAAABBA....',
      '....ABKKIAKKAIKKBA....',
      '....ABKKAAKKAAKKBA....',
      '....ABKHKKKKKKHKBA....',
      '....ABBKKKLLKKKBBA....',
      '.KK..B.AGIIIIGA..BBA..',
      'KGGK..KAIIJJIIA..KBB..',
      '.AIIA..AIIGGIIA...K...',
      '..AA...AIFFFFIA....K..',
      '......ACCCCCCCCA......',
      '.....ACPCCCCCCPCA.....',
      '.....AGGGGGGGGGGA.....',
      '.....AKKA....AKKA.....',
      '....AKKA......AKKA....',
      '....APPA......APPA....',
      '....AAAA......AAAA....',
      '...AFFFF......FFFFA...'
    ]
  ];
}

function getNeonSignRows_() {
  return [
    '.BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB.',
    '.B.PP...PP..CCCCCCC...PPPPP...CC...CC.',
    '.B.PWP..PP..CCJJJJJ..PPWWWPP..CWC..CC.',
    '.B.PWWP.PP..CC.......PW...WP..CWWC.CC.',
    '.B.PPWPWPP..CCJJJ....PW...WP..CCWCWCC.',
    '.B.PP.PWWP..CC.......PW...WP..CC.CWWC.',
    '.B.PP..PWP..CCJJJJJ..PPWWWPP..CC..CWC.',
    '.B.PP...PP..CCCCCCC...PPPPP...CC...CC.',
    '.BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB.'
  ];
}

function getCaptionRows_(mode) {
  if (mode === 1) {
    // "NEON AND BEYOND" (59px centered on 64px)
    return [
      '..C..C.CCC.CCC.C..C....W..W..W.WW....WW..WWW.W.W.WWW.W..W.WW....',
      '..CC.C.C...C.C.CC.C...W.W.WW.W.W.W...W.W.W...W.W.W.W.WW.W.W.W...',
      '..C.CC.CC..C.C.C.CC...WWW.W.WW.W.W...WW..WW...W..W.W.W.WW.W.W...',
      '..C..C.C...C.C.C..C...W.W.W..W.W.W...W.W.W....W..W.W.W..W.W.W...',
      '..C..C.CCC.CCC.C..C...W.W.W..W.WW....WW..WWW..W..WWW.W..W.WW....'
    ];
  }
  // "MIHON N BIHON?!" (58px centered on 64px)
  return [
    '...H...H.HHH.H.H.HHH.H..H...W..W...WW..WWW.W.W.WWW.W..W.PP..P...',
    '...HH.HH..H..H.H.H.H.HH.H...WW.W...W.W..W..W.W.W.W.WW.W...P.P...',
    '...H.H.H..H..HHH.H.H.H.HH...W.WW...WW...W..WWW.W.W.W.WW..P..P...',
    '...H...H..H..H.H.H.H.H..H...W..W...W.W..W..W.W.W.W.W..W.........',
    '...H...H.HHH.H.H.HHH.H..H...W..W...WW..WWW.W.W.WWW.W..W..P..P...'
  ];
}

function getTimeline_() {
  // 45 frames (~15s loop @ 3 FPS):
  // [aPose, xPose, aDy, xDy, neonState (0=off,1=half,2=lit), capMode (1/2), capFlash]
  return [
    // Intro stance + NEON flicker (frames 0..5)
    [1, 1, 0, 0, 2, 1, 1],
    [1, 1, 1, 1, 2, 1, 0],
    [1, 1, 0, 0, 0, 1, 0],
    [1, 1, 1, 1, 1, 1, 0],
    [1, 1, 0, 0, 2, 1, 0],
    [1, 1, 1, 1, 2, 1, 0],
    // Synchronized mirrored arm moves + hair whips (frames 6..17)
    [2, 2, 0, 0, 2, 1, 0],
    [2, 2, 1, 1, 2, 1, 0],
    [4, 4, 0, 0, 2, 1, 0],
    [4, 4, 1, 1, 2, 1, 0],
    [1, 1, 0, 0, 2, 1, 0],
    [3, 3, 0, 0, 2, 1, 0],
    [3, 3, 1, 1, 2, 1, 0],
    [5, 5, 0, 0, 1, 1, 0],
    [5, 5, 1, 1, 2, 1, 0],
    [3, 3, 0, 0, 0, 1, 0],
    [2, 2, 0, 0, 2, 1, 0],
    [1, 1, 1, 1, 2, 1, 0],
    // Killing part: AIJING's one-foot spin + caption flips to "MIHON N BIHON?!" (frames 18..29)
    [6, 6, 0, 0, 2, 1, 0],
    [6, 6, 1, 1, 2, 1, 0],
    [7, 6, 0, 0, 2, 1, 0],
    [8, 6, 0, 0, 2, 1, 0],
    [9, 6, 0, 1, 1, 2, 1],
    [1, 6, 0, 0, 2, 2, 0],
    [7, 4, 0, 0, 2, 2, 0],
    [8, 4, 0, 1, 2, 2, 0],
    [9, 5, 0, 0, 2, 2, 0],
    [10, 6, 0, 0, 2, 2, 0],
    [10, 6, 1, 1, 2, 2, 0],
    [10, 1, 0, 0, 0, 2, 0],
    // Synced duo outro + mirrored hair whips (frames 30..44)
    [2, 2, 0, 0, 1, 2, 0],
    [2, 2, 1, 1, 2, 2, 0],
    [3, 3, 0, 0, 2, 2, 0],
    [4, 4, 0, 0, 2, 2, 0],
    [4, 4, 1, 1, 2, 2, 0],
    [5, 5, 0, 0, 2, 2, 0],
    [5, 5, 1, 1, 2, 2, 0],
    [2, 2, 0, 0, 2, 2, 0],
    [3, 3, 0, 0, 2, 2, 0],
    [4, 5, 0, 0, 0, 2, 0],
    [5, 4, 0, 0, 2, 2, 0],
    [10, 2, 0, 0, 2, 2, 0],
    [1, 1, 0, 0, 2, 2, 0],
    [1, 1, 1, 1, 1, 2, 0],
    [1, 1, 0, 0, 2, 2, 0]
  ];
}
