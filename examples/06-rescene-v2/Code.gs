/** @OnlyCurrentDoc */

/**
 * RESCENE — "PULSE" (Nov 2026 Dreamy Guardian Concept) Animated Pixel Art
 *
 * HOW TO INSTALL & RUN IN GOOGLE SHEETS:
 * 1. Open a Google Sheet (blank recommended) and go to Extensions > Apps Script.
 * 2. Delete any starter code in Code.gs and paste this entire file.
 * 3. Save (Ctrl/Cmd + S) and reload the Google Sheet tab.
 * 4. Use the new "RESCENE PULSE" menu at the top:
 *    - Click "Setup Scene" first (grant permission on first run).
 *      This resizes the grid into 10x10px square cells, populates the sprite
 *      table, writes a pure spreadsheet formula into every pixel cell, and
 *      applies Conditional Formatting colors.
 *    - Click "Play (~60s)" to animate (~1.6 fps, ~15s per 24-frame loop, ~4 loops).
 *    - Click "Stop" anytime to pause, or edit cell B1 manually (0..23) to
 *      inspect any individual frame directly inside the spreadsheet.
 *
 * EXPECTED PERFORMANCE:
 * - Grid: 94 cols x 38 rows = 3,572 formula cells, 19-color palette (18 CF rules).
 * - Expected frame rate: ~1.5 - 2.0 fps in a normal Google Sheet (~15s per 24-frame loop).
 */

var SHEET_NAME = 'RESCENE PULSE';
var SPRITE_SHEET_NAME = 'Sprites';
var GRID_COLS = 94;
var GRID_ROWS = 38;
var TOTAL_FRAMES = 24; // 6 beats x 4 frames: WONI, LIV, MINAMI, MAY, ZENA, FINALE
var PIXEL_SIZE_PX = 10;
var STOP_PROP_KEY = 'RESCENE_PULSE_STOP';

// 19-color palette: '0' is default cell background (no CF rule needed -> 18 CF rules)
var PALETTE = {
  '0': '#281F47', // Dreamy twilight periwinkle sky (default background)
  '1': '#382C62', // Sky soft spotlight halo
  '2': '#4F3F88', // Sky bright spotlight beam
  '3': '#151122', // Deep black hair, eyes, outlines
  '4': '#2E2344', // Dark hair sheen
  '5': '#FFE2CE', // Fair skin tone
  '6': '#F7B2A3', // Rosy cheeks / squirrel cheek shading
  '7': '#FFFFFF', // Pure white coquette dress, teeth, bubble, title
  '8': '#E5DFF5', // Dress lavender-white lace shading
  '9': '#FFB3D9', // Pastel coquette ribbon pink
  'a': '#FF5295', // Rose pink hearts, smiles, YAHO! text
  'b': '#E7C2EA', // Pastel lilac stage floor
  'c': '#F9DDFB', // Lit pastel stage floor (spotlight)
  'd': '#8E63A8', // Stage front apron & mic handle
  'e': '#3B2454', // Name tag dark plum plaque
  'f': '#FFE259', // Gold yellow (sparkles, sunflower-seed clip, flame core, solo tag)
  'g': '#FF6F2C', // Charmander orange flame
  'h': '#7CE8FF', // Cyan-blue (LIV sweat drop sparkle, music notes, sparkles)
  'i': '#B58EFF'  // Pastel violet accent
};

// Blocky pixel font (5px tall, 1..5px wide)
var PIXEL_FONT = {
  'A': ['.#.', '#.#', '###', '#.#', '#.#'],
  'C': ['###', '#..', '#..', '#..', '###'],
  'E': ['###', '#..', '##.', '#..', '###'],
  'H': ['#.#', '#.#', '###', '#.#', '#.#'],
  'I': ['#', '#', '#', '#', '#'],
  'L': ['#..', '#..', '#..', '#..', '###'],
  'M': ['#...#', '##.##', '#.#.#', '#...#', '#...#'],
  'N': ['#..#', '##.#', '#.##', '#..#', '#..#'],
  'O': ['###', '#.#', '#.#', '#.#', '###'],
  'P': ['###', '#.#', '###', '#..', '#..'],
  'R': ['##.', '#.#', '##.', '#.#', '#.#'],
  'S': ['.##', '#..', '.#.', '..#', '##.'],
  'U': ['#.#', '#.#', '#.#', '#.#', '###'],
  'V': ['#.#', '#.#', '#.#', '#.#', '.#.'],
  'W': ['#...#', '#...#', '#.#.#', '##.##', '#...#'],
  'Y': ['#.#', '#.#', '.#.', '.#.', '.#.'],
  'Z': ['###', '..#', '.#.', '#..', '###'],
  '!': ['#', '#', '#', '.', '#'],
  ' ': ['...', '...', '...', '...', '...']
};

