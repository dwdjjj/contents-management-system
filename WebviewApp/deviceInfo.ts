import { Platform, Dimensions } from 'react-native';
import DeviceInfo from 'react-native-device-info';

export interface DeviceInfoType {
  chipset: string;
  memory: number;
  resolution: string;
}

const getIOSMemoryByModel = (model: string): number => {
  const memoryMap: Record<string, number> = {
    'iPhone13,2': 4, // iPhone 12
    'iPhone13,4': 6, // iPhone 12 Pro Max
    'iPhone14,2': 6, // iPhone 13 Pro
    'iPhone14,5': 4, // iPhone 13
    'iPhone15,2': 6, // iPhone 14 Pro
    'iPhone15,5': 6, // iPhone 14
    'iPhone16,1': 8, // iPhone 15 Pro
    // ...필요한 만큼 추가
  };

  return memoryMap[model] || 4; // 기본값 fallback
};

export const getDeviceInfo = async (): Promise<DeviceInfoType> => {
  const { height, width } = Dimensions.get('screen');
  const resolution = `${Math.max(height, width)}x${Math.min(height, width)}`;

  if (Platform.OS === 'android') {
    const totalMemoryBytes = await DeviceInfo.getTotalMemory();
    const memory = Math.round(totalMemoryBytes / (1024 * 1024 * 1024)); // GB
    const chipset = DeviceInfo.getSystemName(); // 제조사 커스텀 이름 사용 가능

    return {
      chipset: chipset || 'android-generic',
      memory,
      resolution,
    };
  }

  if (Platform.OS === 'ios') {
    const model = DeviceInfo.getDeviceId(); // ex) "iPhone14,5"
    const memory = getIOSMemoryByModel(model);
    return {
      chipset: 'apple-generic',
      memory,
      resolution,
    };
  }

  return {
    chipset: 'unknown',
    memory: 0,
    resolution,
  };
};
