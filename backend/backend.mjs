// /* global Bare, BareKit */

import RPC from 'bare-rpc'
import { RPC_MESSAGE } from './rpc-commands.mjs'
import { sendApdu } from 'bare-addon'


const rpc = new RPC(BareKit.IPC, (req) => {
  switch (req.command) {
    case RPC_MESSAGE:
      console.log(req.data.toString()) // ping
      console.log(sendApdu)
      req.reply(Buffer.from('pong'))
      break;
    default:
      req.reply("Hello from Bare!");
  }
});