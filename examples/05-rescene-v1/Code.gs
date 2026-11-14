/** @OnlyCurrentDoc */

/**
 * RESCENE Animated Pixel-Art Stage for Google Sheets
 * Members: WONI, LIV, MINAMI, MAY, ZENA
 *
 * HOW TO INSTALL & RUN:
 * 1. Open a Google Sheet (a blank spreadsheet works great).
 * 2. Click Extensions > Apps Script.
 * 3. Delete any code in Code.gs, paste this entire file, and press Ctrl/Cmd + S to save.
 * 4. Reload the Google Sheet (or run onOpen once from the Apps Script editor) to see the
 *    "RESCENE" menu in the top menu bar.
 * 5. Click RESCENE > 1. Setup Stage (authorize the script when prompted).
 * 6. Click RESCENE > 2. Play (60s) to watch the ~15-second loop repeat for 60 seconds,
 *    or type any frame number directly into cell D1 to jump to that frame!
 *    Use RESCENE > 3. Stop at any time to halt playback.
 *
 * PERFORMANCE & FRAME RATE:
 * - Grid: 72 columns x 35 rows (2,520 formula pixels), 24-color palette via conditional formatting.
 * - Expected frame rate: ~2 FPS (~500 ms/frame adaptive pacing).
 * - Full choreography loop: 30 frames (~15 seconds per loop: 5 solos + all-5 heart finale).
 */

var STAGE_SHEET_NAME = 'Stage';
var DATA_SHEET_NAME = '_Data';
var CANVAS_ROWS = 35;
var CANVAS_COLS = 72;
var PIXEL_SIZE_PX = 14;
var LOOP_FRAMES = 30;
var TARGET_FRAME_MS = 500; // ~2 FPS -> 30 frames = ~15 seconds per full loop
var PLAY_DURATION_MS = 60000;

var STOP_KEY = 'RESCENE_STOP';
var RUN_ID_KEY = 'RESCENE_RUN_ID';

/**
 * 24-color palette mapped to formula values 1..24 (letters 'A'..'X' in sprite maps).
 */
var PALETTE = [
  '#382963', // 1  (A) Deep twilight violet
  '#543F85', // 2  (B) Mid lavender sky
  '#7E65B0', // 3  (C) Periwinkle horizon
  '#A78CE0', // 4  (D) Spotlight lilac
  '#F5C6E0', // 5  (E) Pastel cotton-candy stage tile
  '#DFC2FA', // 6  (F) Pastel lavender stage tile
  '#FFF0F8', // 7  (G) Illuminated pearl-pink stage floor
  '#9D78C9', // 8  (H) Stage apron purple
  '#FFF9FC', // 9  (I) Snow white (title, collars, socks, sparkles)
  '#FFE066', // 10 (J) Pastel gold (sparkles, footlights, mic, title shimmer)
  '#FF6BA3', // 11 (K) Rose heart pink (hearts, bows, footlights)
  '#211733', // 12 (L) Deep plum-black (eyes, shoes)
  '#FFE0CA', // 13 (M) Peach skin
  '#F7B2B7', // 14 (N) Rosy cheek blush
  '#59342E', // 15 (O) WONI hair - espresso brown
  '#C79EFF', // 16 (P) WONI outfit - pastel lavender
  '#F4C45E', // 17 (Q) LIV hair - honey blonde
  '#FF8EC7', // 18 (R) LIV outfit - pastel sakura pink
  '#22325C', // 19 (S) MINAMI hair - midnight navy-black
  '#7CE8D3', // 20 (T) MINAMI outfit - pastel mint
  '#C95338', // 21 (U) MAY hair - warm auburn
  '#FFE678', // 22 (V) MAY outfit - pastel butter yellow
  '#825096', // 23 (W) ZENA hair - soft berry-plum
  '#7EC8FF'  // 24 (X) ZENA outfit - pastel sky blue
];

var TITLE_BITMAP = [
  'IIII..IIIII..IIII..IIII.IIIII.I...I.IIIII',
  'I...I.I.....I.....I.....I.....II..I.I....',
  'IIII..IIII...III..I.....IIII..I.I.I.IIII.',
  'I..I..I.........I.I.....I.....I..II.I....',
  'I...I.IIIII.IIII...IIII.IIIII.I...I.IIIII'
];

