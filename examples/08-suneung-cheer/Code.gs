/** @OnlyCurrentDoc */

/**
 * ============================================================================
 *  2026 SUNEUNG (COLLEGE ENTRANCE EXAM - NOV 19, 2026) CHEER PIXEL ART
 * ============================================================================
 *
 *  HOW TO RUN IN GOOGLE SHEETS:
 *  1. Open a Google Sheet (new or existing).
 *  2. Go to Extensions > Apps Script.
 *  3. Delete any starter code in Code.gs and paste this entire file.
 *  4. Click Save (Ctrl/Cmd + S).
 *  5. Run `setup` once from the Apps Script toolbar (grant permissions when
 *     prompted), OR reload the Google Sheet and use the custom menu:
 *       Suneung Cheer > 1. Setup Scene
 *  6. Run `Suneung Cheer > 2. Play Animation (~60s)` to animate, and
 *     `Suneung Cheer > 3. Stop Animation` to stop early.
 *  7. You can also type any frame number (0..29) directly into cell B1 on
 *     the "Scene" tab: every pixel re-renders purely via its own cell formula!
 *
 *  PERFORMANCE & FRAME RATE:
 *  - Grid size: 56 columns x 32 rows = 1,792 pixel cells (14x14 px squares).
 *  - Palette: 16 conditional formatting colors (background + font matched).
 *  - Expected frame rate: ~2 FPS (~500 ms per frame in standard Google Sheets).
 *  - Loop duration: 30 frames = ~15 seconds per full loop (D-5 -> D-DAY).
 *  - play() runs for ~60 seconds (~4 full loops).
 * ============================================================================
 */

var GRID_W = 56;
var GRID_H = 32;
var LOOP_FRAMES = 30;      // 30 frames @ ~2 FPS = ~15 seconds per full loop
var TARGET_FRAME_MS = 500; // ~2 FPS pacing
var PLAY_DURATION_MS = 60000;
var PIXEL_PX = 14;
var SCENE_SHEET_NAME = 'Scene';
var SPRITES_SHEET_NAME = 'Sprites';
var STOP_PROP_KEY = 'SUNEUNG_STOP_ANIM';

// 16-color palette (codes 0..15)
var PALETTE = [
  '#B0D6F2', // 0: Cold winter morning sky blue
  '#FCE0C0', // 1: Warm dawn horizon peach
  '#FFFFFF', // 2: Crisp white (breath, clouds, board, chapssaltteok, banner)
  '#222736', // 3: Deep charcoal ink (outlines, hair, eyes, dark text, gate)
  '#FFD5B8', // 4: Warm skin tone
  '#FF8FA3', // 5: Rosy cold cheeks & pink confetti
  '#3A7CA5', // 6: Padded winter jacket main blue
  '#26547C', // 7: Padded jacket seam/shadow & backpack
  '#F4A261', // 8: Warm orange (scarf, yeot, autumn leaves, sun rim)
  '#E63946', // 9: Cheer crimson red (FIGHTING!, D-DAY, banner, confetti)
  '#FFD166', // 10: Warm gold (rising sun, stars, gold confetti, D-DAY frame)
  '#8D5B4C', // 11: Warm brick brown (school gate pillars, poles, leaves)
  '#CE865C', // 12: Light brick & warm sidewalk tan
  '#6D7B8D', // 13: Cool stone gray (curb, gate caps, campus wall)
  '#4EA8DE', // 14: Sky blue (junior winter coat, confetti)
  '#70C1B3'  // 15: Mint green (junior winter coat, hedge, confetti)
];

var CHAR_MAP = {
  '.': -1,
  '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, 'A': 10, 'B': 11, 'C': 12, 'D': 13, 'E': 14, 'F': 15
};

function parseSprite_(lines) {
  return lines.map(function (row) {
    var out = [];
    for (var i = 0; i < row.length; i++) {
      out.push(CHAR_MAP[row.charAt(i)]);
    }
    return out;
  });
}

