/**
 * 6×5 oyun tahtası — yalnızca semboller. Dış çerçeve yok.
 */

import React, { memo, useEffect, useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { dusmeSuresiMs } from '../../ortak/grid/DusmeMesafeleri';
import { GRID_COLUMNS, GRID_ROWS } from '../sabitler/KaskadSabitleri';
import type {
  GridCell,
  GridMatrix,
  PerformanceProfile,
} from '../tipler/KaskadTipleri';
import {
  SymbolRenderer,
  type SymbolVisualState,
} from '../symbols/SymbolRenderer';
import {
  isEmptyInstanceId,
  isMultiplier,
  isScatter,
} from '../symbols/SymbolRules';
import {
  ParticleBurst,
  newBurstId,
  type ActiveBurst,
} from '../animasyonlar/ParticleController';

const BOARD_PAD = 0;
const MAX_BOARD_WIDTH = 412;
const MAX_ACTIVE_BURSTS = 10;
const REEL_GAP = 1;

type Props = {
  grid: GridMatrix;
  matchedIds?: ReadonlySet<string>;
  destroyingIds?: ReadonlySet<string>;
  dropping?: Record<string, number>;
  anticipation?: boolean;
  performance?: PerformanceProfile;
  bonusMode?: boolean;
  speedFactor?: number;
};

function ReelSymbol({
  cell,
  size,
  visualState,
  dropDistanceCells,
  dropDurationMs,
  dropDelayMs,
  performance,
}: {
  cell: GridCell;
  size: number;
  visualState: SymbolVisualState;
  dropDistanceCells: number;
  dropDurationMs: number;
  dropDelayMs: number;
  performance: PerformanceProfile;
}) {
  const targetY = cell.row * size;
  const y = useSharedValue(
    dropDistanceCells > 0 ? targetY - dropDistanceCells * size : targetY,
  );

  useEffect(() => {
    const target = cell.row * size;
    if (dropDistanceCells > 0) {
      y.value = target - dropDistanceCells * size;
      y.value = withDelay(
        dropDelayMs,
        withTiming(target, {
          duration: Math.max(dropDurationMs, 1),
          easing: Easing.bezier(0.2, 0.86, 0.24, 1),
        }),
      );
      return;
    }
    y.value = target;
  }, [
    cell.instanceId,
    cell.row,
    dropDelayMs,
    dropDistanceCells,
    dropDurationMs,
    size,
    y,
  ]);

  const anim = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: 0,
          width: size,
          height: size,
        },
        anim,
      ]}
    >
      <SymbolRenderer
        cell={cell}
        size={size}
        visualState={visualState}
        dropDistanceCells={0}
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
  performance = 'HIGH',
  speedFactor = 1,
}: Props) {
  const { width } = useWindowDimensions();
  const maxW = Math.min(width - 12, MAX_BOARD_WIDTH);
  const inner = maxW - BOARD_PAD * 2;
  const cell = Math.floor((inner - REEL_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS);
  const boardW = cell * GRID_COLUMNS + REEL_GAP * (GRID_COLUMNS - 1) + BOARD_PAD * 2;
  const highlightActive = (matchedIds?.size ?? 0) > 0;
  const [bursts, setBursts] = useState<ActiveBurst[]>([]);

  const columns = useMemo(() => {
    const cols: GridCell[][] = Array.from({ length: GRID_COLUMNS }, () => []);
    for (const row of grid) {
      for (const cellData of row) {
        if (!isEmptyInstanceId(cellData.instanceId)) {
          cols[cellData.column]?.push(cellData);
        }
      }
    }
    return cols;
  }, [grid]);

  const flat = useMemo(() => grid.flat(), [grid]);

  useEffect(() => {
    if (!destroyingIds || destroyingIds.size === 0) return;
    if (performance === 'LOW') return;
    const limit =
      performance === 'MEDIUM' ? 4 : Math.min(8, destroyingIds.size);
    const next: ActiveBurst[] = [];
    for (const c of flat) {
      if (!destroyingIds.has(c.instanceId)) continue;
      if (next.length >= limit) break;
      next.push({
        id: newBurstId(),
        preset: isMultiplier(c.symbolType)
          ? 'MULTIPLIER_ENERGY'
          : isScatter(c.symbolType)
            ? 'SCATTER_PORTAL'
            : 'CRYSTAL_BREAK',
        x: c.column * (cell + REEL_GAP) + cell / 2,
        y: c.row * cell + cell / 2,
      });
    }
    if (next.length > 0) {
      setBursts((prev) => [...prev, ...next].slice(-MAX_ACTIVE_BURSTS));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destroyingIds]);

  return (
    <View style={styles.wrap}>
      <View style={[styles.board, { width: boardW }]}>
            <View style={styles.reels}>
              {columns.map((colCells, col) => {
                const colMax = colCells.reduce(
                  (m, c) => Math.max(m, dropping?.[c.instanceId] ?? 0),
                  0,
                );
                return (
                <View
                  key={`reel-${col}`}
                  style={[
                    styles.reel,
                    {
                      width: cell,
                      height: cell * GRID_ROWS,
                      marginRight: col === GRID_COLUMNS - 1 ? 0 : REEL_GAP,
                    },
                  ]}
                >
                  {colCells.map((cellData) => {
                    let visual: SymbolVisualState = 'normal';
                    if (destroyingIds?.has(cellData.instanceId)) visual = 'destroy';
                    else if (matchedIds?.has(cellData.instanceId)) visual = 'matched';
                    else if (anticipation && isScatter(cellData.symbolType)) {
                      visual = 'anticipation';
                    } else if (highlightActive) visual = 'dimmed';

                    const dist = dropping?.[cellData.instanceId] ?? 0;
                    return (
                      <ReelSymbol
                        key={cellData.instanceId}
                        cell={cellData}
                        size={cell}
                        visualState={visual}
                        dropDistanceCells={dist}
                        dropDurationMs={dusmeSuresiMs(
                          dist > 0 ? colMax : 0,
                          speedFactor,
                        )}
                        dropDelayMs={0}
                        performance={performance}
                      />
                    );
                  })}
                </View>
                );
              })}
              {bursts.map((b) => (
                <ParticleBurst
                  key={b.id}
                  preset={b.preset}
                  performance={performance}
                  x={b.x}
                  y={b.y}
                  onDone={() =>
                    setBursts((prev) => prev.filter((p) => p.id !== b.id))
                  }
                />
              ))}
            </View>
      </View>
    </View>
  );
}

export const GameBoard = memo(GameBoardInner);

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  board: {
    padding: BOARD_PAD,
  },
  reels: {
    flexDirection: 'row',
    alignItems: 'stretch',
    position: 'relative',
  },
  reel: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
});