/**
 * Adds the RESCENE menu when the spreadsheet opens.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('RESCENE')
    .addItem('1. Setup Stage', 'setup')
    .addItem('2. Play (60s)', 'play')
    .addItem('3. Stop', 'stop')
    .addSeparator()
    .addItem('Reset to Frame 0', 'resetFrame')
    .addToUi();
}

/**
 * Builds the Stage and _Data sheets, shrinks pixels, writes formulas,
 * and configures conditional formatting for all 24 colors.
 */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var stage = getOrResetSheet_(ss, STAGE_SHEET_NAME, 0);
  var data = getOrResetSheet_(ss, DATA_SHEET_NAME, 1);

  ensureGridSize_(stage, CANVAS_ROWS + 1, CANVAS_COLS);
  ensureGridSize_(data, 30, 28);

  // Set square pixel dimensions and hide gridlines for crisp pixel art.
  stage.setHiddenGridlines(true);
  stage.setRowHeight(1, 28);
  stage.setRowHeights(2, CANVAS_ROWS, PIXEL_SIZE_PX);
  stage.setColumnWidths(1, CANVAS_COLS, PIXEL_SIZE_PX);

  // Build top control bar (Row 1); D1 is the single frame counter cell.
  stage.getRange('A1:C1').merge()
    .setValue('FRAME')
    .setBackground('#211733')
    .setFontColor('#DFC2FA')
    .setFontWeight('bold')
    .setFontSize(10)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  stage.getRange('D1:G1').merge()
    .setValue(0)
    .setBackground('#382963')
    .setFontColor('#FFF9FC')
    .setFontWeight('bold')
    .setFontSize(11)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setBorder(true, true, true, true, false, false, '#FF6BA3', SpreadsheetApp.BorderStyle.SOLID);

  stage.getRange(1, 8, 1, CANVAS_COLS - 7).merge()
    .setValue('RESCENE — WONI · LIV · MINAMI · MAY · ZENA  |  Change D1 or use RESCENE > Play (60s)')
    .setBackground('#211733')
    .setFontColor('#FFF0F8')
    .setFontWeight('bold')
    .setFontSize(10)
    .setHorizontalAlignment('left')
    .setVerticalAlignment('middle');

  // Populate _Data sheet with formula-driven animation state and static sprite maps.
  populateDataSheet_(data);

  // Write the single dynamic pixel formula across all 72 x 35 canvas cells.
  var pixelFormula = buildPixelFormula_();
  var formulas = [];
  for (var r = 0; r < CANVAS_ROWS; r++) {
    var rowArr = [];
    for (var c = 0; c < CANVAS_COLS; c++) {
      rowArr.push(pixelFormula);
    }
    formulas.push(rowArr);
  }

  var canvasRange = stage.getRange(2, 1, CANVAS_ROWS, CANVAS_COLS);
  canvasRange
    .setFormulas(formulas)
    .setFontSize(6)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);

  // Map formula color codes (1..24) to background & matching font colors.
  var rules = [];
  for (var i = 0; i < PALETTE.length; i++) {
    rules.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenNumberEqualTo(i + 1)
        .setBackground(PALETTE[i])
        .setFontColor(PALETTE[i])
        .setRanges([canvasRange])
        .build()
    );
  }
  stage.setConditionalFormatRules(rules);

  // Keep _Data tucked away so Stage looks like a clean pixel display.
  data.hideSheet();
  ss.setActiveSheet(stage);
  stage.getRange('D1').activate();
  SpreadsheetApp.flush();
}

/**
 * Advances the frame counter cell (Stage!D1) in a loop for ~60 seconds.
 */
function play() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var stage = ss.getSheetByName(STAGE_SHEET_NAME);
  if (!stage || !ss.getSheetByName(DATA_SHEET_NAME)) {
    setup();
    stage = ss.getSheetByName(STAGE_SHEET_NAME);
  }

  var cache = CacheService.getDocumentCache();
  var props = PropertiesService.getDocumentProperties();
  var runId = String(new Date().getTime()) + '_' + Math.floor(Math.random() * 100000);

  cache.remove(STOP_KEY);
  cache.put(RUN_ID_KEY, runId, 300);
  props.deleteProperty(STOP_KEY);

  var frameCell = stage.getRange('D1');
  var frame = Number(frameCell.getValue());
  if (isNaN(frame)) frame = 0;

  var startMs = new Date().getTime();
  while (new Date().getTime() - startMs < PLAY_DURATION_MS) {
    if (cache.get(STOP_KEY) === '1' || cache.get(RUN_ID_KEY) !== runId) {
      break;
    }
    if (props.getProperty(STOP_KEY) === '1') {
      break;
    }

    var tickStart = new Date().getTime();
    frame = (frame + 1) % 30000;
    frameCell.setValue(frame);
    SpreadsheetApp.flush();

    var elapsed = new Date().getTime() - tickStart;
    var waitMs = Math.max(40, TARGET_FRAME_MS - elapsed);
    Utilities.sleep(waitMs);
  }

  if (cache.get(RUN_ID_KEY) === runId) {
    cache.remove(STOP_KEY);
    props.deleteProperty(STOP_KEY);
  }
}

