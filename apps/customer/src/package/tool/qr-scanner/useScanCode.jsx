import { Capacitor } from "@capacitor/core";
import useScanCodeBrowser from "./useScanCodeBrowser";
import useScanCodeCapacitor from "./useScanCodeCapacitor";

export default function useScanCode(options = {}) {
  //? Auto-detect platform
  const isNative = Capacitor.isNativePlatform();
  const isBrowser = !isNative;

  let adapter;

  if (isBrowser) {
    adapter = useScanCodeBrowser(options);
  } else {
    adapter = useScanCodeCapacitor();
  }

  //? Unified public interface
  const start = async function () {
    try {
      var res = await adapter.scanStart();
      return res;
    } catch (err) {
      return { status: false, error: (err && err.message) || "Scan failed" };
    }
  };

  const stop = async function () {
    if (adapter.scanStop) {
      await adapter.scanStop();
    }
  };

  return {
    scanStart: start,
    scanStop: stop,
    qrScannerId: adapter.qrScannerId, //? Browser has value, Capacitor undefined
  };
}
