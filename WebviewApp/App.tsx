import React, { useRef, useEffect, useState } from 'react';
import {
  StatusBar,
  StyleSheet,
  useColorScheme,
  SafeAreaView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { getDeviceInfo, DeviceInfoType } from './deviceInfo';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const webviewRef = useRef<WebView>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfoType | null>(null);

  useEffect(() => {
    (async () => {
      const info = await getDeviceInfo();
      setDeviceInfo(info);
    })();
  }, []);

  const sendDeviceInfo = () => {
    if (!deviceInfo) return;
    const message = JSON.stringify(deviceInfo);
    webviewRef.current?.postMessage(message);
    console.log('[APP] 디바이스 정보 전송됨:', message);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <WebView
        ref={webviewRef}
        source={{ uri: 'https://ZetiContents-dashboard.com' }}
        onLoadEnd={sendDeviceInfo}
        javaScriptEnabled={true}
        originWhitelist={['*']}
        startInLoadingState={true}
        style={styles.container}
      />
    </SafeAreaView>
  );
}

export default App;