/**
 * Signals an active play() loop to stop cleanly.
 */
function stop() {
  CacheService.getDocumentCache().put(STOP_KEY, '1', 300);
  PropertiesService.getDocumentProperties().setProperty(STOP_KEY, '1');
}

/**
 * Resets the frame counter back to 0.
 */
function resetFrame() {
  stop();
  var stage = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(STAGE_SHEET_NAME);
  if (stage) {
    stage.getRange('D1').setValue(0);
    SpreadsheetApp.flush();
  }
}

/**
 * Returns the master per-pixel spreadsheet formula referencing Stage!$D$1 via _Data.
 * Evaluates front-to-back: Chibi Idol -> RESCENE Title -> Floating Hearts -> Sparkles -> Stage & Sky.
 */
function buildPixelFormula_() {
  return [
    '=LET(',
    'y,ROW()-1,',
    'x,COLUMN(),',
    'f,_Data!$B$1,',
    'lightC,_Data!$B$2,',
    'beamC,36.5+(lightC-36.5)*(y/28),',
    'inBeam,ABS(x-beamC)<=(2.5+y*0.28),',
    'm,IF(OR(x<2,x>71),0,INT((x-2)/14)+1),',
    'idolCh,IF(m=0,".",LET(',
    'dx,INDEX(_Data!$C$5:$C$9,m),',
    'dy,INDEX(_Data!$D$5:$D$9,m),',
    'pose,INDEX(_Data!$E$5:$E$9,m),',
    'sx,x-(3+14*(m-1)+dx)+1,',
    'sy,y-(12+dy)+1,',
    'IF(OR(sx<1,sx>12,sy<1,sy>18),".",MID(INDEX(_Data!$H$10:$AA$27,sy,(m-1)*4+pose),sx,1))',
    ')),',
    'IF(idolCh<>".",CODE(idolCh)-64,',
    'LET(',
    'inTitle,IF(AND(y>=3,y<=7,x>=16,x<=56),MID(INDEX(_Data!$H$1:$H$5,y-2),x-15,1)<>".",FALSE),',
    'IF(inTitle,IF(MOD(x-f*2,22)<3,10,IF(inBeam,11,9)),',
    'LET(',
    'inTitleBox,AND(y>=2,y<=8,x>=15,x<=57),',
    'hIdx,MIN(5,INT((x-1)/14)+1),',
    'hr,INDEX(_Data!$B$12:$B$16,hIdx),',
    'hc,INDEX(_Data!$C$12:$C$16,hIdx),',
    'dyh,y-hr,',
    'dxh,x-hc,',
    'inHeart,AND(NOT(inTitleBox),ABS(dyh)<=1,ABS(dxh)<=1,dyh+ABS(dxh)<>-1,OR(dyh<1,dxh=0)),',
    'IF(inHeart,11,',
    'LET(',
    'sp,IF(AND(NOT(inTitleBox),y<=27),SUMIFS(_Data!$D$19:$D$28,_Data!$B$19:$B$28,y,_Data!$C$19:$C$28,x),0),',
    'IF(sp>0,sp,',
    'IF(y<=9,IF(inBeam,2,1),',
    'IF(y<=19,IF(inBeam,3,2),',
    'IF(y<=27,IF(inBeam,4,3),',
    'IF(y<=32,IF(inBeam,7,IF(MOD(INT(x/3)+y,2)=0,5,6)),',
    'IF(y=33,IF(MOD(x,2)=0,9,8),',
    'IF(y=34,IF(MOD(x,6)=3,IF(MOD(f+INT(x/6),2)=0,10,11),8),1)',
    ')))))))))))))'
  ].join('');
}

