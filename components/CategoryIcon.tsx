import React from 'react';
import { Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/** Detecta se o string é emoji ou nome de ícone Ionicons */
function isEmoji(str: string): boolean {
  // Emoji começa com character > 255 ou contém caracteres especiais de emoji
  return /[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{FE00}-\u{FEFF}]|[\u{1F900}-\u{1F9FF}]/u.test(str);
}

interface CategoryIconProps {
  icon: string;
  size?: number;
  color?: string;
}

export function CategoryIcon({ icon, size = 16, color = '#666' }: CategoryIconProps) {
  if (isEmoji(icon)) {
    return <Text style={{ fontSize: size }}>{icon}</Text>;
  }
  // É nome de Ionicons
  return <Ionicons name={icon as any} size={size} color={color} />;
}
