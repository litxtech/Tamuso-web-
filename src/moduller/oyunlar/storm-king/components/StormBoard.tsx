import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { StormSymbol } from './StormSymbol';
import type { SymbolData } from '../types';

type Props = {
  symbols: readonly SymbolData[];
  cell: number;
  pops: Record<number, number>;
};

export const StormBoard = memo(function StormBoard({ symbols, cell, pops }: Props) {
  return (
    <View style={[styles.board, { width: cell * 6, height: cell * 5 }]}>
      {symbols.map((symbol) => (
        <StormSymbol
          key={`${symbol.col}-${symbol.row}`}
          symbol={symbol}
          cell={cell}
          pop={pops[symbol.uid]}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  board: {
    overflow: 'hidden',
    backgroundColor: 'rgba(10,4,20,0.35)',
  },
});