/**
 * Writes the formula-driven animation state tables and static sprite matrices into _Data.
 */
function populateDataSheet_(data) {
  // Labels & frame-driven formulas
  data.getRange('A1:B3').setValues([
    ['loopFrame', '=MOD(' + STAGE_SHEET_NAME + '!$D$1,' + LOOP_FRAMES + ')'],
    ['lightC', '=ROUND(36.5+26*SIN(2*PI()*B1/' + LOOP_FRAMES + '),1)'],
    ['isFinale', '=B1>=20']
  ]);

  // Member choreography state (rows 5..9: WONI, LIV, MINAMI, MAY, ZENA)
  var members = ['WONI', 'LIV', 'MINAMI', 'MAY', 'ZENA'];
  var memberRows = [['Member', 'isSolo', 'dx', 'dy', 'pose']];
  data.getRange('A4:E4').setValues(memberRows);

  var memberFormulas = [];
  for (var i = 0; i < members.length; i++) {
    var rowNum = 5 + i;
    memberFormulas.push([
      members[i],
      '=AND($B$1>=' + (i * 4) + ',$B$1<' + ((i + 1) * 4) + ')',
      '=IF(OR(B' + rowNum + ',$B$3),0,INDEX({-1,0,1,0},1+MOD($B$1,4)))',
      '=IF(B' + rowNum + ',INDEX({1,2,2,1},1+MOD($B$1,4)),IF($B$3,-MOD($B$1,2),0))',
      '=IF($B$3,4,IF(B' + rowNum + ',3,1+MOD($B$1,2)))'
    ]);
  }
  data.getRange('A5:E9').setValues(memberFormulas);

  // Floating hearts (rows 12..16) in 5 non-overlapping horizontal bands
  data.getRange('A11:C11').setValues([['Heart', 'hr', 'hc']]);
  var heartRows = [];
  for (var h = 0; h < 5; h++) {
    heartRows.push([
      'H' + (h + 1),
      '=26-MOD($B$1*2+' + (h * 5) + ',25)',
      '=ROUND(INDEX({7,21,36,51,65},' + (h + 1) + ')+1.5*SIN(2*PI()*($B$1+' + (h * 6) + ')/' + LOOP_FRAMES + '),0)'
    ]);
  }
  data.getRange('A12:C16').setValues(heartRows);

  // Twinkling sparkles (rows 19..28) in 10 distinct columns
  data.getRange('A18:D18').setValues([['Sparkle', 'sr', 'sc', 'color']]);
  var sparkleCols = [3, 10, 17, 24, 31, 39, 47, 54, 62, 70];
  var sparkleRows = [];
  for (var s = 0; s < sparkleCols.length; s++) {
    sparkleRows.push([
      'S' + (s + 1),
      '=27-MOD($B$1+' + (s * 3) + ',26)',
      sparkleCols[s],
      '=IF(MOD($B$1+' + s + ',2)=0,10,9)'
    ]);
  }
  data.getRange('A19:D28').setValues(sparkleRows);

  // RESCENE blocky title bitmap (_Data!H1:H5)
  var titleValues = TITLE_BITMAP.map(function (line) { return [line]; });
  data.getRange('H1:H5').setValues(titleValues);

  // Member sprites: 18 rows x 20 columns (_Data!H10:AA27) = 5 members x 4 poses
  var sprites = buildAllMemberSprites_();
  var spriteGrid = [];
  for (var r = 0; r < 18; r++) {
    var row = [];
    for (var m = 0; m < 5; m++) {
      for (var p = 0; p < 4; p++) {
        row.push(sprites[m][p][r]);
      }
    }
    spriteGrid.push(row);
  }
  data.getRange(10, 8, 18, 20).setValues(spriteGrid);
}

/**
 * Returns [5 members][4 poses][18 rows] of 12-char sprite strings.
 * Poses: 0 = Sway A, 1 = Sway B, 2 = Solo Pose, 3 = Group Heart Pose.
 */
