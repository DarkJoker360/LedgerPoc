/**
 * @format
 */

import {AppRegistry} from 'react-native';
import { NativeModules } from 'react-native';
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);

/*const { UsbHandler } = NativeModules;

console.log(NativeModules);

export default {
  detect: () => UsbHandler.detect(),
  connect: () => UsbHandler.connect(),
  hasPermission: () => UsbHandler.hasPermission(),
  getFileDescriptor: () => UsbHandler.getFileDescriptor(),
  getDevice: () => UsbHandler.getDevice(),
  getManager: () => UsbHandler.getManager(),
};*/
