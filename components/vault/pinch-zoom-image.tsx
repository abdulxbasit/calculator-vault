import React, { useEffect } from 'react';
import { StyleSheet, Dimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  clamp,
  runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PinchZoomImageProps {
  uri: string;
  zoomLevel: number;
  onZoomChange?: (newZoom: number) => void;
  onSingleTap?: () => void;
  onPinchStart?: () => void;
}

export const PinchZoomImage: React.FC<PinchZoomImageProps> = ({
  uri,
  zoomLevel,
  onZoomChange,
  onSingleTap,
  onPinchStart,
}) => {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const notifyZoomChange = (val: number) => {
    if (onZoomChange) {
      onZoomChange(val);
    }
  };

  const handleSingleTap = () => {
    if (onSingleTap) {
      onSingleTap();
    }
  };

  const handlePinchStart = () => {
    if (onPinchStart) {
      onPinchStart();
    }
  };

  // Sync with header control buttons (+ / - / Reset)
  useEffect(() => {
    scale.value = withTiming(zoomLevel, { duration: 200 });
    savedScale.value = zoomLevel;
    if (zoomLevel === 1) {
      translateX.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(0, { duration: 200 });
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    }
  }, [zoomLevel, scale, savedScale, translateX, translateY, savedTranslateX, savedTranslateY]);

  // Ultra-Smooth 60FPS Native Pinch Gesture
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      'worklet';
      if (onPinchStart) {
        runOnJS(handlePinchStart)();
      }
    })
    .onUpdate((event) => {
      'worklet';
      scale.value = clamp(savedScale.value * event.scale, 1.0, 5.0);
    })
    .onEnd(() => {
      'worklet';
      if (scale.value <= 1.05) {
        scale.value = withTiming(1.0, { duration: 200 });
        savedScale.value = 1.0;
        translateX.value = withTiming(0, { duration: 200 });
        translateY.value = withTiming(0, { duration: 200 });
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        runOnJS(notifyZoomChange)(1.0);
      } else {
        savedScale.value = scale.value;
        runOnJS(notifyZoomChange)(scale.value);
      }
    });

  // Pan gesture for dragging picture around when zoomed in
  const panGesture = Gesture.Pan()
    .manualActivation(true)
    .onTouchesMove((_, state) => {
      'worklet';
      if (scale.value > 1.05) {
        state.activate();
      } else {
        state.fail();
      }
    })
    .onUpdate((event) => {
      'worklet';
      if (scale.value > 1.05) {
        const maxTx = (SCREEN_WIDTH * (scale.value - 1)) / 2;
        const maxTy = (SCREEN_HEIGHT * (scale.value - 1)) / 2;

        translateX.value = clamp(savedTranslateX.value + event.translationX, -maxTx, maxTx);
        translateY.value = clamp(savedTranslateY.value + event.translationY, -maxTy, maxTy);
      }
    })
    .onEnd(() => {
      'worklet';
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // Double-tap gesture (toggle 1.0x <-> 2.5x)
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      'worklet';
      if (scale.value > 1.2) {
        scale.value = withTiming(1.0, { duration: 200 });
        savedScale.value = 1.0;
        translateX.value = withTiming(0, { duration: 200 });
        translateY.value = withTiming(0, { duration: 200 });
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        runOnJS(notifyZoomChange)(1.0);
      } else {
        scale.value = withTiming(2.5, { duration: 200 });
        savedScale.value = 2.5;
        runOnJS(notifyZoomChange)(2.5);
      }
    });

  // Single-tap gesture (toggle full-screen controls)
  const singleTapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      'worklet';
      runOnJS(handleSingleTap)();
    });

  const tapGestures = Gesture.Exclusive(doubleTapGesture, singleTapGesture);
  const pinchPanGestures = Gesture.Simultaneous(pinchGesture, panGesture);
  const composedGesture = Gesture.Race(tapGestures, pinchPanGestures);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <View style={styles.wrapper}>
          <Animated.Image
            source={{ uri }}
            style={[styles.image, animatedStyle]}
            resizeMode="contain"
          />
        </View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wrapper: {
    width: SCREEN_WIDTH,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
});
