import React, { memo, useLayoutEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  DUSME_BOUNCE_MS,
  dusmeSuresiMs,
} from '../../ortak/grid/DusmeMesafeleri';
import {
  GRID_COLUMNS,
  GRID_ROWS,
} from '../config/ZeusSabitleri';
import type { GridCell, GridMatrix, PerformanceProfile } from '../tipler/ZeusTipleri';
import {
  SymbolRenderer,
  type SymbolVisualState,
} from '../symbols/SymbolRenderer';
import { isEmptyInstanceId, isScatter } from '../symbols/SymbolRules';

const BOARD_PAD = 4;
const MAX_BOARD_WIDTH = 420;
const REEL_GAP = 2;
const FRAME_CHROME = 14;

type Props = {
  grid: GridMatrix;
  matchedIds?: ReadonlySet<string>;
  destroyingIds?: ReadonlySet<string>;
  dropping?: Record<string, number>;
  anticipation?: boolean;
  performance?: PerformanceProfile;
  bonusMode?: boolean;
  speedFactor?: number;
  compact?: boolean;
  maxHeight?: number;
};

function ReelSymbol({
  cell,
  size,
  visualState,
  dropDistanceCells,
  dropDurationMs,
  performance,
}: {
  cell: GridCell;
  size: number;
  visualState: SymbolVisualState;
  dropDistanceCells: number;
  dropDurationMs: number;
  performance: PerformanceProfile;
}) {
  const targetY = cell.row * size;
  const y = useSharedValue(
    dropDistanceCells > 0 ? targetY - dropDistanceCells * size : targetY,
  );

  useLayoutEffect(() => {
    const target = cell.row * size;
    if (dropDistanceCells > 0) {
      y.value = target - dropDistanceCells * size;
      y.value = withSequence(
        withTiming(target + 2, {
          duration: Math.max(dropDurationMs, 1),
          easing: Easing.out(Easing.cubic),
        }),
        withTiming(target, {
          duration: DUSME_BOUNCE_MS,
          easing: Easing.out(Easing.quad),
        }),
      );
      return;
    }
    y.value = target;
  }, [cell.instanceId, cell.row, dropDistanceCells, dropDurationMs, size, y]);

  const anim = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));

  return (
    <Animated.View
      style={[
        { position: 'absolute', left: 0, width: size, height: size },
        anim,
      ]}
    >
      <SymbolRenderer
        cell={cell}
        size={size}
        visualState={visualState}
        performance={performance}
      />
    </Animated.View>
  );
}

function GameBoardInner({
  grid,
  matchedIds,
  destroyingIds,
  dropping,
  anticipation = false,
  performance = 'MEDIUM',
  bonusMode = false,
  speedFactor = 1,
  compact = false,
  maxHeight,
}: Props) {
  const { width } = useWindowDimensions();
  const maxW = Math.min(
    width - (compact ? 18 : 12),
    compact ? 360 : MAX_BOARD_WIDTH,
  );
  const innerW = maxW - BOARD_PAD * 2;
  let cell = Math.floor(
    (innerW - REEL_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS,
  );
  if (maxHeight && maxHeight > 80) {
    const byH = Math.floor((maxHeight - FRAME_CHROME) / GRID_ROWS);
    cell = Math.min(cell, byH);
  }
  cell = Math.max(cell, compact ? 34 : 40);

  const boardW =
    cell * GRID_COLUMNS + REEL_GAP * (GRID_COLUMNS - 1) + BOARD_PAD * 2;
  const boardH = cell * GRID_ROWS + BOARD_PAD * 2;
  const highlightActive = (matchedIds?.size ?? 0) > 0;

  const boardDropMax = useMemo(() => {
    if (!dropping) return 0;
    let max = 0;
    for (const v of Object.values(dropping)) {
      if (v > max) max = v;
    }
    return max;
  }, [dropping]);

  const columns = useMemo(() => {
    const cols: GridCell[][] = Array.from({ length: GRID_COLUMNS }, () => []);
    for (let r = 0; r < grid.length; r += 1) {
      const row = grid[r];
      if (!row) continue;
      for (let c = 0; c < row.length; c += 1) {
        const cellData = row[c];
        if (!cellData || isEmptyInstanceId(cellData.instanceId)) continue;
        const col =
          typeof cellData.column === 'number' &&
          cellData.column >= 0 &&
          cellData.column < GRID_COLUMNS
            ? cellData.column
            : c;
        cols[col]?.push({ ...cellData, column: col, row: cellData.row ?? r });
      }
    }
    return cols;
  }, [grid]);

  const dropDurationMs = dusmeSuresiMs(boardDropMax, speedFactor);
  const frameColor = bonusMode
    ? 'rgba(77,168,255,0.85)'
    : anticipation
      ? '#4DA8FF'
      : '#E8C547';

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.frameOuter,
          { borderColor: frameColor, width: boardW + 8 },
        ]}
      >
        <View
          style={[
            styles.board,
            {
              width: boardW,
              height: boardH,
              backgroundColor: bonusMode ? '#12082A' : '#100C14',
            },
          ]}
        >
          <View style={styles.reels}>
            {columns.map((colCells, col) => (
              <View
                key={`reel-${col}`}
                style={[
                  styles.reel,
                  {
                    width: cell,
                    height: cell * GRID_ROWS,
                    marginRight: col === GRID_COLUMNS - 1 ? 0 : REEL_GAP,
                    backgroundColor: col % 2 === 0 ? '#14100C' : '#100E0A',
                  },
                ]}
              >
                {colCells.map((cellData) => {
                  const dist = dropping?.[cellData.instanceId] ?? 0;
                  const isDropping = dist > 0;
                  let visual: SymbolVisualState = 'normal';
                  if (destroyingIds?.has(cellData.instanceId)) visual = 'destroy';
                  else if (isDropping) visual = 'landing';
                  else if (matchedIds?.has(cellData.instanceId)) visual = 'matched';
                  else if (anticipation && isScatter(cellData.type)) {
                    visual = 'anticipation';
                  } else if (highlightActive) visual = 'dimmed';

                  return (
                    <ReelSymbol
                      key={cellData.instanceId}
                      cell={cellData}
                      size={cell}
                      visualState={visual}
                      dropDistanceCells={dist}
                      dropDurationMs={isDropping ? dropDurationMs : 0}
                      performance={performance}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

export const GameBoard = memo(GameBoardInner);

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  frameOuter: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 4,
    backgroundColor: '#12101A',
  },
  board: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  reels: {
    flexDirection: 'row',
    padding: BOARD_PAD,
  },
  reel: {
    overflow: 'hidden',
    borderRadius: 4,
  },
});
