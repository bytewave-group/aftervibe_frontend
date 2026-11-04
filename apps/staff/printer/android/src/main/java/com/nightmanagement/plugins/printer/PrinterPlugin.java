package com.nightmanagement.plugins.printer;

import android.Manifest;
import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.content.Context;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import net.posprinter.IConnectListener;
import net.posprinter.IDeviceConnection;
import net.posprinter.POSConnect;
import net.posprinter.POSConst;
import net.posprinter.POSPrinter;

@CapacitorPlugin(
    name = "Printer",
    permissions = {
        @Permission(
            alias = "bluetooth",
            strings = {
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.BLUETOOTH_SCAN,
            }
        ),
        @Permission(
            alias = "location",
            strings = { Manifest.permission.ACCESS_FINE_LOCATION }
        ),
    }
)
public class PrinterPlugin extends Plugin {

    private static final long CONNECT_TIMEOUT_SEC = 15;

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private String mode = "builtin";
    private String bluetoothAddress = "";
    private String bluetoothName = "";
    private String usbDevicePath = "";
    private String printerIp = "";
    private String printerPort = "9100";

    private IDeviceConnection currentConnection;
    private volatile boolean connected;
    private volatile String lastConnectMessage = "";

    @Override
    public void load() {
        super.load();
        POSConnect.init(getContext().getApplicationContext());
    }

    @PluginMethod
    public void setPrinterConfig(PluginCall call) {
        String inputMode = call.getString("mode", "builtin");

        String nextMode;
        if ("bluetooth".equalsIgnoreCase(inputMode)) {
            nextMode = "bluetooth";
        } else if ("ethernet".equalsIgnoreCase(inputMode)) {
            nextMode = "ethernet";
        } else {
            nextMode = "builtin";
        }
        String nextAddress = call.getString("bluetoothAddress", "");
        String nextName = call.getString("bluetoothName", "");
        String nextUsb = call.getString("usbDevicePath", "");
        String nextIp = call.getString("printerIp", "");
        String nextPort = call.getString("printerPort", "9100");

        boolean configChanged =
            !mode.equals(nextMode) ||
            !bluetoothAddress.equals(nextAddress) ||
            !bluetoothName.equals(nextName) ||
            !usbDevicePath.equals(nextUsb) ||
            !printerIp.equals(nextIp) ||
            !printerPort.equals(nextPort);

        mode = nextMode;
        bluetoothAddress = nextAddress;
        bluetoothName = nextName;
        usbDevicePath = nextUsb;
        printerIp = nextIp;
        printerPort = nextPort;

        if (configChanged) {
            closeConnection();
        }
        call.resolve();
    }

