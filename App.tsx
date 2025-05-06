/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import type {PropsWithChildren} from 'react';
import {
  Alert,
  Button,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

import {
  Colors,
} from 'react-native/Libraries/NewAppScreen';

import { NativeModules } from 'react-native';

import { Buffer } from 'buffer';

type SectionProps = PropsWithChildren<{
  title: string;
}>;

const { UsbHandler } = NativeModules;

console.log("Checking native modules");
console.log(NativeModules);
console.log("End checking native modules"); 

function Section({children, title}: SectionProps): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <View style={styles.sectionContainer}>
      <Text
        style={[
          styles.sectionTitle,
          {
            color: isDarkMode ? Colors.white : Colors.black,
          },
        ]}>
        {title}
      </Text>
      <Text
        style={[
          styles.sectionDescription,
          {
            color: isDarkMode ? Colors.light : Colors.dark,
          },
        ]}>
        {children}
      </Text>
    </View>
  );
}

function getEthereumGetAddressApdu(): string {
  const cla = 0xE0;
  const ins = 0x02;
  const p1 = 0x01;
  const p2 = 0x00;

  const bip44Path = [
    44 | 0x80000000,
    60 | 0x80000000,
    0 | 0x80000000,
    0,
    0,
  ];

  const data = Buffer.alloc(1 + bip44Path.length * 4);
  data.writeUInt8(bip44Path.length, 0);

  bip44Path.forEach((element, index) => {
    data.writeUInt32BE(element >>> 0, 1 + index * 4);
  });

  const lc = data.length;
  const header = Buffer.from([cla, ins, p1, p2, lc]);
  const apdu = Buffer.concat([header, data]);

  return apdu.toString('base64');
}

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  const safePadding = '25%';

  const handleUsb = async (mode: number) => {
    try {
      const found = await UsbHandler.detect();
      if (!found) {
        Alert.alert('No device found');
        return;
      }
      const permission = await UsbHandler.hasPermission();
      await UsbHandler.connect();
      
      switch (mode) {
        case 1: 
                const fd = await UsbHandler.getFileDescriptor();
                if (fd.toInt() < 0) {
                  Alert.alert('Error getting file descriptor, connection error.');
                } else {
                  Alert.alert('File Descriptor', fd.toString());
                }
                break;
        case 2: 
                const apduCommand = Buffer.from([0xB0, 0x01, 0x00, 0x00, 0x00]); // get version
                const base64Command = apduCommand.toString('base64');
                const responseBase64 = await UsbHandler.sendApduCommand(base64Command);
                const responseBuffer = Buffer.from(responseBase64, 'base64'); 
                Alert.alert('APDU response:', responseBuffer.toString());
                break;
        case 3: 
                const apduGetAddressCommand = await UsbHandler.sendApduCommand(getEthereumGetAddressApdu());
                const responseAddress = Buffer.from(apduGetAddressCommand, 'base64'); 
                Alert.alert('APDU response (Address):', responseAddress.toString());
                break;
      }
    } catch (e: any) {
      Alert.alert('USB Error', e.message || 'Unexpected error');
    }
  }

  return (
    <View style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <ScrollView
        style={backgroundStyle}>
        <View
          style={{
            backgroundColor: isDarkMode ? Colors.black : Colors.white,
            paddingHorizontal: safePadding,
            paddingBottom: safePadding,
          }}>
        </View>
      </ScrollView>
      <Section title="Ledger PoC">
        Click the button below and check alert and logs
        <Button title="Get Version (apdu)" onPress={() => handleUsb(2)} />
        <Button title="Get ETH Address (apdu)" onPress={() => handleUsb(3)} />
        <Button title="Get File Descriptor" onPress={() => handleUsb(1)} />
      </Section>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
});

export default App;