// 11x11 original student character in quilted winter padded jacket & scarf
var STUDENT_SPRITES = [
  // Walk frame 1
  parseSprite_([
    '...33333...',
    '..3333333..',
    '..3443434..',
    '..3454444..',
    '...888889..',
    '.73666663..',
    '.73777773..',
    '.736666634.',
    '...33.33...',
    '..33...33..',
    '..22...22..'
  ]),
  // Walk frame 2
  parseSprite_([
    '...33333...',
    '..3333333..',
    '..3443434..',
    '..3454444..',
    '...888889..',
    '.73666663..',
    '.73777773..',
    '..3666663..',
    '...33333...',
    '...33.33...',
    '...22.22...'
  ]),
  // D-DAY fist pump high
  parseSprite_([
    '........343',
    '...33333363',
    '..33333336.',
    '..34344346.',
    '..3454445..',
    '...888889..',
    '.73666663..',
    '.73777773..',
    '..3666663..',
    '...33.33...',
    '...22.22...'
  ]),
  // D-DAY fist pump mid
  parseSprite_([
    '...........',
    '...33333.34',
    '..333333363',
    '..34344346.',
    '..3454445..',
    '...888889..',
    '.73666663..',
    '.73777773..',
    '..3666663..',
    '..33...33..',
    '..22...22..'
  ])
];

// Cheering juniors (7x8 for Juniors 1 & 2, 6x8 padded to 7x8 for Junior 3)
var JUNIOR_SPRITES = [
  // Junior 1 frame A (mint coat)
  parseSprite_([
    '.3333..',
    '343434.',
    '354445.',
    '.9999..',
    '4F3FF34',
    '.FFFF..',
    '.33.33.',
    '.22.22.'
  ]),
  // Junior 1 frame B
  parseSprite_([
    '.......',
    '.3333..',
    '343434.',
    '354445.',
    '499994.',
    '.FFFF..',
    '.33.33.',
    '.22.22.'
  ]),
  // Junior 2 frame A (sky blue coat)
  parseSprite_([
    '..3333.',
    '.343434',
    '.354445',
    '..AAAA.',
    '4E3EE34',
    '..EEEE.',
    '..33.33',
    '..22.22'
  ]),
  // Junior 2 frame B
  parseSprite_([
    '.......',
    '..3333.',
    '.343434',
    '.354445',
    '.4AAAA4',
    '..EEEE.',
    '..33.33',
    '..22.22'
  ]),
  // Junior 3 frame A (coral red coat, 6px wide padded to 7)
  parseSprite_([
    '.3333..',
    '343434.',
    '354445.',
    '.AAAA..',
    '499994.',
    '.9999..',
    '.3333..',
    '.2222..'
  ]),
  // Junior 3 frame B
  parseSprite_([
    '.......',
    '.3333..',
    '343434.',
    '354445.',
    '4AAAA4.',
    '.9999..',
    '.3333..',
    '.2222..'
  ])
];

// Lucky Yeot (4x5) & Chapssaltteok (4x4)
var YEOT_SPRITE = parseSprite_([
  '.33.',
  '38A3',
  '3293',
  '38C3',
  '.33.'
]);

var TTEOK_SPRITE = parseSprite_([
  '.33.',
  '3223',
  '3293',
  '.33.'
]);

