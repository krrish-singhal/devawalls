import { View, TouchableOpacity, Text, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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

  const Button = ({ label, icon, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) => (
    <TouchableOpacity
      onPress={onPress}
      className="bg-primary rounded-lg items-center justify-center p-2"
      style={{ width: buttonSize - 4, height: buttonSize - 4 }}
    >
      <Ionicons name={icon} size={20} color="#0F0F0F" style={{ marginBottom: 4 }} />
      <Text className="text-dark font-bold text-[10px] text-center">{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View className="bg-dark border-t border-primary p-4">
      {/* Size controls */}
      <View className="flex-row gap-2 mb-3">
        <Button label="Bigger" icon="add" onPress={onBigger} />
        <Button label="Smaller" icon="remove" onPress={onSmaller} />
        <Button label="Change" icon="refresh" onPress={onChangePhoto} />
        <Button label="Remove" icon="close" onPress={onRemove} />
      </View>

      {/* Position controls */}
      <View className="flex-row gap-2">
        <Button label="Up" icon="arrow-up" onPress={onUp} />
        <Button label="Down" icon="arrow-down" onPress={onDown} />
        <Button label="Left" icon="arrow-back" onPress={onLeft} />
        <Button label="Right" icon="arrow-forward" onPress={onRight} />
      </View>

      <Text className="text-textMuted text-xs mt-2 text-center font-semibold">Size: {photoSize}px</Text>
    </View>
  );
}