// Member layout: [name, tagColStart, tagColEnd, spriteCenterCol, formulaBandStart, formulaBandEnd]
var MEMBERS = [
  { name: 'WONI',   tagStart: 1,  tagEnd: 18, center: 9,  bandStart: 0,  bandEnd: 17 },
  { name: 'LIV',    tagStart: 20, tagEnd: 30, center: 25, bandStart: 18, bandEnd: 33 },
  { name: 'MINAMI', tagStart: 32, tagEnd: 57, center: 44, bandStart: 35, bandEnd: 53 },
  { name: 'MAY',    tagStart: 59, tagEnd: 73, center: 66, bandStart: 57, bandEnd: 74 },
  { name: 'ZENA',   tagStart: 75, tagEnd: 92, center: 83, bandStart: 75, bandEnd: 92 }
];

// 5 members x 5 poses x 18 rows (17 chars wide; '.' = transparent)
// Poses per member: 0=stand, 1=solo0, 2=solo1, 3=solo2, 4=finale
var SPRITES = [
  // 0: WONI (leader, baby-faced, long dark hair, wide bright smile, Charmander fire breath)
  [
    '.................',
    '.................',
    '.....3333333.....',
    '....343333343....',
    '...34355555393...',
    '...33537573533...',
    '...34533533543...',
    '...34565556543...',
    '...335a777a533...',
    '...34357975343...',
    '...33577a77533...',
    '...34578787543...',
    '...33.79a97.33...',
    '...3..78787..3...',
    '.....7978797.....',
    '.....8787878.....',
    '......5...5......',
    '.....79...97.....'
  ],
  [
    '.................',
    '.................',
    '.....3333333.....',
    '....343333343....',
    '...34355555393...',
    '...33537573533...',
    '...34533533543...',
    '...34565556543...',
    '...335a777a533...',
    '...34357975343...',
    '..533777a77335...',
    '...34.78787.43...',
    '...33.79a97.33...',
    '...3..78787..3...',
    '.....7978797.....',
    '.....8787878.....',
    '......5...5......',
    '.....79...97.....'
  ],
  [
    '.................',
    '.................',
    '.....3333333.....',
    '....343333343....',
    '...34355555393...',
    '...33537573533...',
    '...34533533543...',
    '.g.34565556543...',
    'gfg.g5a5555533...',
    '.g.34357975343...',
    '..533777a77335...',
    '...34.78787.43...',
    '...33.79a97.33...',
    '...3..78787..3...',
    '.....7978797.....',
    '.....8787878.....',
    '......5...5......',
    '.....79...97.....'
  ],
  [
    '.................',
    '.................',
    '.....3333333.....',
    '....343333343....',
    '...34355555393...',
    '...33537573533...',
    'g..34533533543...',
    'fg.g4565556543...',
    'gfg3g5a5555533...',
    'fg.34357975343...',
    '..533777a77335...',
    '...34.78787.43...',
    '...33.79a97.33...',
    '...3..78787..3...',
    '.....7978797.....',
    '.....8787878.....',
    '......5...5......',
    '.....79...97.....'
  ],
  [
    '....55.a.a.55....',
    '...5...aaa...5...',
    '...5.333a333.5...',
    '....343333343....',
    '...34355555393...',
    '...33537573533...',
    '...34533533543...',
    '...34565556543...',
    '...335a777a533...',
    '...34357975343...',
    '...33.77a77.33...',
    '...34.78787.43...',
    '...33.79a97.33...',
    '...3..78787..3...',
    '.....7978797.....',
    '.....8787878.....',
    '......5...5......',
    '.....79...97.....'
  ],

  // 1: LIV (straight black hair, see-through bangs, sunflower-seed clip, cat eyes, toothy smile, sweat drop, mic + notes)
  [
    '.................',
    '.................',
    '.....3333333.....',
    '....333333333....',
    '...33f53535533...',
    '...33355555333...',
    '...335375735h3...',
    '...33565556533...',
    '...335a777a533...',
    '...33357975333...',
    '...33577a77533...',
    '...33578787533...',
    '...33.79a97.33...',
    '...33.78787.33...',
    '.....7978797.....',
    '.....8787878.....',
    '......5...5......',
    '.....79...97.....'
  ],
  [
    '.............ff..',
    '.............f...',
    '.....3333333ff...',
    '....333333333....',
    '...33f53535533...',
    '...33355555333...',
    '...33537573573...',
    '...33565556533...',
    '...335a777a533...',
    '...33357975333...',
    '...33577a77733...',
    '...33578787d33...',
    '...33.79a97.33...',
    '...33.78787.33...',
    '.....7978797.....',
    '.....8787878.....',
    '......5...5......',
    '.....79...97.....'
  ],
  [
    '..hh.........ff..',
    '..h..........f...',
    '.hh..3333333ff...',
    '....333333333....',
    '...33f53535533...',
    '...33355555333...',
    '...335375735h3...',
    '...33565556533...',
    '...3355a7a5533...',
    '...33357975733...',
    '...33577a77d53...',
    '...33578787.33...',
    '...33.79a97.33...',
    '...33.78787.33...',
    '.....7978797.....',
    '.....8787878.....',
    '......5...5......',
    '.....79...97.....'
  ],
  [
    '.ff..........hh..',
    '.f...........h...',
    'ff...3333333hh...',
    '....333333333....',
    '...33f53535533...',
    '...33355555333...',
    '...33537573573...',
    '...33565556533...',
    '...335a777a533...',
    '...33357975733...',
    '...33577a77d53...',
    '...33578787.33...',
    '...33.79a97.33...',
    '...33.78787.33...',
    '.....7978797.....',
    '.....8787878.....',
    '......5...5......',
    '.....79...97.....'
  ],
  [
    '....55.a.a.55....',
    '...5...aaa...5...',
    '...5.333a333.5...',
    '....333333333....',
    '...33f53535533...',
    '...33355555333...',
    '...335375735h3...',
    '...33565556533...',
    '...335a777a533...',
    '...33357975333...',
    '...33.77a77.33...',
    '...33.78787.33...',
    '...33.79a97.33...',
    '...33.78787.33...',
    '.....7978797.....',
    '.....8787878.....',
    '......5...5......',
    '.....79...97.....'
  ],

  // 2: MINAMI (long hair, desert-fox face with upturned smiling mouth corners, gyaru double peace + YAHO! bubble)
  [
    '.................',
    '.................',
    '.....3333333.....',
    '....343333343....',
    '...34355555343...',
    '...33535553533...',
    '...34573537543...',
    '...34565556543...',
    '...33.5aaa5.33...',
    '...34357975343...',
    '...33577a77533...',
    '...34578787543...',
    '...33.79a97.33...',
    '...3..78787..3...',
    '.....7978797.....',
    '.....8787878.....',
    '......5...5......',
    '.....79...97.....'
  ],
  [
    '.................',
    '.................',
    '.....3333333.....',
    '....343333343....',
    '...34355555343...',
    '..5335355535335..',
    '..5345735375435..',
    '...34565556543...',
    '...33.5aaa5.33...',
    '...34357975343...',
    '...33.77a77.33...',
    '...34.78787.43...',
    '...33.79a97.33...',
    '...3..78787..3...',
    '.....7978797.....',
    '.....8787878.....',
    '......5...5......',
    '.....79...97.....'
  ],
  [
    '.................',
    '.................',
    '.....3333333.....',
    '....343333343....',
    '.5.54355555345.5.',
    '..5335355535335..',
    '..5345735375435..',
    '...3456a5a6543...',
    '...33.5aaa5.33...',
    '...34357975343...',
    '...33.77a77.33...',
    '...34.78787.43...',
    '...33.79a97.33...',
    '...3..78787..3...',
    '.....7978797.....',
    '.....8787878.....',
    '......5...5......',
    '.....79...97.....'
  ],
  [
    '.................',
    '..f...........f..',
    '.....3333333.....',
    '....343333343....',
    '.5.54355555345.5.',
    '..5335355535335..',
    '..5345735375435..',
    '...3456a5a6543...',
    '...33.5aaa5.33...',
    '...34357975343...',
    '...33.77a77.33...',
    '...34.78787.43...',
    '...33.79a97.33...',
    '...3..78787..3...',
    '.....7978797.....',
    '.....8787878.....',
    '......5...5......',
    '.....79...97.....'
  ],
  [
    '....55.a.a.55....',
    '...5...aaa...5...',
    '...5.333a333.5...',
    '....343333343....',
    '...34355555343...',
    '...33535553533...',
    '...34573537543...',
    '...3456a5a6543...',
    '...33.5aaa5.33...',
    '...34357975343...',
    '...33.77a77.33...',
    '...34.78787.43...',
    '...33.79a97.33...',
    '...3..78787..3...',
    '.....7978797.....',
    '.....8787878.....',
    '......5...5......',
    '.....79...97.....'
  ],

  // 3: MAY (shoulder-length bob haircut, round face, wink + hair-flip hot girl gesture)
  [
    '.................',
    '.................',
    '.....3333333.....',
    '....343333343....',
    '...34355555343...',
    '...33537573533...',
    '...34533533543...',
    '...34565556543...',
    '...3355aaa5533...',
    '....335797533....',
    '.....577a775.....',
    '.....5787875.....',
    '......79a97......',
    '......78787......',
    '.....7978797.....',
    '.....8787878.....',
    '......5...5......',
    '.....79...97.....'
  ],
  [
    '.................',
    '.................',
    '.....3333333.....',
    '....343333343....',
    '...34355555343...',
    '...33533573533...',
    '...34555533543...',
    '...34565556543...',
    '...3355aaa5533...',
    '....335797533....',
    '....5.77a775.....',
    '......787875.....',
    '......79a97......',
    '......78787......',
    '.....7978797.....',
    '.....8787878.....',
    '......5...5......',
    '.....79...97.....'
  ],
  [
    '.................',
    '.............f...',
    '.....3333333.....',
    '....3433333433...',
    '...343555553433..',
    '...3353357353343.',
    '...345555335433..',
    '...34565556543...',
    '...3355aaa5533...',
    '....3357975335...',
    '.....577a77.5....',
    '.....578787......',
    '......79a97......',
    '......78787......',
    '.....7978797.....',
    '.....8787878.....',
    '......5...5......',
    '.....79...97.....'
  ],
  [
    '.................',
    '..f...........f..',
    '.....3333333.....',
    '....34333334333..',
    '...3435555534343.',
    '...3353357353333.',
    '...345555335433..',
    '...34565556543...',
    '...3355aaa5533...',
    '....3357975335...',
    '.....577a77.5....',
    '.....578787......',
    '......79a97......',
    '......78787......',
    '.....7978797.....',
    '.....8787878.....',
    '......5...5......',
    '.....79...97.....'
  ],
  [
    '....55.a.a.55....',
    '...5...aaa...5...',
    '...5.333a333.5...',
    '....343333343....',
    '...34355555343...',
    '...33533573533...',
    '...34555533543...',
    '...34565556543...',
    '...3355aaa5533...',
    '....335797533....',
    '......77a77......',
    '......78787......',
    '......79a97......',
    '......78787......',
    '.....7978797.....',
    '.....8787878.....',
    '......5...5......',
    '.....79...97.....'
  ],

  // 4: ZENA (long dark hair, round squirrel-like puffy cheeks holding acorns)
  [
    '.................',
    '.................',
    '.....3333333.....',
    '....343333343....',
    '...34355555343...',
    '...33537573533...',
    '...34533533543...',
    '...36655555663...',
    '...33555a55533...',
    '...34357975343...',
    '...33577a77533...',
    '...34578787543...',
    '...33.79a97.33...',
    '...3..78787..3...',
    '.....7978797.....',
    '.....8787878.....',
    '......5...5......',
    '.....79...97.....'
  ],
  [
    '.................',
    '.................',
    '.....3333333.....',
    '....343333343....',
    '...34355555343...',
    '...33537573533...',
    '...34533533543...',
    '..3666555556663..',
    '...35555a55553...',
    '...34357975343...',
    '...33577a77533...',
    '...34.78787.43...',
    '...33.79a97.33...',
    '...3..78787..3...',
    '.....7978797.....',
    '.....8787878.....',
    '......5...5......',
    '.....79...97.....'
  ],
  [
    '.................',
    '.....a.....a.....',
    '.....3333333.....',
    '....343333343....',
    '...34355555343...',
    '...33533533533...',
    '..3456555556543..',
    '.3655655a5565563.',
    '..3366555556633..',
    '...34557975543...',
    '...33.77a77.33...',
    '...34.78787.43...',
    '...33.79a97.33...',
    '...3..78787..3...',
    '.....7978797.....',
    '.....8787878.....',
    '......5...5......',
    '.....79...97.....'
  ],
  [
    '.................',
    '....f.a...a.f....',
    '.....3333333.....',
    '....343333343....',
    '...34355555343...',
    '...33533533533...',
    '..345665555566543'.slice(0, 17), // keep 17 chars centered
    '.3655655a5565563.',
    '..3366555556633..',
    '...34557975543...',
    '...33.77a77.33...',
    '...34.78787.43...',
    '...33.79a97.33...',
    '...3..78787..3...',
    '.....7978797.....',
    '.....8787878.....',
    '......5...5......',
    '.....79...97.....'
  ],
  [
    '....55.a.a.55....',
    '...5...aaa...5...',
    '...5.333a333.5...',
    '....343333343....',
    '...34355555343...',
    '...33537573533...',
    '...34533533543...',
    '...36655555663...',
    '...33555a55533...',
    '...34357975343...',
    '...33.77a77.33...',
    '...34.78787.43...',
    '...33.79a97.33...',
    '...3..78787..3...',
    '.....7978797.....',
    '.....8787878.....',
    '......5...5......',
    '.....79...97.....'
  ]
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('RESCENE PULSE')
    .addItem('Setup Scene', 'setup')
    .addItem('Play (~60s)', 'play')
    .addItem('Stop', 'stop')
    .addSeparator()
    .addItem('Reset Frame (0)', 'resetFrame')
    .addToUi();
}