var PIXEL_FONT = {
  'D': ['110', '101', '101', '101', '110'],
  '-': ['000', '000', '111', '000', '000'],
  '5': ['111', '100', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '3': ['111', '001', '111', '001', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '1': ['010', '110', '010', '010', '111'],
  'A': ['010', '101', '111', '101', '101'],
  'Y': ['101', '101', '010', '010', '010'],
  'F': ['111', '100', '110', '100', '100'],
  'I': ['111', '010', '010', '010', '111'],
  'G': ['111', '100', '101', '101', '111'],
  'H': ['101', '101', '111', '101', '101'],
  'T': ['111', '010', '010', '010', '010'],
  'N': ['1001', '1101', '1011', '1001', '1001'],
  '!': ['1', '1', '1', '0', '1']
};

function renderBitmapText_(text, fg, bg) {
  var rows = [[], [], [], [], []];
  for (var i = 0; i < text.length; i++) {
    if (i > 0) {
      for (var r = 0; r < 5; r++) rows[r].push(bg);
    }
    var glyph = PIXEL_FONT[text.charAt(i)];
    for (var r2 = 0; r2 < 5; r2++) {
      var line = glyph[r2];
      for (var c = 0; c < line.length; c++) {
        rows[r2].push(line.charAt(c) === '1' ? fg : bg);
      }
    }
  }
  return rows;
}

/**
 * Adds custom menu when the spreadsheet opens.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Suneung Cheer')
    .addItem('1. Setup Scene', 'setup')
    .addItem('2. Play Animation (~60s)', 'play')
    .addItem('3. Stop Animation', 'stop')
    .addSeparator()
    .addItem('Step +1 Frame', 'stepFrame')
    .addItem('Reset to Frame 0', 'resetFrame')
    .addToUi();
}

/**
 * Populates the hidden Sprites sheet with static bitmap tables used by
 * INDEX() inside the pixel formulas on the Scene sheet.
 *
 * Layout in Sprites sheet:
 * - A1:K44  : 4 Student sprites (11 cols x 11 rows each)
 * - M1:S48  : 6 Junior sprites (7 cols x 8 rows each)
 * - A46:D50 : Yeot (4x5)
 * - F46:I49 : Chapssaltteok (4x4)
 * - U1:AK30 : 6 Countdown stages D-5..D-DAY (17 cols x 5 rows each)
 * - U32:BA36: "FIGHTING!" 1/0 mask (33 cols x 5 rows)
 */
function populateSpritesSheet_(sheet) {
  sheet.clear();
  var grid = [];
  for (var r = 0; r < 52; r++) {
    var row = [];
    for (var c = 0; c < 54; c++) row.push('');
    grid.push(row);
  }

  function writeBlock(top0, left0, mat) {
    for (var dr = 0; dr < mat.length; dr++) {
      for (var dc = 0; dc < mat[dr].length; dc++) {
        grid[top0 + dr][left0 + dc] = mat[dr][dc];
      }
    }
  }

  // Student sprites -> A1:K44 (0-indexed cols 0..10)
  for (var s = 0; s < STUDENT_SPRITES.length; s++) {
    writeBlock(s * 11, 0, STUDENT_SPRITES[s]);
  }

  // Junior sprites -> M1:S48 (0-indexed cols 12..18)
  for (var j = 0; j < JUNIOR_SPRITES.length; j++) {
    writeBlock(j * 8, 12, JUNIOR_SPRITES[j]);
  }

  // Yeot -> A46:D50 (0-indexed row 45, col 0) & Chapssaltteok -> F46:I49 (row 45, col 5)
  writeBlock(45, 0, YEOT_SPRITE);
  writeBlock(45, 5, TTEOK_SPRITE);

  // Countdown labels -> U1:AK30 (0-indexed col 20..36, 17 wide x 5 rows x 6 stages)
  var stages = [
    { text: 'D-5', fg: 3 },
    { text: 'D-4', fg: 3 },
    { text: 'D-3', fg: 3 },
    { text: 'D-2', fg: 3 },
    { text: 'D-1', fg: 8 },
    { text: 'D-DAY', fg: 9 }
  ];
  for (var st = 0; st < stages.length; st++) {
    var bmp = renderBitmapText_(stages[st].text, stages[st].fg, 2);
    var padLeft = Math.floor((17 - bmp[0].length) / 2);
    for (var br = 0; br < 5; br++) {
      for (var bc = 0; bc < 17; bc++) {
        var idx = bc - padLeft;
        grid[st * 5 + br][20 + bc] = (idx >= 0 && idx < bmp[0].length) ? bmp[br][idx] : 2;
      }
    }
  }

  // FIGHTING! mask -> U32:BA36 (0-indexed row 31..35, col 20..52 -> 33 cols)
  var fightBmp = renderBitmapText_('FIGHTING!', 1, 0);
  writeBlock(31, 20, fightBmp);

  sheet.getRange(1, 1, 52, 54).setValues(grid);
  sheet.hideSheet();
}

/**
 * Builds the static cold-morning background matrix (56 x 32):
 * cold blue sky, peach dawn horizon, rising morning sun, campus wall,
 * brick school gate, and warm stone sidewalk.
 */
function buildStaticBackground_() {
  var g = [];
  for (var r = 0; r < GRID_H; r++) {
    var row = [];
    for (var c = 0; c < GRID_W; c++) {
      if (r <= 20) {
        row.push(0);
      } else if (r === 21) {
        row.push((r + c) % 2 === 0 ? 1 : 0);
      } else if (r <= 27) {
        row.push(1);
      } else if (r === 28) {
        row.push(13);
      } else {
        row.push((r + c) % 3 !== 0 ? 12 : 11);
      }
    }
    g.push(row);
  }

  // Rising warm morning sun above campus wall (c=29..36, r=21..26)
  for (var sr = 21; sr <= 26; sr++) {
    for (var sc = 29; sc <= 36; sc++) {
      var d2 = (sr - 26) * (sr - 26) + (sc - 32.5) * (sc - 32.5);
      if (d2 <= 14.5 && d2 > 10.5) {
        g[sr][sc] = 8; // warm orange outer glow rim
      } else if (d2 <= 10.5) {
        g[sr][sc] = 10; // golden sun core
      }
    }
  }

  // Low stone campus wall & winter hedge (c=0..43, r=26..27)
  for (var wc = 0; wc <= 43; wc++) {
    g[26][wc] = (wc % 2 === 0) ? 13 : 15;
    g[27][wc] = 13;
  }

  // School Gate (c=44..54, r=13..27)
  for (var gr = 13; gr <= 15; gr++) {
    for (var gc = 44; gc <= 54; gc++) {
      g[gr][gc] = 3;
    }
  }
  for (var hc = 45; hc <= 53; hc++) g[14][hc] = 2;
  g[14][46] = 9; g[14][47] = 10; g[14][48] = 9;
  g[14][50] = 3; g[14][51] = 3;  g[14][52] = 9;

  for (var pr = 16; pr <= 27; pr++) {
    for (var lc = 44; lc <= 47; lc++) {
      g[pr][lc] = ((pr + lc) % 2 === 0 && pr % 2 === 1) ? 12 : 11;
    }
    for (var rc = 51; rc <= 54; rc++) {
      g[pr][rc] = ((pr + rc) % 2 === 0 && pr % 2 === 1) ? 12 : 11;
    }
  }
  for (var cap = 44; cap <= 47; cap++) g[16][cap] = 13;
  for (var cap2 = 51; cap2 <= 54; cap2++) g[16][cap2] = 13;

  // Open iron gate bars in center (c=48..50)
  for (var br = 18; br <= 27; br++) {
    if (br === 19 || br === 25) {
      for (var bc = 48; bc <= 50; bc++) g[br][bc] = 3;
    } else {
      g[br][48] = 3;
      g[br][50] = 3;
    }
  }

  return g;
}

/**
 * Generates the 32x56 matrix of Google Sheets formulas.
 * Every cell directly references `$B$1` via `LET(f,MOD($B$1,30),...)` and
 * evaluates only the dynamic layers whose paths can actually reach that cell,
 * keeping Google Sheets recalculation fast (~2 FPS).
 */
function buildSceneFormulas_() {
  var bg = buildStaticBackground_();

  // Precompute reachability sets for trajectory-driven objects so cells that
  // can never be touched don't pay extra formula work.
  var leafSpecs = [
    { off: 0, baseC: 27, col: 8 },
    { off: 6, baseC: 35, col: 10 },
    { off: 11, baseC: 46, col: 9 },
    { off: 3, baseC: 19, col: 11 }
  ];
  var leafTouch = {};
  for (var li = 0; li < leafSpecs.length; li++) {
    var lf = leafSpecs[li];
    for (var f = 0; f < LOOP_FRAMES; f++) {
      var lr = (lf.off + f) % 27;
      var lc = lf.baseC + Math.round(1.5 * Math.sin((f + lf.off) * 0.6));
      if (lr >= 0 && lr < 27 && lc >= 0 && lc < GRID_W && !(lr <= 8 && lc >= 2 && lc <= 22)) {
        leafTouch[lr + ',' + lc + ',' + li] = true;
      }
    }
  }

  var confColors = [9, 10, 14, 15, 5];
  var confTouch = {};
  for (var ci = 0; ci < 12; ci++) {
    for (var cf = 21; cf < LOOP_FRAMES; cf++) {
      var cr = (ci * 2 + (cf - 21) * 2) % 21 + 1;
      var cc = (ci * 4 + 3 + ((cf % 3) - 1)) % (GRID_W - 2) + 1;
      if (!(cr <= 8 && cc >= 2 && cc <= 22)) {
        confTouch[cr + ',' + cc + ',' + ci] = true;
      }
    }
  }

  var yeotTouch = {};
  var tteokTouch = {};
  for (var df = 20; df < LOOP_FRAMES; df++) {
    var yc, yr, tc, tr;
    if (df <= 23) {
      var t = (df - 20) / 3.0;
      yc = Math.round(12 + t * 32);
      yr = Math.round(19 - 7 * Math.sin(t * Math.PI));
      tc = Math.round(7 + t * 37);
      tr = Math.round(21 - 4 * Math.sin(t * Math.PI));
    } else {
      yc = 44; yr = 17;
      tc = 44; tr = 22;
    }
    for (var dr = 0; dr < 5; dr++) {
      for (var dc = 0; dc < 4; dc++) {
        yeotTouch[(yr + dr) + ',' + (yc + dc)] = true;
      }
    }
    for (var tr0 = 0; tr0 < 4; tr0++) {
      for (var tc0 = 0; tc0 < 4; tc0++) {
        tteokTouch[(tr + tr0) + ',' + (tc + tc0)] = true;
      }
    }
  }

  var cloudCells = [
    [2,28],[2,29],[2,30],[3,27],[3,28],[3,29],[3,30],[3,31],
    [4,43],[4,44],[4,45],[5,42],[5,43],[5,44],[5,45],[5,46]
  ];
  var cloudTouch = {};
  for (var cl = 0; cl < cloudCells.length; cl++) {
    for (var sh = 0; sh < 10; sh++) {
      var cc2 = (cloudCells[cl][1] + sh) % GRID_W;
      if (cc2 >= 25) {
        cloudTouch[cloudCells[cl][0] + ',' + cc2] = cloudCells[cl][1];
      }
    }
  }

  var sparkleMap = {
    '16,43': true, '16,48': true, '22,43': true, '25,48': true
  };

  var formulas = [];
  for (var r = 0; r < GRID_H; r++) {
    var fRow = [];
    for (var c = 0; c < GRID_W; c++) {
      var key = r + ',' + c;
      var expr = String(bg[r][c]);

      // Layer 1 (backmost dynamic): Drifting morning clouds
      if (cloudTouch[key] !== undefined) {
        var origC = cloudTouch[key];
        expr = 'IF(MOD(' + origC + '+INT(f/3),' + GRID_W + ')=' + c + ',2,' + expr + ')';
      }

      // Layer 2: Falling autumn leaves
      for (var li2 = 0; li2 < leafSpecs.length; li2++) {
        if (leafTouch[key + ',' + li2]) {
          var lSpec = leafSpecs[li2];
          var condL = 'AND(MOD(' + lSpec.off + '+f,27)=' + r +
                      ',' + lSpec.baseC + '+ROUND(1.5*SIN((f+' + lSpec.off + ')*0.6),0)=' + c + ')';
          expr = 'IF(' + condL + ',' + lSpec.col + ',' + expr + ')';
        }
      }

      // Layer 3: Waving cheer banner (r=15..23, c=1..10) & gate mini-flag (r=17..22, c=39..42)
      if (c >= 1 && c <= 10 && r >= 15 && r <= 23) {
        var bExpr = expr;
        if (c === 1 || c === 10) {
          if (r === 15) bExpr = 'IF(MOD(f,2)=0,9,' + expr + ')';
          else if (r >= 16 && r <= 18) bExpr = '9';
          else if (r === 19) bExpr = 'IF(MOD(f,2)=0,11,9)';
          else if (r >= 20 && r <= 22) bExpr = '11';
          else if (r === 23) bExpr = 'IF(MOD(f,2)=0,' + expr + ',11)';
        } else {
          var stripeCol = (c === 3 || c === 8) ? '10' : ((c === 5 || c === 6) ? '9' : '2');
          if (r === 15) bExpr = 'IF(MOD(f,2)=0,9,' + expr + ')';
          else if (r === 16) bExpr = 'IF(MOD(f,2)=0,' + stripeCol + ',9)';
          else if (r === 17) bExpr = stripeCol;
          else if (r === 18) bExpr = 'IF(MOD(f,2)=0,9,' + stripeCol + ')';
          else if (r === 19) bExpr = 'IF(MOD(f,2)=0,' + expr + ',9)';
        }
        expr = bExpr;
      }
      if (c >= 39 && c <= 42 && r >= 17 && r <= 22) {
        if (c === 42) {
          if (r === 17) expr = 'IF(MOD(f,2)=0,11,' + expr + ')';
          else if (r >= 18 && r <= 21) expr = '11';
          else if (r === 22) expr = 'IF(MOD(f,2)=0,' + expr + ',11)';
        } else {
          var fBot = (c === 41) ? '9' : '10';
          if (r === 17) expr = 'IF(MOD(f,2)=0,9,' + expr + ')';
          else if (r === 18) expr = 'IF(MOD(f,2)=0,' + fBot + ',9)';
          else if (r === 19) expr = 'IF(MOD(f,2)=0,' + expr + ',' + fBot + ')';
        }
      }

      // Layer 4: Cheering Juniors (r=20..27)
      if (r >= 20 && r <= 27) {
        var jrRow = r - 20 + 1;
        if (c >= 1 && c <= 7) {
          var j1c = c - 1 + 1;
          expr = 'LET(v,INDEX(' + SPRITES_SHEET_NAME + '!$M$1:$S$16,MOD(f,2)*8+' + jrRow + ',' + j1c + '),IF(v>=0,v,' + expr + '))';
        }
        if (c >= 7 && c <= 13) {
          var j2c = c - 7 + 1;
          expr = 'LET(v,INDEX(' + SPRITES_SHEET_NAME + '!$M$17:$S$32,(1-MOD(f,2))*8+' + jrRow + ',' + j2c + '),IF(v>=0,v,' + expr + '))';
        }
        if (c >= 38 && c <= 43) {
          var j3c = c - 38 + 1;
          expr = 'LET(v,INDEX(' + SPRITES_SHEET_NAME + '!$M$33:$S$48,MOD(f,2)*8+' + jrRow + ',' + j3c + '),IF(v>=0,v,' + expr + '))';
        }
      }

      // Layer 5: Cute Student in padded jacket (r=17..27, c=14..36)
      if (r >= 17 && r <= 27 && c >= 14 && c <= 36) {
        var stRow = r - 17 + 1;
        var sxExpr = 'IF(f<20,14+INT(f*12/19),26)';
        var sOffExpr = 'IF(f<20,MOD(f,2)*11,22+MOD(f,2)*11)';
        expr = 'LET(sx,' + sxExpr + ',v,IF(AND(' + c + '>=sx,' + c + '<=sx+10),INDEX(' + SPRITES_SHEET_NAME +
               '!$A$1:$K$44,' + sOffExpr + '+' + stRow + ',MAX(1,MIN(11,' + c + '-sx+1))),-1),IF(v>=0,v,' + expr + '))';
      }

      // Layer 6: Cold breath puffs (r=18..19, c=22..38)
      if (r >= 18 && r <= 19 && c >= 22 && c <= 38) {
        var sxB = 'IF(f<20,14+INT(f*12/19),26)';
        var bpExpr = 'MOD(f,4)';
        var condB = 'AND(bp<3,OR(' +
                    'AND(' + r + '=by,OR(' + c + '=bx,' + c + '=bx+1)),' +
                    'AND(bp>=1,' + r + '=by-1,' + c + '=bx+1),' +
                    'AND(bp=2,' + r + '=by-1,' + c + '=bx+2)))';
        expr = 'LET(bp,' + bpExpr + ',bx,' + sxB + '+8+bp,by,19-INT(bp/2),IF(' + condB + ',2,' + expr + '))';
      }

      // Layer 7: Flying & Stuck Yeot and Chapssaltteok (f >= 20)
      if (tteokTouch[key]) {
        expr = 'LET(yt,MIN(1,(f-20)/3),tc,IF(f<=23,ROUND(7+yt*37,0),44),tr,IF(f<=23,ROUND(21-4*SIN(yt*PI()),0),22),' +
               'v,IF(AND(f>=20,' + r + '>=tr,' + r + '<=tr+3,' + c + '>=tc,' + c + '<=tc+3),' +
               'INDEX(' + SPRITES_SHEET_NAME + '!$F$46:$I$49,MAX(1,MIN(4,' + r + '-tr+1)),MAX(1,MIN(4,' + c + '-tc+1))),-1),' +
               'IF(v>=0,v,' + expr + '))';
      }
      if (yeotTouch[key]) {
        expr = 'LET(yt,MIN(1,(f-20)/3),yc,IF(f<=23,ROUND(12+yt*32,0),44),yr,IF(f<=23,ROUND(19-7*SIN(yt*PI()),0),17),' +
               'v,IF(AND(f>=20,' + r + '>=yr,' + r + '<=yr+4,' + c + '>=yc,' + c + '<=yc+3),' +
               'INDEX(' + SPRITES_SHEET_NAME + '!$A$46:$D$50,MAX(1,MIN(5,' + r + '-yr+1)),MAX(1,MIN(4,' + c + '-yc+1))),-1),' +
               'IF(v>=0,v,' + expr + '))';
      }

      // Impact gold sparkles when Yeot & Tteok stick onto gate (f=24..25)
      if (sparkleMap[key]) {
        expr = 'IF(OR(f=24,f=25),10,' + expr + ')';
      }

      // Layer 8: D-DAY Confetti (f >= 21)
      for (var ci2 = 0; ci2 < 12; ci2++) {
        if (confTouch[key + ',' + ci2]) {
          var cCol = confColors[ci2 % 5];
          var condC = 'AND(f>=21,MOD(' + (ci2 * 2) + '+(f-21)*2,21)+1=' + r +
                      ',MOD(' + (ci2 * 4 + 3) + '+(MOD(f,3)-1),' + (GRID_W - 2) + ')+1=' + c + ')';
          expr = 'IF(' + condC + ',' + cCol + ',' + expr + ')';
        }
      }

      // Layer 9: Countdown Board (r=0..8, c=2..22)
      if (r >= 0 && r <= 8 && c >= 2 && c <= 22) {
        if (r === 0 || r === 8 || c === 2 || c === 22) {
          var isCorner = (r === 0 || r === 8) && (c === 2 || c === 22);
          expr = isCorner ? 'IF(f>=20,9,10)' : 'IF(f>=20,10,3)';
        } else if (r >= 2 && r <= 6 && c >= 4 && c <= 20) {
          var cbRow = r - 2 + 1;
          var cbCol = c - 4 + 1;
          expr = 'INDEX(' + SPRITES_SHEET_NAME + '!$U$1:$AK$30,MIN(5,INT(f/4))*5+' + cbRow + ',' + cbCol + ')';
        } else {
          expr = '2';
        }
      }

      // Layer 10 (Topmost): D-DAY "FIGHTING!" (r=9..14, c=9..42)
      if (r >= 9 && r <= 14 && c >= 9 && c <= 42) {
        if (r >= 10 && r <= 14 && c >= 10 && c <= 42) {
          var shMask = 'INDEX(' + SPRITES_SHEET_NAME + '!$U$32:$BA$36,' + (r - 10 + 1) + ',' + (c - 10 + 1) + ')';
          expr = 'IF(AND(f>=22,' + shMask + '=1),3,' + expr + ')';
        }
        if (r >= 9 && r <= 13 && c >= 9 && c <= 41) {
          var fgMask = 'INDEX(' + SPRITES_SHEET_NAME + '!$U$32:$BA$36,' + (r - 9 + 1) + ',' + (c - 9 + 1) + ')';
          expr = 'IF(AND(f>=22,' + fgMask + '=1),IF(MOD(f,2)=0,9,2),' + expr + ')';
        }
      }

      // Guarantee every cell explicitly depends on $B$1 via LET(f, MOD($B$1, 30), ...)
      if (expr.indexOf('f') === -1) {
        expr = 'IF(f>=0,' + expr + ',0)';
      }
      fRow.push('=LET(f,MOD($B$1,' + LOOP_FRAMES + '),' + expr + ')');
    }
    formulas.push(fRow);
  }
  return formulas;
}

/**
 * Builds the pixel-art canvas, Sprites sheet, square pixel sizing,
 * pure-formula pixel grid, and 16 conditional formatting color rules.
 */
function setup() {
  PropertiesService.getDocumentProperties().deleteProperty(STOP_PROP_KEY);
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Prepare Sprites sheet
  var spritesSheet = ss.getSheetByName(SPRITES_SHEET_NAME);
  if (!spritesSheet) {
    spritesSheet = ss.insertSheet(SPRITES_SHEET_NAME);
  }
  populateSpritesSheet_(spritesSheet);

  // Prepare Scene sheet
  var sceneSheet = ss.getSheetByName(SCENE_SHEET_NAME);
  if (!sceneSheet) {
    var active = ss.getActiveSheet();
    if (active && active.getName() !== SPRITES_SHEET_NAME) {
      sceneSheet = active;
      sceneSheet.setName(SCENE_SHEET_NAME);
    } else {
      sceneSheet = ss.insertSheet(SCENE_SHEET_NAME, 0);
    }
  }
  sceneSheet.clear();
  sceneSheet.clearConditionalFormatRules();
  sceneSheet.setHiddenGridlines(true);

  // Ensure enough rows and columns exist
  if (sceneSheet.getMaxColumns() < GRID_W + 2) {
    sceneSheet.insertColumnsAfter(sceneSheet.getMaxColumns(), GRID_W + 2 - sceneSheet.getMaxColumns());
  }
  if (sceneSheet.getMaxRows() < GRID_H + 3) {
    sceneSheet.insertRowsAfter(sceneSheet.getMaxRows(), GRID_H + 3 - sceneSheet.getMaxRows());
  }

  // Size columns & rows so each pixel cell is a crisp 14x14 px square
  sceneSheet.setColumnWidth(1, 12);
  sceneSheet.setColumnWidths(2, GRID_W, PIXEL_PX);
  sceneSheet.setRowHeight(1, 26);
  sceneSheet.setRowHeight(2, 8);
  sceneSheet.setRowHeights(3, GRID_H, PIXEL_PX);

  // Header & Frame Counter ($B$1)
  var frameCell = sceneSheet.getRange('B1');
  frameCell.setValue(0)
    .setFontWeight('bold')
    .setFontSize(11)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setBackground('#FFF8DC')
    .setFontColor('#222736')
    .setBorder(true, true, true, true, false, false, '#222736', SpreadsheetApp.BorderStyle.SOLID);

  sceneSheet.getRange('C1:I1').merge()
    .setValue('← Frame (0–29)')
    .setFontSize(10)
    .setFontWeight('bold')
    .setVerticalAlignment('middle')
    .setFontColor('#222736');

  sceneSheet.getRange('J1:Q1').merge()
    .setFormula('=IF(MOD($B$1,' + LOOP_FRAMES + ')<20,"D-"&(5-INT(MOD($B$1,' + LOOP_FRAMES + ')/4)),"D-DAY!")')
    .setFontSize(11)
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setBackground('#FCE0C0')
    .setFontColor('#E63946');

  sceneSheet.getRange('R1:BE1').merge()
    .setValue('2026 수능 응원 (2026.11.19) · ~2 FPS · 15s Loop (30 frames)')
    .setFontSize(10)
    .setHorizontalAlignment('right')
    .setVerticalAlignment('middle')
    .setFontColor('#3A7CA5');

  // Write pixel formulas in one batch
  var canvasRange = sceneSheet.getRange(3, 2, GRID_H, GRID_W);
  canvasRange.setFormulas(buildSceneFormulas_());
  canvasRange.setFontSize(6)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  // Conditional Formatting rules mapping 0..15 -> background & identical font color
  var rules = [];
  for (var colorIdx = 0; colorIdx < PALETTE.length; colorIdx++) {
    var hex = PALETTE[colorIdx];
    rules.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenNumberEqualTo(colorIdx)
        .setBackground(hex)
        .setFontColor(hex)
        .setRanges([canvasRange])
        .build()
    );
  }
  sceneSheet.setConditionalFormatRules(rules);

  ss.setActiveSheet(sceneSheet);
  sceneSheet.setActiveSelection('B1');
  SpreadsheetApp.flush();
}

/**
 * Advances the frame counter in a loop for ~60 seconds (~4 full 15s loops).
 * Every pixel re-renders inside the sheet from its own formula referencing $B$1.
 */
function play() {
  var props = PropertiesService.getDocumentProperties();
  props.deleteProperty(STOP_PROP_KEY);

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sceneSheet = ss.getSheetByName(SCENE_SHEET_NAME);
  if (!sceneSheet) {
    setup();
    sceneSheet = ss.getSheetByName(SCENE_SHEET_NAME);
  }

  var frameCell = sceneSheet.getRange('B1');
  var frame = Number(frameCell.getValue()) || 0;
  var startTime = Date.now();

  ss.toast('Playing Suneung cheer animation (~2 FPS, ~60s)...', 'Suneung Cheer', 4);

  while (Date.now() - startTime < PLAY_DURATION_MS) {
    if (props.getProperty(STOP_PROP_KEY) === '1') {
      ss.toast('Animation stopped.', 'Suneung Cheer', 3);
      return;
    }

    var stepStart = Date.now();
    frame = (frame + 1) % LOOP_FRAMES;
    frameCell.setValue(frame);
    SpreadsheetApp.flush();

    var elapsed = Date.now() - stepStart;
    var waitMs = TARGET_FRAME_MS - elapsed;
    if (waitMs > 20) {
      Utilities.sleep(waitMs);
    }
  }

  ss.toast('Finished ~60s animation. Run Play again to continue!', 'Suneung Cheer', 4);
}

/**
 * Signals any active play() loop to stop cleanly.
 */
function stop() {
  PropertiesService.getDocumentProperties().setProperty(STOP_PROP_KEY, '1');
  SpreadsheetApp.getActiveSpreadsheet().toast('Stopping animation...', 'Suneung Cheer', 3);
}

/**
 * Advances the scene by one single frame (useful for inspecting individual frames).
 */
function stepFrame() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sceneSheet = ss.getSheetByName(SCENE_SHEET_NAME);
  if (!sceneSheet) {
    setup();
    return;
  }
  var frameCell = sceneSheet.getRange('B1');
  var frame = Number(frameCell.getValue()) || 0;
  frameCell.setValue((frame + 1) % LOOP_FRAMES);
  SpreadsheetApp.flush();
}

/**
 * Resets the frame counter to 0 (start of D-5).
 */
function resetFrame() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sceneSheet = ss.getSheetByName(SCENE_SHEET_NAME);
  if (!sceneSheet) {
    setup();
    return;
  }
  sceneSheet.getRange('B1').setValue(0);
  SpreadsheetApp.flush();
}
