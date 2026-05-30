import { View, TouchableOpacity, Text, Dimensions } from 'react-native';

interface CustomizeOverlayProps {
  onBigger: () => void;
  onSmaller: () => void;
  onUp: () => void;
  onDown: () => void;
  onLeft: () => void;
  onRight: () => void;
  onChangePhoto: () => void;
  onRemove: () => void;
  photoSize: number;
}

const screenWidth = Dimensions.get('window').width;

export function CustomizeOverlay({
  onBigger,
  onSmaller,
  onUp,
  onDown,
  onLeft,
  onRight,
  onChangePhoto,
  onRemove,
  photoSize,
}: CustomizeOverlayProps) {
  const buttonSize = (screenWidth - 32) / 4;

  const Button = ({ label, onPress }: { label: string; onPress: () => void }) => (
    <TouchableOpacity
      onPress={onPress}
      className="bg-primary rounded-lg items-center justify-center p-2"
      style={{ width: buttonSize - 4, height: buttonSize - 4 }}
    >
      <Text className="text-dark font-bold text-xs text-center">{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View className="bg-dark border-t border-primary p-4">
      {/* Size controls */}
      <View className="flex-row gap-2 mb-3">
        <Button label="➕ Bigger" onPress={onBigger} />
        <Button label="➖ Smaller" onPress={onSmaller} />
        <Button label="🔄 Change" onPress={onChangePhoto} />
        <Button label="✕ Remove" onPress={onRemove} />
      </View>

      {/* Position controls */}
      <View className="flex-row gap-2">
        <Button label="↑ Up" onPress={onUp} />
        <Button label="↓ Down" onPress={onDown} />
        <Button label="← Left" onPress={onLeft} />
        <Button label="→ Right" onPress={onRight} />
      </View>

      <Text className="text-textMuted text-xs mt-2">Size: {photoSize}px</Text>
    </View>
  );
}