function buildAllMemberSprites_() {
  function makeHeartPose(h, o, customRows) {
    var h6 = repeatChar_(h, 6);
    var h8 = repeatChar_(h, 8);
    var h2 = repeatChar_(h, 2);
    var o4 = repeatChar_(o, 4);
    var o6 = repeatChar_(o, 6);
    var o8 = repeatChar_(o, 8);
    var rows = [
      '..MMK..KMM..',
      '.M..KKKK..M.',
      'M....KK....M',
      'M..' + h6 + '..M',
      'M.' + h8 + '.M',
      'M.' + h2 + 'MMMM' + h2 + '.M',
      '.M' + h + 'MLMMLM' + h + 'M.',
      '.M' + h + 'MNMMNM' + h + 'M.',
      '..M' + h + 'MMMM' + h + 'M..',
      '...MIIIIM...',
      '....' + o4 + '....',
      '....' + o4 + '....',
      '...' + o6 + '...',
      '..' + o8 + '..',
      '..IIIIIIII..',
      '....M..M....',
      '....I..I....',
      '...LL..LL...'
    ];
    if (customRows) {
      for (var key in customRows) {
        if (Object.prototype.hasOwnProperty.call(customRows, key)) {
          rows[Number(key)] = customRows[key];
        }
      }
    }
    return rows;
  }

  // 1. WONI (O = espresso hair, P = pastel lavender outfit, J = gold clip & mic)
  var woni1 = [
    '............', '............', '............',
    '...OOOOOO...', '..OOJOOOOO..', '..OOMMMMOO..',
    '.OOMLMMLMOO.', '.OOMNMMNMOO.', '.OOOMMMMOOO.',
    '.O.MIIII..O.', '.O..PPPPM.O.', '.O..PPPP..O.',
    '...PPPPPP...', '..PPPPPPPP..', '..IIIIIIII..',
    '....M..M....', '....I..I....', '...LL..LL...'
  ];
  var woni2 = woni1.slice(0, 9).concat(['.O..IIII.MO.', '.O.MPPPP..O.'], woni1.slice(11));
  var woni3 = woni1.slice(0, 4).concat([
    'J.OOJOOOOO..',
    'J.OOMMMMOO..',
    'MOOMLMMLMOO.',
    'MOOMNMMNMOO.',
    'MOOOMMMMOOO.',
    '.MM.IIII.MO.',
    '.O..PPPP..O.'
  ], woni1.slice(11));
  var woni4 = makeHeartPose('O', 'P', { 4: 'M.OOJOOOOO.M' });

  // 2. LIV (Q = honey blonde hair, R = sakura pink outfit, K = rose hair bow)
  var liv1 = [
    '............', '............', '..KK........',
    '..KQQQQQQ...', '..QQQQQQQQ..', '..QQMMMMQQ..',
    '.QQMLMMLMQQ.', '.QQMNMMNMQQ.', '.QQQMMMMQQQ.',
    '.Q.MIIII..Q.', '.Q..RRRRM.Q.', '.Q..RRRR..Q.',
    '...RRRRRR...', '..RRRRRRRR..', '..IIIIIIII..',
    '....M..M....', '....I..I....', '...LL..LL...'
  ];
  var liv2 = liv1.slice(0, 9).concat(['.Q..IIII.MQ.', '.Q.MRRRR..Q.'], liv1.slice(11));
  var liv3 = liv1.slice(0, 4).concat([
    'M.QQQQQQQQ.M',
    'M.QQMMMMQQ.M',
    '.MQMLMMLMQM.',
    '.QQMNMMNMQQ.',
    '.QQQMMMMQQQ.',
    '..MRIIIIRM..',
    '....RRRR....'
  ], liv1.slice(11));
  var liv4 = makeHeartPose('Q', 'R');

  // 3. MINAMI (S = midnight navy hair, T = pastel mint outfit, twin space buns)
  var minami1 = [
    '............', '..SS....SS..', '..ST....TS..',
    '...SSSSSS...', '..SSSSSSSS..', '..SSMMMMSS..',
    '.SSMLMMLMSS.', '.SSMNMMNMSS.', '.SSSMMMMSSS.',
    '.S.MIIII..S.', '.S..TTTTM.S.', '.S..TTTT..S.',
    '...TTTTTT...', '..TTTTTTTT..', '..IIIIIIII..',
    '....M..M....', '....I..I....', '...LL..LL...'
  ];
  var minami2 = minami1.slice(0, 9).concat(['.S..IIII.MS.', '.S.MTTTT..S.'], minami1.slice(11));
  var minami3 = minami1.slice(0, 7).concat([
    'MSSMNMMNMSS.',
    'MSSSMMMMSSS.',
    '.MM.IIII.MS.',
    '.S..TTTT..S.'
  ], minami1.slice(11));
  var minami4 = makeHeartPose('S', 'T');

  // 4. MAY (U = warm auburn hair, V = butter yellow outfit, I = white headband)
  var may1 = [
    '............', '............', '............',
    '...UUUUUU...', '..UIIIIIIUU.', '..UUMMMMUUU.',
    '.UUMLMMLMUUU', '.UUMNMMNMUU.', '.UUUMMMMUU..',
    '...MIIII....', '....VVVVM...', '....VVVV....',
    '...VVVVVV...', '..VVVVVVVV..', '..IIIIIIII..',
    '....M..M....', '....I..I....', '...LL..LL...'
  ];
  var may2 = may1.slice(0, 9).concat(['....IIII.M..', '...MVVVV....'], may1.slice(11));
  var may3 = may1.slice(0, 8).concat([
    'M.UUUMMMMU.M',
    '.MMVIIIIVMM.',
    '....VVVV....',
    '....VVVV....',
    '...VVVVVV...',
    '..VVVVVVVV..',
    '..IIIIIIII..',
    '...M....M...',
    '...I....I...',
    '..LL....LL..'
  ]);
  var may4 = makeHeartPose('U', 'V', { 4: 'M.UIIIIIIU.M' });

  // 5. ZENA (W = berry-plum hair, X = pastel sky-blue outfit, X = blue hair ribbon)
  var zena1 = [
    '............', '............', '............',
    '...WWWWXX...', '..WWWWWWWW..', '..WWMMMMWW..',
    '.WWMLMMLMWW.', '.WWMNMMNMWW.', '.WWWMMMMWWW.',
    '.W.MIIII..W.', '.W..XXXXM.W.', '.W..XXXX..W.',
    '...XXXXXX...', '..XXXXXXXX..', '..IIIIIIII..',
    '....M..M....', '....I..I....', '...LL..LL...'
  ];
  var zena2 = zena1.slice(0, 9).concat(['.W..IIII.MW.', '.W.MXXXX..W.'], zena1.slice(11));
  var zena3 = zena1.slice(0, 4).concat([
    '..WWWWWWWW.K',
    '..WWMMMMWW.M',
    '.WWMLMMLMWWM',
    '.WWMNMMNMWW.',
    '.WWWMMMMWWW.',
    '.W..IIII.MW.',
    '.W.MXXXX..W.'
  ], zena1.slice(11));
  var zena4 = makeHeartPose('W', 'X', { 3: 'M..WWWWXX..M' });

  return [
    [woni1, woni2, woni3, woni4],
    [liv1, liv2, liv3, liv4],
    [minami1, minami2, minami3, minami4],
    [may1, may2, may3, may4],
    [zena1, zena2, zena3, zena4]
  ];
}

