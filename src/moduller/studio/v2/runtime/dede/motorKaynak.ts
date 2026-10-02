/** DEDE cascade motoru. Sonuç önce hesaplanır; sahne yalnızca bunu oynatır. */
export const DEDE_MOTOR_SOURCE = `
function createDedeMotor() {
  var COLS = 6;
  var ROWS = 5;
  var MIN_CLUSTER = 5;
  var STAKES = [10, 25, 50, 100];
  var MVALS = [2, 3, 5, 10, 15, 25, 50, 100];
  var BAG = [
    ['amethyst', 24], ['emerald', 22], ['ruby', 20], ['sapphire', 18], ['topaz', 16],
    ['watch', 4], ['lantern', 3], ['key', 3], ['ring', 2], ['crown', 2], ['medallion', 4]
  ];
  var BASE = {
    amethyst: 1, emerald: 1, ruby: 2, sapphire: 2, topaz: 3,
    watch: 8, lantern: 10, key: 16, ring: 24, crown: 40
  };
  var RARITY = {
    amethyst: 'low', emerald: 'low', ruby: 'low', sapphire: 'low', topaz: 'low',
    watch: 'high', lantern: 'high', key: 'high', ring: 'high', crown: 'high', medallion: 'special'
  };
  var BAG_TOTAL = 0;
  for (var bi = 0; bi < BAG.length; bi++) BAG_TOTAL += BAG[bi][1];

  function hashSeed(text) {
    var h = 2166136261;
    var s = String(text || '');
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pickType(rng) {
    var roll = rng() * BAG_TOTAL;
    var acc = 0;
    for (var i = 0; i < BAG.length; i++) {
      acc += BAG[i][1];
      if (roll < acc) return BAG[i][0];
    }
    return 'amethyst';
  }
  function pickMult(rng) {
    var table = [2, 2, 2, 3, 3, 5, 5, 10, 15, 25, 50, 100];
    return table[Math.floor(rng() * table.length)];
  }
  function makeCell(id, type, row, col, rng) {
    return {
      id: id,
      type: type,
      row: row,
      column: col,
      assetId: type === 'medallion' ? 'dede_medallion' : 'sym_' + type,
      rarity: RARITY[type] || 'low',
      animationState: 'idle',
      multiplier: type === 'medallion' ? pickMult(rng) : 0
    };
  }
  function emptyGrid() {
    var g = [];
    for (var r = 0; r < ROWS; r++) {
      g[r] = [];
      for (var c = 0; c < COLS; c++) g[r][c] = null;
    }
    return g;
  }
  function cloneGrid(grid) {
    var g = [];
    for (var r = 0; r < ROWS; r++) {
      g[r] = [];
      for (var c = 0; c < COLS; c++) {
        var cell = grid[r][c];
        g[r][c] = cell ? {
          id: cell.id, type: cell.type, row: r, column: c, assetId: cell.assetId,
          rarity: cell.rarity, animationState: 'idle', multiplier: cell.multiplier || 0
        } : null;
      }
    }
    return g;
  }
  function fillAll(rng, seq) {
    var grid = emptyGrid();
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var type = pickType(rng);
        grid[r][c] = makeCell('s' + (seq.n++), type, r, c, rng);
      }
    }
    return grid;
  }
  function stamp(grid, row, col, type, mult, seq, rng) {
    var cell = makeCell('s' + (seq.n++), type, row, col, rng);
    if (type === 'medallion') cell.multiplier = mult || 5;
    grid[row][col] = cell;
  }
  function groupsOf(grid) {
    var seen = {};
    var out = [];
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var key = r + ',' + c;
        var start = grid[r][c];
        if (!start || start.type === 'medallion' || seen[key]) continue;
        var stack = [[r, c]];
        var cells = [];
        seen[key] = 1;
        while (stack.length) {
          var p = stack.pop();
          cells.push({ row: p[0], column: p[1], id: grid[p[0]][p[1]].id });
          var near = [[p[0] - 1, p[1]], [p[0] + 1, p[1]], [p[0], p[1] - 1], [p[0], p[1] + 1]];
          for (var i = 0; i < near.length; i++) {
            var rr = near[i][0];
            var cc = near[i][1];
            if (rr < 0 || cc < 0 || rr >= ROWS || cc >= COLS) continue;
            var k2 = rr + ',' + cc;
            var n = grid[rr][cc];
            if (seen[k2] || !n || n.type !== start.type) continue;
            seen[k2] = 1;
            stack.push([rr, cc]);
          }
        }
        if (cells.length >= MIN_CLUSTER) out.push({ type: start.type, cells: cells });
      }
    }
    return out;
  }
  function payOf(type, count, stake) {
    var sizeMul = count >= 12 ? 8 : count >= 9 ? 4 : count >= 7 ? 2 : 1;
    return Math.max(1, Math.round(BASE[type] * sizeMul * (count / 5) * stake / 10));
  }
  function gravity(grid, rng, seq) {
    var spawned = [];
    for (var c = 0; c < COLS; c++) {
      var kept = [];
      for (var r = ROWS - 1; r >= 0; r--) if (grid[r][c]) kept.push(grid[r][c]);
      var missing = ROWS - kept.length;
      var ordered = [];
      for (var i = 0; i < missing; i++) {
        var cell = makeCell('s' + (seq.n++), pickType(rng), i, c, rng);
        ordered.push(cell);
        spawned.push({ id: cell.id, column: c });
      }
      for (var k = kept.length - 1; k >= 0; k--) ordered.push(kept[k]);
      for (var row = 0; row < ROWS; row++) {
        var placed = ordered[row];
        placed.row = row;
        placed.column = c;
        grid[row][c] = placed;
      }
    }
    return spawned;
  }
  function clearCells(grid, cells) {
    for (var i = 0; i < cells.length; i++) grid[cells[i].row][cells[i].column] = null;
  }
  function medalSum(grid) {
    var list = [];
    var sum = 0;
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var cell = grid[r][c];
        if (cell && cell.type === 'medallion') {
          list.push({ id: cell.id, row: r, column: c, value: cell.multiplier });
          sum += cell.multiplier;
        }
      }
    }
    return { list: list, total: sum > 0 ? sum : 1, active: sum > 0 };
  }
  function quoteRound(opts) {
    var seed = String(opts.seed || 'DEDE_TEST_001');
    var stake = STAKES.indexOf(opts.stake) >= 0 ? opts.stake : 10;
    var force = opts.force || {};
    var rng = mulberry32(hashSeed(seed + '|' + stake + '|' + (opts.nonce || 0)));
    var seq = { n: 1 };
    var grid = fillAll(rng, seq);
    if (force.bigWin) {
      for (var r = 3; r < 5; r++) for (var c = 0; c < COLS; c++) stamp(grid, r, c, 'crown', 0, seq, rng);
    } else if (force.cascade) {
      for (var col = 0; col < COLS; col++) stamp(grid, 4, col, 'amethyst', 0, seq, rng);
    }
    if (force.multiplier || force.bigWin) stamp(grid, 0, 0, 'medallion', force.bigWin ? 25 : 10, seq, rng);
    var steps = [];
    var baseWin = 0;
    var cascadeIndex = 0;
    steps.push({ phase: 'POPULATE_GRID', grid: cloneGrid(grid), amount: 0, groups: [], cascadeIndex: 0 });
    var guard = 0;
    while (guard++ < 16) {
      var found = groupsOf(grid);
      var evalPhase = cascadeIndex === 0 ? 'EVALUATE' : 'RE_EVALUATE';
      if (!found.length) {
        steps.push({ phase: evalPhase, grid: cloneGrid(grid), amount: 0, groups: [], cascadeIndex: cascadeIndex });
        break;
      }
      var groups = [];
      var stepWin = 0;
      var remove = [];
      for (var g = 0; g < found.length; g++) {
        var amount = payOf(found[g].type, found[g].cells.length, stake);
        stepWin += amount;
        groups.push({ type: found[g].type, cells: found[g].cells, amount: amount });
        for (var ci = 0; ci < found[g].cells.length; ci++) remove.push(found[g].cells[ci]);
      }
      baseWin += stepWin;
      steps.push({ phase: evalPhase, grid: cloneGrid(grid), amount: stepWin, groups: groups, cascadeIndex: cascadeIndex });
      steps.push({ phase: 'WIN', grid: cloneGrid(grid), amount: stepWin, groups: groups, cascadeIndex: cascadeIndex });
      clearCells(grid, remove);
      steps.push({ phase: 'REMOVE_WINNERS', grid: cloneGrid(grid), amount: stepWin, groups: groups, cascadeIndex: cascadeIndex });
      gravity(grid, rng, seq);
      cascadeIndex += 1;
      steps.push({ phase: 'CASCADE', grid: cloneGrid(grid), amount: stepWin, groups: [], cascadeIndex: cascadeIndex });
    }
    var medals = medalSum(grid);
    var totalMultiplier = baseWin > 0 ? medals.total : 1;
    var totalWin = baseWin * totalMultiplier;
    if (baseWin > 0 && medals.active) {
      steps.push({ phase: 'MULTIPLIER', grid: cloneGrid(grid), amount: totalWin, groups: [], cascadeIndex: cascadeIndex, medals: medals.list, totalMultiplier: totalMultiplier });
    }
    var bigWin = totalWin >= stake * 15 && totalWin > 0;
    var bonus = medals.list.length >= 3;
    if (bonus && baseWin > 0) steps.push({ phase: 'BONUS', grid: cloneGrid(grid), amount: totalWin, groups: [], cascadeIndex: cascadeIndex, totalMultiplier: totalMultiplier });
    if (bigWin) steps.push({ phase: 'BIG_WIN', grid: cloneGrid(grid), amount: totalWin, groups: [], cascadeIndex: cascadeIndex, totalMultiplier: totalMultiplier });
    steps.push({ phase: 'ROUND_END', grid: cloneGrid(grid), amount: totalWin, groups: [], cascadeIndex: cascadeIndex, totalMultiplier: totalMultiplier });
    return {
      seed: seed,
      stake: stake,
      steps: steps,
      baseWin: baseWin,
      totalMultiplier: totalMultiplier,
      totalWin: totalWin,
      cascadeIndex: cascadeIndex,
      bigWin: bigWin,
      bonus: bonus,
      grid: cloneGrid(grid),
      multipliers: medals.list.map(function (m) { return m.value; })
    };
  }
  function createSession(balance) {
    return {
      sessionId: 'dede-' + hashSeed(String(balance) + ':' + Date.now()),
      roundId: '',
      grid: emptyGrid(),
      previousGrid: null,
      testBalance: balance,
      testStake: 10,
      baseWin: 0,
      multipliers: [],
      totalMultiplier: 1,
      totalWin: 0,
      cascadeIndex: 0,
      gameState: 'BOOT',
      bonusState: null,
      seed: 'DEDE_TEST_001',
      nonce: 0,
      roundNo: 0,
      assetFailure: false,
      force: {}
    };
  }
  function startRound(session) {
    if (session.gameState === 'ROUND_START' || session.gameState === 'POPULATE_GRID' || session.gameState === 'WIN' || session.gameState === 'CASCADE' || session.gameState === 'EVALUATE' || session.gameState === 'RE_EVALUATE' || session.gameState === 'REMOVE_WINNERS' || session.gameState === 'MULTIPLIER' || session.gameState === 'BIG_WIN' || session.gameState === 'BONUS') {
      return null;
    }
    if (session.testBalance < session.testStake) return null;
    session.previousGrid = cloneGrid(session.grid);
    session.testBalance -= session.testStake;
    session.roundNo += 1;
    session.nonce += 1;
    session.roundId = session.seed + '-' + session.roundNo;
    session.gameState = 'ROUND_START';
    session.totalWin = 0;
    session.baseWin = 0;
    session.totalMultiplier = 1;
    session.bonusState = null;
    var round = quoteRound({ seed: session.seed, stake: session.testStake, nonce: session.nonce, force: session.force || {} });
    session.force = {};
    return round;
  }
  function commit(session, round) {
    session.testBalance += round.totalWin;
    session.baseWin = round.baseWin;
    session.totalWin = round.totalWin;
    session.totalMultiplier = round.totalMultiplier;
    session.multipliers = round.multipliers.slice();
    session.cascadeIndex = round.cascadeIndex;
    session.grid = cloneGrid(round.grid);
    session.bonusState = round.bonus ? 'medallion' : null;
    session.gameState = 'READY';
  }
  function cellAnim(phase) {
    if (phase === 'POPULATE_GRID' || phase === 'CASCADE') return 'drop';
    if (phase === 'WIN' || phase === 'EVALUATE' || phase === 'RE_EVALUATE') return 'win';
    if (phase === 'REMOVE_WINNERS') return 'break';
    if (phase === 'MULTIPLIER') return 'collect';
    return 'idle';
  }
  function dropOffset(progress, col) {
    var local = (progress - col * 0.07) / 0.78;
    if (local <= 0) return 5.4;
    if (local >= 1) return 0;
    var eased = 1 - Math.pow(1 - local, 3);
    if (local > 0.8) eased += Math.sin(((local - 0.8) / 0.2) * Math.PI) * 0.08;
    return (1 - Math.min(1.08, eased)) * 5.2;
  }
  function duration(phase) {
    if (phase === 'POPULATE_GRID') return 1.05;
    if (phase === 'EVALUATE' || phase === 'RE_EVALUATE') return 0.22;
    if (phase === 'WIN') return 0.7;
    if (phase === 'REMOVE_WINNERS') return 0.46;
    if (phase === 'CASCADE') return 0.86;
    if (phase === 'MULTIPLIER') return 1.05;
    if (phase === 'BIG_WIN') return 1.7;
    if (phase === 'BONUS') return 0.7;
    return 0.25;
  }
  function dedeMood(phase, round, step) {
    if (phase === 'BIG_WIN' || phase === 'BONUS') return 'BIG_WIN';
    if (phase === 'WIN' || phase === 'REMOVE_WINNERS') return 'HAPPY';
    if (phase === 'MULTIPLIER') return 'SURPRISED';
    if (phase === 'CASCADE' || phase === 'RE_EVALUATE') return 'WATCHING';
    if (phase === 'ROUND_END' && round.totalWin <= 0) return 'WAITING';
    if (phase === 'POPULATE_GRID') return 'WATCHING';
    return 'IDLE';
  }
  function voiceFor(phase, round, step) {
    if (phase === 'POPULATE_GRID' && round.cascadeIndex >= 0 && step.cascadeIndex === 0) return null;
    if (phase === 'WIN' && step.cascadeIndex === 0) return 'Güzel gidiyor.';
    if (phase === 'CASCADE' && step.cascadeIndex === 1) return 'Bir tane daha!';
    if (phase === 'CASCADE' && step.cascadeIndex > 1) return 'Devam et!';
    if (phase === 'MULTIPLIER') return 'Şans kapıyı çaldı.';
    if (phase === 'BIG_WIN') return 'İşte bu!';
    return null;
  }
  function createPresenter(round, shownWin) {
    var index = 0;
    var t = 0;
    var running = true;
    function frame() {
      var step = round.steps[index];
      var phase = step.phase;
      var k = Math.min(1, t / duration(phase));
      var winIds = {};
      var groups = step.groups || [];
      for (var g = 0; g < groups.length; g++) {
        for (var i = 0; i < groups[g].cells.length; i++) winIds[groups[g].cells[i].id] = 1;
      }
      var cells = [];
      var grid = step.grid;
      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          var cell = grid[r][c];
          if (!cell) continue;
          var marked = !!winIds[cell.id];
          var anim = 'idle';
          var offset = 0;
          if (phase === 'POPULATE_GRID') {
            anim = 'drop';
            offset = dropOffset(k, c);
          } else if (phase === 'CASCADE') {
            anim = 'drop';
            offset = dropOffset(k, c) * 0.72;
          } else if ((phase === 'WIN' || phase === 'EVALUATE' || phase === 'RE_EVALUATE') && marked) anim = 'win';
          else if (phase === 'REMOVE_WINNERS' && marked) anim = 'break';
          else if (phase === 'MULTIPLIER' && cell.type === 'medallion') anim = 'collect';
          cells.push({
            id: cell.id, type: cell.type, row: r, column: c, multiplier: cell.multiplier || 0,
            assetId: cell.assetId, rarity: cell.rarity, animationState: anim, offset: offset, win: marked
          });
        }
      }
      var counted = shownWin;
      if (phase === 'WIN' || phase === 'REMOVE_WINNERS' || phase === 'CASCADE' || phase === 'MULTIPLIER' || phase === 'BIG_WIN' || phase === 'BONUS' || phase === 'ROUND_END') {
        counted = Math.round(round.baseWin * (phase === 'MULTIPLIER' || phase === 'BIG_WIN' || phase === 'BONUS' || phase === 'ROUND_END' ? (0.35 + 0.65 * k) * (round.totalMultiplier || 1) / (round.totalMultiplier || 1) : 1));
        if (phase === 'MULTIPLIER' || phase === 'BIG_WIN' || phase === 'BONUS' || phase === 'ROUND_END') {
          counted = Math.round(round.totalWin * k);
        } else counted = Math.min(round.baseWin, Math.round(round.baseWin * Math.min(1, (index + k) / Math.max(1, round.steps.length - 1))));
      }
      return {
        gameState: phase,
        cells: cells,
        progress: k,
        winShown: phase === 'ROUND_END' ? round.totalWin : counted,
        totalMultiplier: round.totalMultiplier,
        cascadeIndex: step.cascadeIndex || 0,
        dede: dedeMood(phase, round, step),
        voice: k < 0.08 ? voiceFor(phase, round, step) : null,
        burst: phase === 'REMOVE_WINNERS' ? 'break' : phase === 'MULTIPLIER' ? 'gold' : phase === 'BIG_WIN' ? 'confetti' : phase === 'WIN' ? 'spark' : 'none',
        medals: step.medals || [],
        done: false,
        bigWin: phase === 'BIG_WIN',
        bonus: phase === 'BONUS'
      };
    }
    return {
      tick: function (dt) {
        if (!running) {
          var last = frame();
          last.done = true;
          last.gameState = 'READY';
          last.winShown = round.totalWin;
          return last;
        }
        t += dt;
        var step = round.steps[index];
        if (t >= duration(step.phase)) {
          t = 0;
          index += 1;
          if (index >= round.steps.length) {
            running = false;
            index = round.steps.length - 1;
            var end = frame();
            end.done = true;
            end.gameState = 'READY';
            end.winShown = round.totalWin;
            end.dede = round.totalWin > 0 ? 'HAPPY' : 'WAITING';
            return end;
          }
        }
        return frame();
      }
    };
  }
  return {
    columns: COLS,
    rows: ROWS,
    stakes: STAKES,
    multipliers: MVALS,
    quoteRound: quoteRound,
    createSession: createSession,
    startRound: startRound,
    commit: commit,
    createPresenter: createPresenter,
    hashSeed: hashSeed
  };
}
`;
