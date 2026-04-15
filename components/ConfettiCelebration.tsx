import React, { useEffect, useRef } from 'react';
import { View, Animated, Dimensions, StyleSheet } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CONFETTI_COUNT = 40;
const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#FF6B35'];
const SHAPES = ['●', '■', '▲', '★', '♦', '◆'];

interface ConfettiPiece {
  x: Animated.Value;
  y: Animated.Value;
  rotation: Animated.Value;
  scale: Animated.Value;
  opacity: Animated.Value;
  color: string;
  shape: string;
  size: number;
}

interface Props {
  visible: boolean;
  onDone?: () => void;
}

export function ConfettiCelebration({ visible, onDone }: Props) {
  const pieces = useRef<ConfettiPiece[]>([]);

  if (pieces.current.length === 0) {
    pieces.current = Array.from({ length: CONFETTI_COUNT }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      rotation: new Animated.Value(0),
      scale: new Animated.Value(0),
      opacity: new Animated.Value(1),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      size: 10 + Math.random() * 12,
    }));
  }

  useEffect(() => {
    if (!visible) return;

    const animations = pieces.current.map((p) => {
      const startX = SCREEN_W * 0.3 + Math.random() * SCREEN_W * 0.4;
      const endX = startX + (Math.random() - 0.5) * SCREEN_W * 0.8;
      const duration = 1800 + Math.random() * 1200;

      p.x.setValue(startX);
      p.y.setValue(-20);
      p.rotation.setValue(0);
      p.scale.setValue(0);
      p.opacity.setValue(1);

      return Animated.parallel([
        Animated.timing(p.y, {
          toValue: SCREEN_H + 40,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(p.x, {
          toValue: endX,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(p.rotation, {
          toValue: 3 + Math.random() * 5,
          duration,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(p.scale, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(p.scale, {
            toValue: 0.6 + Math.random() * 0.4,
            duration: duration - 200,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(p.opacity, {
          toValue: 0,
          duration,
          delay: duration * 0.6,
          useNativeDriver: true,
        }),
      ]);
    });

    const staggered = animations.map((anim, i) =>
      Animated.sequence([
        Animated.delay(i * 40),
        anim,
      ])
    );

    Animated.parallel(staggered).start(() => {
      onDone?.();
    });
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.current.map((p, i) => (
        <Animated.Text
          key={i}
          style={[
            styles.piece,
            {
              fontSize: p.size,
              color: p.color,
              transform: [
                { translateX: p.x },
                { translateY: p.y },
                { rotate: p.rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
                { scale: p.scale },
              ],
              opacity: p.opacity,
            },
          ]}
        >
          {p.shape}
        </Animated.Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  piece: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