function repeatChar_(ch, count) {
  var out = '';
  for (var i = 0; i < count; i++) out += ch;
  return out;
}

/**
 * Finds or creates a sheet at index, clears content/formatting/merges, and shows it.
 */
function getOrResetSheet_(ss, name, targetIndex) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    if (name === STAGE_SHEET_NAME && ss.getSheets().length === 1 && !ss.getSheetByName(DATA_SHEET_NAME)) {
      sheet = ss.getSheets()[0];
      sheet.setName(name);
    } else {
      sheet = ss.insertSheet(name, targetIndex);
    }
  }
  sheet.showSheet();
  sheet.clear();
  sheet.clearConditionalFormatRules();
  var maxR = sheet.getMaxRows();
  var maxC = sheet.getMaxColumns();
  if (maxR > 0 && maxC > 0) {
    sheet.getRange(1, 1, maxR, maxC).breakApart();
  }
  return sheet;
}

/**
 * Resizes a sheet to exactly targetRows x targetCols.
 */
function ensureGridSize_(sheet, targetRows, targetCols) {
  var curRows = sheet.getMaxRows();
  if (curRows < targetRows) {
    sheet.insertRowsAfter(curRows, targetRows - curRows);
  } else if (curRows > targetRows) {
    sheet.deleteRows(targetRows + 1, curRows - targetRows);
  }

  var curCols = sheet.getMaxColumns();
  if (curCols < targetCols) {
    sheet.insertColumnsAfter(curCols, targetCols - curCols);
  } else if (curCols > targetCols) {
    sheet.deleteColumns(targetCols + 1, curCols - targetCols);
  }
}
