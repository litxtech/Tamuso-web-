import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BlogBlokOkuyucu } from './BlogBlokOkuyucu';

export function BlogSonYazilar() {
  return (
    <View style={styles.sar}>
      <BlogBlokOkuyucu baslik="Son yazılar" bosGizle />
    </View>
  );
}

const styles = StyleSheet.create({
  sar: { paddingHorizontal: 22, marginTop: 20 },
});