    @PluginMethod
    public void getPrinterConfig(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("mode", mode);
        ret.put("bluetoothAddress", bluetoothAddress);
        ret.put("bluetoothName", bluetoothName);
        ret.put("usbDevicePath", usbDevicePath);
        ret.put("printerIp", printerIp);
        ret.put("printerPort", printerPort);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestBluetoothPermission(PluginCall call) {
        if (hasBluetoothPermissions()) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            requestPermissionForAlias("bluetooth", call, "permissionCallback");
        } else {
            requestPermissionForAlias("location", call, "permissionCallback");
        }
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        if (hasBluetoothPermissions()) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
        } else {
            call.reject("Nearby devices / Bluetooth permission not granted");
        }
    }

    @PluginMethod
    public void getBondedDevices(PluginCall call) {
        if (!hasBluetoothPermissions()) {
            JSObject ret = new JSObject();
            ret.put("devices", new JSArray());
            ret.put("needsBluetoothPermission", true);
            call.resolve(ret);
            return;
        }

        executor.execute(() -> {
            try {
                JSArray devices = new JSArray();
                BluetoothAdapter adapter = getBluetoothAdapter();
                if (adapter != null) {
                    Set<BluetoothDevice> bonded = adapter.getBondedDevices();
                    if (bonded != null) {
                        for (BluetoothDevice device : bonded) {
                            JSObject item = new JSObject();
                            String name = device.getName();
                            item.put("name", name != null ? name : "");
                            item.put("address", device.getAddress());
                            devices.put(item);
                        }
                    }
                }
                JSObject ret = new JSObject();
                ret.put("devices", devices);
                ret.put("needsBluetoothPermission", false);
                resolveOnMain(call, ret);
            } catch (Exception e) {
                rejectOnMain(call, e.getMessage() != null ? e.getMessage() : "Failed to list devices");
            }
        });
    }

    @PluginMethod
    public void connect(PluginCall call) {
        executor.execute(() -> {
            try {
                boolean ok = ensureConnected();
                JSObject ret = new JSObject();
                ret.put("connected", ok);
                ret.put("message", ok ? "Connected" : getConnectErrorMessage());
                resolveOnMain(call, ret);
            } catch (Exception e) {
                JSObject ret = new JSObject();
                ret.put("connected", false);
                ret.put("message", e.getMessage() != null ? e.getMessage() : "Connect failed");
                resolveOnMain(call, ret);
            }
        });
    }

    @PluginMethod
    public void getConnectionStatus(PluginCall call) {
        boolean configured = isPrinterConfigured();
        boolean isLive = currentConnection != null && currentConnection.isConnect();
        if (isLive) {
            connected = true;
        }
        JSObject ret = new JSObject();
        ret.put("mode", mode);
        ret.put("connected", isLive);
        ret.put("paired", configured);
        ret.put("needsReconnect", configured && !isLive && ("bluetooth".equals(mode) || "ethernet".equals(mode)));
        ret.put("configured", configured);
        call.resolve(ret);
    }

    private boolean isPrinterConfigured() {
        if ("bluetooth".equals(mode)) {
            return bluetoothAddress != null && !bluetoothAddress.trim().isEmpty();
        }
        if ("ethernet".equals(mode)) {
            return printerIp != null && !printerIp.trim().isEmpty();
        }
        return true;
    }

    @PluginMethod
    public void printTest(PluginCall call) {
        executor.execute(() -> {
            try {
                if (!ensureConnected()) {
                    rejectOnMain(call, getConnectErrorMessage());
                    return;
                }
                String text = call.getString("text");
                if (text == null || text.isEmpty()) {
                    text = "Test Print\n";
                }
                POSPrinter printer = new POSPrinter(currentConnection);
                printer
                    .initializePrinter()
                    .printText(
                        text,
                        POSConst.ALIGNMENT_CENTER,
                        POSConst.FNT_DEFAULT,
                        POSConst.TXT_1WIDTH
                    )
                    .feedLine(3)
                    .cutHalfAndFeed(1);
                resolveOnMain(call, new JSObject());
            } catch (Exception e) {
                rejectOnMain(call, e.getMessage() != null ? e.getMessage() : "Print failed");
            }
        });
    }

    @PluginMethod
    public void printText(PluginCall call) {
        String text = call.getString("text", "");
        if (text.isEmpty()) {
            call.reject("text is required");
            return;
        }

        executor.execute(() -> {
            try {
                if (!ensureConnected()) {
                    rejectOnMain(call, getConnectErrorMessage());
                    return;
                }
                POSPrinter printer = new POSPrinter(currentConnection);
                printer.initializePrinter();
                String[] lines = text.split("\n", -1);
                for (String line : lines) {
                    if (line.isEmpty()) {
                        printer.feedLine(1);
                    } else {
                        printer.printText(
                            line + "\n",
                            POSConst.ALIGNMENT_LEFT,
                            POSConst.FNT_DEFAULT,
                            POSConst.TXT_1WIDTH
                        );
                    }
                }
                printer.feedLine(3).cutHalfAndFeed(1);
                resolveOnMain(call, new JSObject());
            } catch (Exception e) {
                rejectOnMain(call, e.getMessage() != null ? e.getMessage() : "Print failed");
            }
        });
    }

    private boolean hasBluetoothPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return getPermissionState("bluetooth") == PermissionState.GRANTED;
        }
        return getPermissionState("location") == PermissionState.GRANTED;
    }

    @SuppressLint("MissingPermission")
    private BluetoothAdapter getBluetoothAdapter() {
        Context context = getContext();
        BluetoothManager manager = (BluetoothManager) context.getSystemService(Context.BLUETOOTH_SERVICE);
        if (manager != null) {
            return manager.getAdapter();
        }
        return BluetoothAdapter.getDefaultAdapter();
    }

    private boolean ensureConnected() throws Exception {
        if (currentConnection != null && currentConnection.isConnect()) {
            connected = true;
            return true;
        }
        return connectForCurrentMode();
    }

    private boolean connectForCurrentMode() throws Exception {
        if ("bluetooth".equals(mode)) {
            if (!hasBluetoothPermissions()) {
                throw new Exception("Bluetooth permission required");
            }
            if (bluetoothAddress == null || bluetoothAddress.trim().isEmpty()) {
                throw new Exception("No Bluetooth printer selected");
            }
            return connectBluetooth(bluetoothAddress.trim());
        }

        if ("ethernet".equals(mode)) {
            if (printerIp == null || printerIp.trim().isEmpty()) {
                throw new Exception("No printer IP configured");
            }
            return connectEthernet(printerIp.trim());
        }

        return connectBuiltin();
    }

    private boolean connectBuiltin() throws Exception {
        String path = usbDevicePath != null ? usbDevicePath.trim() : "";
        if (path.isEmpty()) {
            List<String> usbDevices = POSConnect.getUsbDevices(getActivity());
            if (usbDevices != null && !usbDevices.isEmpty()) {
                path = usbDevices.get(0);
            } else {
                throw new Exception("No built-in / USB printer found");
            }
        }
        closeConnection();
        currentConnection = POSConnect.createDevice(POSConnect.DEVICE_TYPE_USB);
        return connectWithLatch(currentConnection, path);
    }

    private boolean connectBluetooth(String mac) throws Exception {
        closeConnection();
        currentConnection = POSConnect.createDevice(POSConnect.DEVICE_TYPE_BLUETOOTH);
        return connectWithLatch(currentConnection, mac);
    }

    private boolean connectEthernet(String ip) throws Exception {
        closeConnection();
        currentConnection = POSConnect.createDevice(POSConnect.DEVICE_TYPE_ETHERNET);
        return connectWithLatch(currentConnection, ip);
    }

    private boolean connectWithLatch(IDeviceConnection connection, String address) throws InterruptedException {
        lastConnectMessage = "";
        CountDownLatch latch = new CountDownLatch(1);
        AtomicInteger lastCode = new AtomicInteger(POSConnect.CONNECT_FAIL);
        IConnectListener listener = newConnectLatchListener(latch, lastCode);
        connection.connect(address, listener);
        boolean finished = latch.await(CONNECT_TIMEOUT_SEC, TimeUnit.SECONDS);
        connected = finished && lastCode.get() == POSConnect.CONNECT_SUCCESS;
        if (!connected) {
            if (!finished) {
                lastConnectMessage = "Connection timed out";
            } else if (lastConnectMessage == null || lastConnectMessage.trim().isEmpty()) {
                lastConnectMessage = "Connect failed";
            }
        }
        return connected;
    }

    private String getConnectErrorMessage() {
        if (lastConnectMessage != null && !lastConnectMessage.trim().isEmpty()) {
            return lastConnectMessage.trim();
        }
        return "Printer not connected";
    }

    private IConnectListener newConnectLatchListener(CountDownLatch latch, AtomicInteger lastCode) {
        return (code, connInfo, msg) -> {
            lastCode.set(code);
            if (msg != null && !msg.trim().isEmpty()) {
                lastConnectMessage = msg.trim();
            }
            if (
                code == POSConnect.CONNECT_SUCCESS ||
                code == POSConnect.CONNECT_FAIL ||
                code == POSConnect.CONNECT_INTERRUPT
            ) {
                latch.countDown();
            }
        };
    }

    private void closeConnection() {
        connected = false;
        if (currentConnection != null) {
            try {
                currentConnection.close();
            } catch (Exception ignored) {
                // ignore
            }
            currentConnection = null;
        }
    }

    private void resolveOnMain(PluginCall call, JSObject data) {
        mainHandler.post(() -> call.resolve(data));
    }

    private void rejectOnMain(PluginCall call, String message) {
        mainHandler.post(() -> call.reject(message));
    }

    @Override
    protected void handleOnDestroy() {
        closeConnection();
        executor.shutdownNow();
        super.handleOnDestroy();
    }
}