function resetFrame() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.getActiveSheet();
  sheet.getRange('B1').setValue(0);
  sheet.getRange('F1').setValue('Frame 0');
  SpreadsheetApp.flush();
}

function stop() {
  PropertiesService.getScriptProperties().setProperty(STOP_PROP_KEY, '1');
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (sheet) {
    sheet.getRange('F1').setValue('Stopping...');
    SpreadsheetApp.flush();
  }
}

function play() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet || !ss.getSheetByName(SPRITE_SHEET_NAME)) {
    setup();
    sheet = ss.getSheetByName(SHEET_NAME);
  }

  var props = PropertiesService.getScriptProperties();
  props.setProperty(STOP_PROP_KEY, '0');

  var frameCell = sheet.getRange('B1');
  var statusCell = sheet.getRange('F1');
  var frame = Number(frameCell.getValue()) || 0;

  statusCell.setValue('Playing');
  SpreadsheetApp.flush();

  var startTime = Date.now();
  var runDurationMs = 58000; // ~60 seconds total animation
  var targetFrameMs = 500;   // Pace ceiling ~2 fps (~15s per 24-frame loop)

  while (Date.now() - startTime < runDurationMs) {
    if (props.getProperty(STOP_PROP_KEY) === '1') {
      statusCell.setValue('Stopped');
      SpreadsheetApp.flush();
      return;
    }

    var t0 = Date.now();
    frame = (frame + 1) % TOTAL_FRAMES;
    frameCell.setValue(frame);
    SpreadsheetApp.flush();

    var elapsed = Date.now() - t0;
    var waitMs = Math.max(40, targetFrameMs - elapsed);
    Utilities.sleep(waitMs);
  }

  statusCell.setValue('Done (~60s)');
  SpreadsheetApp.flush();
}

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = prepareSheet_(ss, SHEET_NAME);
  var spriteSheet = prepareSheet_(ss, SPRITE_SHEET_NAME);

  // Build hidden Sprites lookup table in Sprites!A1:A457
  var spriteRows = buildSpriteRows_();
  spriteSheet.getRange(1, 1, spriteRows.length, 1).setValues(spriteRows);
  spriteSheet.hideSheet();

  // Control bar in Row 1 (B1 is the single frame counter)
  sheet.clear();
  sheet.clearConditionalFormatRules();
  sheet.setHiddenGridlines(true);

  sheet.getRange('A1').setValue('FRAME').setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#3B2454').setHorizontalAlignment('center');
  sheet.getRange('B1').setValue(0).setFontWeight('bold').setFontColor('#FFE259').setBackground('#151122').setHorizontalAlignment('center');
  sheet.getRange('C1:D1').merge().setValue('RESCENE PULSE').setFontWeight('bold').setFontColor('#FFB3D9').setBackground('#281F47');
  sheet.getRange('E1').setValue('STATUS').setFontWeight('bold').setFontColor('#E5DFF5').setBackground('#3B2454').setHorizontalAlignment('center');
  sheet.getRange('F1').setValue('Ready').setFontColor('#7CE8FF').setBackground('#281F47');

  // Ensure grid capacity: 1 margin col + 94 pixel cols = 95 cols; 2 header rows + 38 pixel rows = 40 rows
  ensureSheetSize_(sheet, 2 + GRID_ROWS, 1 + GRID_COLS);

  // Trim extra rows/cols if sheet was newly created with 1000x26
  var maxRows = sheet.getMaxRows();
  if (maxRows > 2 + GRID_ROWS) {
    sheet.deleteRows(2 + GRID_ROWS + 1, maxRows - (2 + GRID_ROWS));
  }
  var maxCols = sheet.getMaxColumns();
  if (maxCols > 1 + GRID_COLS) {
    sheet.deleteColumns(1 + GRID_COLS + 1, maxCols - (1 + GRID_COLS));
  }

  // Size rows & columns into crisp 10x10px square pixels
  sheet.setRowHeight(1, 26);
  sheet.setRowHeight(2, 6);
  sheet.setColumnWidth(1, 16);
  sheet.setRowHeights(3, GRID_ROWS, PIXEL_SIZE_PX);
  sheet.setColumnWidths(2, GRID_COLS, PIXEL_SIZE_PX);

  // Write pure spreadsheet formulas into all 94 x 38 = 3,572 pixel cells (B3:CQ40)
  var formulas = buildGridFormulas_();
  var canvasRange = sheet.getRange(3, 2, GRID_ROWS, GRID_COLS);
  canvasRange.setFormulas(formulas);
  canvasRange.setNumberFormat(';;;'); // Hide underlying single-char palette codes
  canvasRange.setBackground(PALETTE['0']);
  canvasRange.setFontColor(PALETTE['0']);

  // Conditional Formatting rules for colors '1'..'9', 'a'..'i'
  var rules = [];
  var keys = Object.keys(PALETTE);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (k === '0') continue; // '0' uses default cell background
    rules.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo(k)
        .setBackground(PALETTE[k])
        .setFontColor(PALETTE[k])
        .setRanges([canvasRange])
        .build()
    );
  }
  sheet.setConditionalFormatRules(rules);

  ss.setActiveSheet(sheet);
  SpreadsheetApp.flush();
}

