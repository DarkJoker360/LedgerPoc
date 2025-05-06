import { useRef, useState, useEffect } from "react";
import { Worklet } from "react-native-bare-kit";
import { Asset } from "expo-asset";
import RPC from "bare-rpc";

const DEFAULT_CALLBACK = () => {};

type WorkletProps = {
  callback?: (req: any) => void;
};

const useWorklet = ({
  callback = DEFAULT_CALLBACK,
}: WorkletProps): [RPC | undefined, boolean] => {
  const worklet = new Worklet();

  const rpcRef = useRef<RPC | undefined>(undefined);

  const [rpcReady, setRPCReady] = useState(false);

  useEffect(() => {
    const bareBundle = require("../backend/backend.bundle");
    Asset.loadAsync([bareBundle]).then(([asset]) => {
      if (asset.localUri) {
        worklet.start(asset.localUri);
        if (!rpcRef.current) {
          rpcRef.current = new RPC(worklet.IPC, callback);
          setRPCReady(true);
        }
      } else {
        console.error("Failed to load asset: localUri is null");
      }
    });
  }, []);

  return [rpcRef.current, rpcReady];
};

export default useWorklet;
