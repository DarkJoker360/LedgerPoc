import React, { useState } from 'react'
import type {PropsWithChildren} from 'react';
import {
  Alert,
  Button,
  useColorScheme,
  View,
  Text,
  TextInput,
  FlatList,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet
} from 'react-native'
import Clipboard from '@react-native-clipboard/clipboard'
import { Worklet } from 'react-native-bare-kit'
import bundle from './app.bundle'
import RPC from 'bare-rpc'
import b4a from 'b4a'
import { RPC_RESET, RPC_MESSAGE } from '../rpc-commands.mjs'
import {
  Colors,
} from 'react-native/Libraries/NewAppScreen';
import { NativeModules } from 'react-native';
import { Buffer } from 'buffer';
//import bare-addon from 'bare-addon'

const { UsbHandler } = NativeModules;

type SectionProps = PropsWithChildren<{
  title: string;
}>;

/*type PasswordEntry = {
  username: string
  password: string
  website: string
}

export default function App() {
  const [dataList, setDataList] = useState<PasswordEntry[]>([])
  const [pairingInvite, setPairingInvite] = useState('') // State for pairing invite
  const [isWorkletStarted, setIsWorkletStarted] = useState(false) // State to track worklet status

  const startWorklet = () => {
    const worklet = new Worklet()

    // Correctly passing the args to worklet.start
    worklet.start('/app.bundle', bundle, [Platform.OS, pairingInvite])
    const { IPC } = worklet
    // Initialise RPC
    new RPC(IPC, (req) => {
      // Handle incoming RPC requests

      if (req.command === RPC_MESSAGE) {
        const data = b4a.toString(req.data)
        const parsedData = JSON.parse(data) // Assuming data is a JSON string
        const entry: PasswordEntry = {
          username: parsedData[1],
          password: parsedData[2],
          website: parsedData[3]
        }
        // Update the dataList with the received entry
        setDataList((prevDataList) => [...prevDataList, entry])
      }

      if (req.command === RPC_RESET) {
        setDataList(() => [])
      }
    })

    setIsWorkletStarted(true) // Mark worklet as started
  }

  const copyToClipboard = (item: PasswordEntry) => {
    Clipboard.setString(item.password) // Copy password to clipboard
    Alert.alert('Copied to Clipboard', item.password)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Autopass-example 🍐</Text>
      {!isWorkletStarted ? ( // Show input if worklet hasn't started
        <>
          <TextInput
            style={styles.input}
            placeholder='Enter Pairing Invite'
            value={pairingInvite}
            onChangeText={setPairingInvite}
          />
          <Button title='Submit' onPress={startWorklet} color='#b0d943' />
        </>
      ) : (
        <FlatList
          data={dataList}
          keyExtractor={(_, index) => index.toString()}
          renderItem={({ item }) => (
            <View style={styles.dataItem}>
              <Text style={styles.itemText}>Username: {item.username}</Text>
              <Text style={styles.itemText}>Password: {item.password}</Text>
              <Text style={styles.itemText}>Website: {item.website}</Text>
              <Button
                title='Copy Password'
                onPress={() => copyToClipboard(item)}
                color='#b0d943'
              />
            </View>
          )}
        />
      )}
    </View>
  )
}*/

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

export default function App() {
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  const safePadding = '25%';

  const [isWorkletStarted, setIsWorkletStarted] = useState(false) // State to track worklet status

  const startWorklet = () => {
    const worklet = new Worklet()

    // Correctly passing the args to worklet.start
    worklet.start('/app.bundle', bundle, [Platform.OS, pairingInvite])
    const { IPC } = worklet
    // Initialise RPC
    new RPC(IPC, (req) => {
      // Handle incoming RPC requests

      if (req.command === RPC_MESSAGE) {
        const data = b4a.toString(req.data)
        const parsedData = JSON.parse(data) // Assuming data is a JSON string
        /*const entry: PasswordEntry = {
          username: parsedData[1],
          password: parsedData[2],
          website: parsedData[3]
        }
        // Update the dataList with the received entry
        setDataList((prevDataList) => [...prevDataList, entry])*/
      }

      if (req.command === RPC_RESET) {
        setDataList(() => [])
      }
    })

    setIsWorkletStarted(true)
  }

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
                Alert.alert('ADPU response:', responseBuffer.toString());
                break;
        case 3: 
                const adpuGetAddressCommand = await UsbHandler.sendApduCommand(getEthereumGetAddressApdu());
                const responseAddress = Buffer.from(adpuGetAddressCommand, 'base64'); 
                Alert.alert('ADPU response (Address):', responseAddress.toString());
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
        <Button title="Get Version (ADPU)" onPress={() => handleUsb(2)} />
        <Button title="Get ETH Address (ADPU)" onPress={() => handleUsb(3)} />
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