function prepareSheet_(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function ensureSheetSize_(sheet, targetRows, targetCols) {
  var curRows = sheet.getMaxRows();
  if (curRows < targetRows) {
    sheet.insertRowsAfter(curRows, targetRows - curRows);
  }
  var curCols = sheet.getMaxColumns();
  if (curCols < targetCols) {
    sheet.insertColumnsAfter(curCols, targetCols - curCols);
  }
}

function renderPixelText_(text, fgChar, bgChar) {
  var out = ['', '', '', '', ''];
  for (var i = 0; i < text.length; i++) {
    var glyph = PIXEL_FONT[text.charAt(i)];
    for (var r = 0; r < 5; r++) {
      if (i > 0) out[r] += bgChar;
      out[r] += glyph[r].replace(/#/g, fgChar).replace(/\./g, bgChar);
    }
  }
  return out;
}

function buildSpriteRows_() {
  var rows = [];
  // 5 members x 5 poses x 18 rows = 450 rows
  for (var i = 0; i < SPRITES.length; i++) {
    var poseRows = SPRITES[i];
    for (var r = 0; r < 18; r++) {
      rows.push([poseRows[r]]);
    }
  }
  // Rows 451..457: MINAMI "YAHO!" speech bubble (19x7 with 1px white margin all around)
  var yahoText = renderPixelText_('YAHO!', 'a', '7');
  var border = '7777777777777777777';
  rows.push([border]);
  for (var y = 0; y < 5; y++) {
    rows.push(['7' + yahoText[y] + '7']);
  }
  rows.push([border]);
  return rows;
}

function buildGridFormulas_() {
  var titleRescene = renderPixelText_('RESCENE', '7', '.');
  var titlePulse = renderPixelText_('PULSE', '9', '.');
  var titleRows = [];
  for (var tr = 0; tr < 5; tr++) {
    titleRows.push(titleRescene[tr] + '.....' + titlePulse[tr]); // width = 28 + 5 + 19 = 52
  }

  // Pre-render member name bitmaps ('#' = letter, ' ' = tag bg)
  var tagMaps = [];
  for (var m = 0; m < MEMBERS.length; m++) {
    tagMaps.push(renderPixelText_(MEMBERS[m].name, '#', ' '));
  }

  // Rising 3x3 heart lanes in sky gaps: [centerCol, phaseOffset, maxRow]
  var heartLanes = [
    { hx: 2,  phase: 4,  maxR: 13 }, // top-left open sky above WONI flame
    { hx: 17, phase: 0,  maxR: 13 }, // between WONI & LIV upper sky
    { hx: 33, phase: 6,  maxR: 13 }, // between LIV & MINAMI upper sky
    { hx: 55, phase: 12, maxR: 23 }, // between MINAMI & MAY full gap
    { hx: 74, phase: 18, maxR: 13 }, // between MAY & ZENA upper sky
    { hx: 90, phase: 10, maxR: 14 }  // top-right open sky above ZENA cheeks
  ];

  // Rising 1x1 sparkle lanes: [col, phaseOffset, minR, maxR]
  var sparkleLanes = [
    { col: 4,  phase: 1, minR: 1, maxR: 13 },
    { col: 16, phase: 5, minR: 1, maxR: 24 },
    { col: 34, phase: 9, minR: 7, maxR: 24 },
    { col: 56, phase: 3, minR: 7, maxR: 24 },
    { col: 73, phase: 7, minR: 1, maxR: 24 },
    { col: 88, phase: 2, minR: 1, maxR: 14 }
  ];

  var grid = [];
  for (var r = 0; r < GRID_ROWS; r++) {
    var rowFormulas = [];
    for (var c = 0; c < GRID_COLS; c++) {
      rowFormulas.push(buildCellFormula_(r, c, titleRows, tagMaps, heartLanes, sparkleLanes));
    }
    grid.push(rowFormulas);
  }
  return grid;
}

function buildCellFormula_(r, c, titleRows, tagMaps, heartLanes, sparkleLanes) {
  // 1. Name tag area (rows 31..37): 1px top margin (31), 5px letters (32..36), 1px bottom margin (37)
  if (r >= 31) {
    for (var m = 0; m < MEMBERS.length; m++) {
      var mem = MEMBERS[m];
      if (c >= mem.tagStart && c <= mem.tagEnd) {
        if (r >= 32 && r <= 36 && c >= mem.tagStart + 1 && c <= mem.tagEnd - 1) {
          var ch = tagMaps[m][r - 32].charAt(c - (mem.tagStart + 1));
          if (ch === '#') {
            return '=LET(s,INT(MOD($B$1,24)/4),IF(s=' + m + ',"f",IF(s=5,"9","7")))';
          }
        }
        return '=LET(f,MOD($B$1,24),"e")';
      }
    }
    return '=LET(f,MOD($B$1,24),"0")';
  }

  // 2. Title RESCENE PULSE (rows 1..5, cols 21..72)
  if (r >= 1 && r <= 5 && c >= 21 && c <= 72) {
    var tch = titleRows[r - 1].charAt(c - 21);
    if (tch !== '.') {
      if (tch === '9') {
        return '=LET(s,INT(MOD($B$1,24)/4),IF(s=5,IF(MOD($B$1,2)=0,"a","9"),"9"))';
      }
      return '=LET(f,MOD($B$1,24),"7")';
    }
  }

  // 3. Build background expression for (r, c)
  var bgExpr = buildBgExpr_(r, c, heartLanes, sparkleLanes);

  // 4. Stage front apron (row 30) has no characters overlapping it
  if (r === 30) {
    return '=LET(f,MOD($B$1,24),' + bgExpr + ')';
  }

  // 5. Check if (r, c) falls inside one of the 5 non-overlapping member sprite bands (rows 7..29)
  if (r >= 7 && r <= 29) {
    for (var m = 0; m < MEMBERS.length; m++) {
      var mem = MEMBERS[m];
      if (c >= mem.bandStart && c <= mem.bandEnd) {
        var srExpr = r + '-(9+dy)';
        var scExpr = c + '-(' + (mem.center - 9) + '+dx)';
        var spriteLookup =
          'IF(AND(' + srExpr + '>=1,' + srExpr + '<=18,' + scExpr + '>=1,' + scExpr + '<=17),' +
          'MID(INDEX(' + SPRITE_SHEET_NAME + '!$A$1:$A$457,' + (m * 5) + '*18+p*18+' + srExpr + '),' + scExpr + ',1),".")';

        // MINAMI's "YAHO!" speech bubble sits at rows 7..13, cols 35..53 during solo (s=2, u>=1)
        var yahoCheck = '';
        if (m === 2 && r >= 7 && r <= 13 && c >= 35 && c <= 53) {
          yahoCheck = 'IF(AND(s=2,u>=1),MID(INDEX(' + SPRITE_SHEET_NAME + '!$A$451:$A$457,' + (r - 6) + '),' + (c - 34) + ',1),';
        }

        var coreExpr =
          's,INT(f/4),u,MOD(f,4),' +
          'dx,IF(OR(s=' + m + ',s=5),0,IF(MOD(f+' + m + ',4)=1,1,IF(MOD(f+' + m + ',4)=3,-1,0))),' +
          'dy,IF(s=' + m + ',2,IF(s=5,1,MOD(f+' + m + ',2))),' +
          'p,IF(s=5,4,IF(s=' + m + ',IF(u=0,1,IF(u=2,3,2)),0)),' +
          'px,' + spriteLookup + ',' +
          'IF(px<>".",px,' + bgExpr + ')';

        if (yahoCheck) {
          return '=LET(f,MOD($B$1,24),s,INT(f/4),u,MOD(f,4),' +
            yahoCheck +
            'LET(dx,IF(OR(s=2,s=5),0,IF(MOD(f+2,4)=1,1,IF(MOD(f+2,4)=3,-1,0))),' +
            'dy,IF(s=2,2,IF(s=5,1,MOD(f+2,2))),' +
            'p,IF(s=5,4,IF(s=2,IF(u=0,1,IF(u=2,3,2)),0)),' +
            'px,' + spriteLookup + ',IF(px<>".",px,' + bgExpr + '))))';
        }

        return '=LET(f,MOD($B$1,24),' + coreExpr + ')';
      }
    }
  }

  // 6. Pure sky / stage / floating hearts & sparkles outside member bands
  return '=LET(f,MOD($B$1,24),' + bgExpr + ')';
}

function buildBgExpr_(r, c, heartLanes, sparkleLanes) {
  var lxExpr = '46.5+37.5*SIN(f*0.2618)';

  // Stage front apron
  if (r === 30) {
    return 'IF(ABS(' + c + '-(' + lxExpr + '))<10,"9","d")';
  }
  // Pastel stage surface
  if (r >= 26 && r <= 29) {
    return 'IF(ABS(' + c + '-(' + lxExpr + '))<10,"c","b")';
  }

  // Sky spotlight cone
  var beam = (3.0 + r * 0.35).toFixed(2);
  var halfBeam = (1.65 + r * 0.1925).toFixed(2);
  var skyExpr = 'IF(ABS(' + c + '-(' + lxExpr + '))<' + halfBeam + ',"2",IF(ABS(' + c + '-(' + lxExpr + '))<' + beam + ',"1","0"))';

  // Rising 3x3 heart checks (only emitted in the exact 3-col lanes!)
  var heartConds = [];
  for (var i = 0; i < heartLanes.length; i++) {
    var lane = heartLanes[i];
    if (r >= 7 && r <= lane.maxR && Math.abs(c - lane.hx) <= 1) {
      var dc = c - lane.hx;
      var hyExpr = '(' + (lane.maxR - 1) + '-MOD(f+' + lane.phase + ',' + (lane.maxR - 8) + '))';
      var drCheck;
      if (dc === 0) {
        drCheck = 'OR(' + r + '=' + hyExpr + ',' + r + '=' + hyExpr + '+1)';
      } else {
        drCheck = 'OR(' + r + '=' + hyExpr + '-1,' + r + '=' + hyExpr + ')';
      }
      heartConds.push(drCheck + ',IF(MOD(f+' + lane.phase + ',2)=0,"a","9")');
    }
  }

  // Rising 1x1 sparkle checks (only emitted in sparkle columns!)
  var sparkleExpr = '';
  for (var j = 0; j < sparkleLanes.length; j++) {
    var sp = sparkleLanes[j];
    if (c === sp.col && r >= sp.minR && r <= sp.maxR) {
      var span = sp.maxR - sp.minR + 1;
      sparkleExpr = 'IF(' + r + '=(' + sp.maxR + '-MOD(f*2+' + sp.phase + ',' + span + ')),IF(MOD(f+' + j + ',2)=0,"f","h"),';
      break;
    }
  }

  // Finale extra floating hearts in r=7..9 at gap centers (17, 33, 55, 74)
  var finaleHeart = false;
  var finaleHeartOn = false;
  var finCenters = [17, 33, 55, 74];
  for (var k = 0; k < finCenters.length; k++) {
    var fc = finCenters[k];
    if (r >= 7 && r <= 11 && Math.abs(c - fc) <= 1) {
      finaleHeart = true;
      var fdc = c - fc;
      finaleHeartOn = (fdc === 0) ? (r === 8 || r === 9) : (r === 7 || r === 8);
      break;
    }
  }

  var expr = skyExpr;
  if (sparkleExpr) {
    expr = sparkleExpr + expr + ')';
  }
  for (var h = heartConds.length - 1; h >= 0; h--) {
    expr = 'IF(' + heartConds[h] + ',' + expr + ')';
  }
  if (finaleHeart) {
    var finVal = finaleHeartOn ? 'IF(MOD(f,2)=0,"a","9")' : skyExpr;
    expr = 'IF(INT(f/4)=5,' + finVal + ',' + expr + ')';
  }
  return expr;
}
