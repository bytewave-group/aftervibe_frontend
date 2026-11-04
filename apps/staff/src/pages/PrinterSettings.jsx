import React, { useState, useEffect, useCallback } from 'react';
import { Page, Button, Block, f7, Preloader, Icon } from 'framework7-react';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import Header from '../components/header';
import { useTranslation } from '../services/useTranslation';
import useCommon from '../components/action/Common';
import Printer from '../plugins/Printer';
import { PRINTER_PREFERENCES_KEY, RECEIPT_PAPER_58, RECEIPT_PAPER_80 } from '../constants/printerConfig';
import { ensureBluetoothPermission } from '../utils/bluetoothPermission';
import { clearReceiptLayoutCache } from '../utils/androidReceiptPrinter';
import { isWebPrintSupported, pairWebPrinter } from '../utils/webReceiptPrinter';
import {
    isPrinterStatusReady,
    restorePrinterConnection,
    warmUpPrinterConnection,
} from '../utils/printerConnection';
import { notifyPrinterConnectionChanged } from '../hooks/usePrinterConnectionStatus';
import Tools from '../components/tools';
import { getTestPrintText } from '../utils/tenantName';

const PrinterSettingsPage = () => {
    const { t, i18n } = useTranslation();
    const { navigate } = useCommon();
    const [mode, setMode] = useState('builtin');
    const [bluetoothDevice, setBluetoothDevice] = useState(null);
    const [printerIp, setPrinterIp] = useState('');
    const [printerPort, setPrinterPort] = useState('9100');
    const [devices, setDevices] = useState([]);
    const [loadingBonded, setLoadingBonded] = useState(false);
    const [printerStatus, setPrinterStatus] = useState({
        loading: true,
        connected: false,
        paired: false,
        needsReconnect: false,
        mode: 'builtin',
    });
    const [needsBtPermission, setNeedsBtPermission] = useState(false);
    const [pageReady, setPageReady] = useState(false);
    const [testPrinting, setTestPrinting] = useState(false);
    const [receiptPaper, setReceiptPaper] = useState(RECEIPT_PAPER_58);
    const [pairingPrinter, setPairingPrinter] = useState(false);
    const isAndroidNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
    const isWeb = !Capacitor.isNativePlatform();
    const webPrintAvailable = !isWeb || isWebPrintSupported();

    const isTestPrintReady =
        pageReady &&
        !testPrinting &&
        webPrintAvailable &&
        (isWeb
            ? mode === 'bluetooth' &&
            !!bluetoothDevice?.address &&
            !printerStatus.needsReconnect
            : mode === 'builtin' ||
            (mode === 'ethernet' && !!printerIp?.trim()) ||
            (!loadingBonded && !needsBtPermission && !!bluetoothDevice?.address));

    useEffect(() => {
        const handleLanguageChange = (event) => {
            i18n.changeLanguage(event.detail);
        };
        window.addEventListener('languageChanged', handleLanguageChange);
        return () => window.removeEventListener('languageChanged', handleLanguageChange);
    }, [i18n]);

    const syncNativeFromConfig = useCallback(async (cfg) => {
        if (!isAndroidNative) return;
        const bt = cfg.bluetoothDevice || {};
        await Printer.setPrinterConfig({
            mode: cfg.mode,
            bluetoothAddress: bt.address ?? '',
            bluetoothName: bt.name ?? '',
            usbDevicePath: cfg.usbDevicePath ?? '',
            printerIp: cfg.printerIp ?? '',
            printerPort: cfg.printerPort ?? '9100',
        });
    }, [isAndroidNative]);

    const isPrinterConfigured = useCallback((activeMode, activeBt, activeIp) => {
        if (isWeb) {
            return activeMode === 'bluetooth' && !!activeBt?.address;
        }
        if (activeMode === 'builtin') return true;
        if (activeMode === 'ethernet') return !!activeIp?.trim();
        return activeMode === 'bluetooth' && !!activeBt?.address;
    }, [isWeb]);

    const refreshConnectionStatus = useCallback(async (cfg) => {
        if (!isAndroidNative && !isWeb) return;

        const activeMode = cfg?.mode ?? mode;
        const activeBt = cfg?.bluetoothDevice ?? bluetoothDevice;
        const activeIp = cfg?.printerIp ?? printerIp;

        setPrinterStatus((prev) => ({ ...prev, loading: true, mode: activeMode }));

        try {
            if (!isPrinterConfigured(activeMode, activeBt, activeIp)) {
                setPrinterStatus({
                    loading: false,
                    connected: false,
                    paired: false,
                    needsReconnect: false,
                    mode: activeMode,
                });
                return;
            }

            let cfgToRestore = cfg;
            if (!cfgToRestore?.mode || (isWeb && !cfgToRestore?.webBle)) {
                const { value } = await Preferences.get({ key: PRINTER_PREFERENCES_KEY });
                if (value) {
                    try {
                        cfgToRestore = JSON.parse(value);
                    } catch {
                        // ignore
                    }
                }
            }

            const configured = isPrinterConfigured(activeMode, activeBt, activeIp);

            const result = await restorePrinterConnection(cfgToRestore);

            const paired = result.paired ?? configured;
            const connected = !!result.connected;
            const needsReconnect =
                result.needsReconnect ??
                (configured && !connected && (activeMode === 'bluetooth' || activeMode === 'ethernet'));
            setPrinterStatus({
                loading: false,
                connected,
                paired: !!paired,
                needsReconnect: !!needsReconnect,
                mode: result.mode ?? activeMode,
            });
        } catch (e) {
            console.error(e);
            const paired = isPrinterConfigured(activeMode, activeBt, activeIp);
            setPrinterStatus({
                loading: false,
                connected: false,
                paired,
                needsReconnect:
                    paired &&
                    (isWeb || (isAndroidNative && (activeMode === 'bluetooth' || activeMode === 'ethernet'))),
                mode: activeMode,
            });
        } finally {
            notifyPrinterConnectionChanged();
        }
    }, [isAndroidNative, isWeb, mode, bluetoothDevice, printerIp, isPrinterConfigured]);

    const loadBluetoothDevices = useCallback(async () => {
        if (!isAndroidNative && !isWeb) return;
        setLoadingBonded(true);
        setNeedsBtPermission(false);
        try {
            const result = await Printer.getBondedDevices();
            if (result.needsBluetoothPermission) {
                setDevices([]);
                setNeedsBtPermission(true);
            } else {
                setDevices(result.devices || []);
            }
        } catch (e) {
            console.error(e);
            setDevices([]);
        } finally {
            setLoadingBonded(false);
        }
    }, [isAndroidNative, isWeb]);

    const requestNearbyPermission = async () => {
        if (!isAndroidNative) return;
        const granted = await ensureBluetoothPermission();
        await loadBluetoothDevices();
        if (!granted) {
            f7.toast.show({
                text: t('Bluetooth permission required'),
                position: 'center',
                type: 'error',
                closeTimeout: 2500,
            });
        }
    };

    useEffect(() => {
        const load = async () => {
            try {
                if (isAndroidNative) {
                    await ensureBluetoothPermission();
                }
                const { value } = await Preferences.get({ key: PRINTER_PREFERENCES_KEY });
                if (value) {
                    const cfg = JSON.parse(value);
                    const loadedMode =
                        cfg.mode === 'bluetooth'
                            ? 'bluetooth'
                            : cfg.mode === 'ethernet'
                                ? 'ethernet'
                                : 'builtin';
                    setMode(isWeb && loadedMode !== 'bluetooth' ? 'bluetooth' : loadedMode);
                    setBluetoothDevice(cfg.bluetoothDevice || null);
                    setPrinterIp(cfg.printerIp || '');
                    setPrinterPort(cfg.printerPort || '9100');
                    setReceiptPaper(cfg.receiptPaper === RECEIPT_PAPER_80 ? RECEIPT_PAPER_80 : RECEIPT_PAPER_58);
                    await syncNativeFromConfig(cfg);
                } else {
                    setReceiptPaper(RECEIPT_PAPER_58);
                    const defaultCfg = {
                        mode: isWeb ? 'bluetooth' : 'builtin',
                        bluetoothDevice: null,
                        usbDevicePath: '',
                    };
                    if (isWeb) setMode('bluetooth');
                    await syncNativeFromConfig(defaultCfg);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setPageReady(true);
            }
        };
        load();
    }, [isAndroidNative, isWeb, syncNativeFromConfig]);

    useEffect(() => {
        if ((isAndroidNative || isWeb) && mode === 'bluetooth') {
            loadBluetoothDevices();
        }
    }, [isAndroidNative, isWeb, mode, loadBluetoothDevices]);

    useEffect(() => {
        if ((!isAndroidNative && !isWeb) || !pageReady) return;
        refreshConnectionStatus({ mode, bluetoothDevice, printerIp, printerPort });
    }, [isAndroidNative, isWeb, pageReady, mode, bluetoothDevice?.address, printerIp, refreshConnectionStatus]);

    const getTestPrintHint = () => {
        if (!pageReady) return t('Loading printer settings...');
        if (isWeb && !webPrintAvailable) return t('Web Bluetooth is not supported in this browser. Use Chrome or Edge over HTTPS.');
        if (isWeb && printerStatus.needsReconnect) {
            return t('Connect a Bluetooth printer above.');
        }
        if (testPrinting) return t('Printing test receipt...');
        if (mode === 'ethernet' && !printerIp?.trim()) {
            return t('Enter printer IP address.');
        }
        if (mode === 'bluetooth' && needsBtPermission) return t('Grant Nearby devices permission first.');
        if (mode === 'bluetooth' && loadingBonded) return t('Loading paired devices...');
        if (mode === 'bluetooth' && !bluetoothDevice?.address) {
            return isWeb ? t('Connect a Bluetooth printer above.') : t('Select a Bluetooth printer above.');
        }
        if (isTestPrintReady) return t('Print a sample receipt to confirm everything works.');
        return t('Printer not ready for test print.');
    };

    const handlePairWebPrinter = async () => {
        if (!isWeb || pairingPrinter) return;
        setPairingPrinter(true);
        try {
            const { device } = await pairWebPrinter();
            setBluetoothDevice(device);
            setMode('bluetooth');
            await persistConfig('bluetooth', device);
            f7.toast.show({
                text: t('Printer connected'),
                position: 'center',
                type: 'success',
                closeTimeout: 2000,
            });
        } catch (e) {
            console.error(e);
            if (e?.message !== 'User cancelled' && e?.name !== 'NotFoundError') {
                f7.toast.show({
                    text: e?.message || t('Print failed'),
                    position: 'center',
                    type: 'error',
                    closeTimeout: 2500,
                });
            }
        } finally {
            setPairingPrinter(false);
        }
    };

    const persistConfig = async (nextMode, nextBtDevice, nextPaper = receiptPaper, ipOverride, portOverride) => {
        const cfg = {
            mode: nextMode,
            bluetoothDevice: nextMode === 'bluetooth' ? nextBtDevice : null,
            usbDevicePath: '',
            printerIp: nextMode === 'ethernet' ? (ipOverride ?? printerIp) : '',
            printerPort: nextMode === 'ethernet' ? (portOverride ?? printerPort) : '9100',
            receiptPaper: nextPaper === RECEIPT_PAPER_80 ? RECEIPT_PAPER_80 : RECEIPT_PAPER_58,
        };
        await Preferences.set({ key: PRINTER_PREFERENCES_KEY, value: JSON.stringify(cfg) });
        clearReceiptLayoutCache();
        await syncNativeFromConfig(cfg);
        await refreshConnectionStatus(cfg);
    };

    const handleModeChange = async (nextMode) => {
        if (isWeb && nextMode !== 'bluetooth') {
            f7.toast.show({
                text: t('Built-in printer is only available on Android. Use Bluetooth on web.'),
                position: 'center',
                type: 'info',
                closeTimeout: 2500,
            });
            return;
        }
        setMode(nextMode);
        if (nextMode === 'builtin') {
            setBluetoothDevice(null);
            await persistConfig('builtin', null);
        } else if (nextMode === 'ethernet') {
            await persistConfig('ethernet', null);
        } else {
            if (isAndroidNative) {
                await ensureBluetoothPermission();
            }
            await persistConfig('bluetooth', bluetoothDevice);
        }
    };

    const handleReceiptPaperChange = async (nextPaper) => {
        setReceiptPaper(nextPaper);
        await persistConfig(mode, bluetoothDevice, nextPaper);
    };

    const handleSelectDevice = async (device) => {
        setBluetoothDevice(device);
        await persistConfig('bluetooth', device);
    };

    const handleTestPrint = async () => {
        if ((!isAndroidNative && !isWeb) || !isTestPrintReady) return;
        setTestPrinting(true);
        try {
            if (isAndroidNative) {
                const cfg = {
                    mode,
                    bluetoothDevice: mode === 'bluetooth' ? bluetoothDevice : null,
                    usbDevicePath: '',
                    printerIp: mode === 'ethernet' ? printerIp : '',
                    printerPort: mode === 'ethernet' ? printerPort : '9100',
                };
                await syncNativeFromConfig(cfg);
                if (mode === 'ethernet') {
                    await Preferences.set({
                        key: PRINTER_PREFERENCES_KEY,
                        value: JSON.stringify({
                            ...cfg,
                            receiptPaper: receiptPaper === RECEIPT_PAPER_80 ? RECEIPT_PAPER_80 : RECEIPT_PAPER_58,
                        }),
                    });
                }
                const connectResult = await Printer.connect();
                if (!connectResult.connected) {
                    throw new Error(connectResult.message || t('Printer not connected'));
                }
            }
            await Printer.printTest({ text: await getTestPrintText() });
            f7.toast.show({
                text: t('Test print sent'),
                position: 'center',
                type: 'success',
                closeTimeout: 2000,
            });
            await refreshConnectionStatus({ mode, bluetoothDevice, printerIp, printerPort });
        } catch (e) {
            console.error(e);
            f7.toast.show({
                text: e?.message || t('Print failed'),
                position: 'center',
                type: 'error',
                closeTimeout: 2500,
            });
        } finally {
            setTestPrinting(false);
        }
    };

    const isPrinterReady = isPrinterStatusReady(printerStatus);

    const statusBadgeClass = printerStatus.loading
        ? 'printer-settings-status-badge--loading'
        : isPrinterReady
            ? 'printer-settings-status-badge--connected'
            : 'printer-settings-status-badge--disconnected';

    const statusLabel = printerStatus.loading
        ? t('Checking connection...')
        : isPrinterReady
            ? isWeb
                ? t('Ready to print')
                : t('Connected')
            : printerStatus.paired && printerStatus.needsReconnect
                ? t('Tap Connect printer')
                : printerStatus.paired
                    ? t('Printer saved')
                    : t('Not connected');

    const statusModeLabel =
        printerStatus.mode === 'bluetooth'
            ? t('Bluetooth Printer')
            : printerStatus.mode === 'ethernet'
                ? t('IP Printer')
                : t('Built-in Printer');

    return (
        <Page className="printer-settings-page">
            <Header title={t('Printer Settings')} />
            <div className="content-panel">
                <div className="content">
                    <p className="printer-settings-lead">
                        {t('Printer Type')}
                    </p>

                    <div className="printer-settings-card">
                        <div className="printer-settings-mode-list">
                            {!isWeb && (
                                <label
                                    className={`printer-settings-mode-item ${mode === 'builtin' ? 'printer-settings-mode-item--active' : ''}`}
                                >
                                    <input
                                        type="radio"
                                        name="printer-mode"
                                        checked={mode === 'builtin'}
                                        onChange={() => handleModeChange('builtin')}
                                    />
                                    <span className="printer-settings-mode-icon-wrap" aria-hidden>
                                        <Icon f7="desktopcomputer" className="printer-settings-mode-icon" />
                                    </span>
                                    <span className="printer-settings-mode-copy">
                                        <span className="printer-settings-mode-title">{t('Built-in Printer')}</span>
                                    </span>
                                </label>
                            )}
                            <label
                                className={`printer-settings-mode-item ${mode === 'bluetooth' ? 'printer-settings-mode-item--active' : ''}`}
                            >
                                <input
                                    type="radio"
                                    name="printer-mode"
                                    checked={mode === 'bluetooth'}
                                    onChange={() => handleModeChange('bluetooth')}
                                />
                                <span className="printer-settings-mode-icon-wrap" aria-hidden>
                                    <Icon f7="antenna_radiowaves_left_right" className="printer-settings-mode-icon" />
                                </span>
                                <span className="printer-settings-mode-copy">
                                    <span className="printer-settings-mode-title">{t('Bluetooth Printer')}</span>
                                </span>
                            </label>
                            {!isWeb && (
                                <label
                                    className={`printer-settings-mode-item ${mode === 'ethernet' ? 'printer-settings-mode-item--active' : ''}`}
                                >
                                    <input
                                        type="radio"
                                        name="printer-mode"
                                        checked={mode === 'ethernet'}
                                        onChange={() => handleModeChange('ethernet')}
                                    />
                                    <span className="printer-settings-mode-icon-wrap" aria-hidden>
                                        <Icon f7="globe" className="printer-settings-mode-icon" />
                                    </span>
                                    <span className="printer-settings-mode-copy">
                                        <span className="printer-settings-mode-title">{t('IP Printer')}</span>
                                    </span>
                                </label>
                            )}
                        </div>
                    </div>

                    {mode === 'ethernet' && !isWeb && (
                        <>
                            <p className="printer-settings-lead">{t('Network printer')}</p>
                            <div className="printer-settings-card printer-settings-card--ethernet">
                                <div className="printer-settings-field">
                                    <label className="printer-settings-field-label" htmlFor="printer-ip">
                                        {t('Printer IP')}
                                    </label>
                                    <div className="form-input-container">
                                        <input
                                            id="printer-ip"
                                            className="form-input printer-settings-text-input"
                                            type="text"
                                            inputMode="decimal"
                                            autoComplete="off"
                                            autoCorrect="off"
                                            spellCheck={false}
                                            value={printerIp}
                                            placeholder="192.168.0.88"
                                            onChange={(e) => setPrinterIp(e.target.value)}
                                            onBlur={() => {
                                                if (mode === 'ethernet') {
                                                    void persistConfig('ethernet', null);
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="printer-settings-field">
                                    <label className="printer-settings-field-label" htmlFor="printer-port">
                                        {t('Port')}
                                    </label>
                                    <div className="form-input-container">
                                        <input
                                            id="printer-port"
                                            className="form-input printer-settings-text-input"
                                            type="number"
                                            inputMode="numeric"
                                            value={printerPort}
                                            placeholder="9100"
                                            onChange={(e) => setPrinterPort(e.target.value)}
                                            onBlur={() => {
                                                if (mode === 'ethernet') {
                                                    void persistConfig('ethernet', null);
                                                }
                                            }}
                                        />
                                    </div>
                                    <p className="printer-settings-field-hint">{t('Default port is 9100')}</p>
                                </div>
                            </div>
                        </>
                    )}

                    <p className="printer-settings-lead">{t('Receipt paper width')}</p>
                    <div className="printer-settings-card">
                        <div className="printer-settings-mode-list">
                            <label
                                className={`printer-settings-mode-item ${receiptPaper === RECEIPT_PAPER_58 ? 'printer-settings-mode-item--active' : ''}`}
                            >
                                <input
                                    type="radio"
                                    name="receipt-paper"
                                    checked={receiptPaper === RECEIPT_PAPER_58}
                                    onChange={() => handleReceiptPaperChange(RECEIPT_PAPER_58)}
                                />
                                <span className="printer-settings-mode-copy">
                                    <span className="printer-settings-mode-title">{t('58mm paper')}</span>
                                    <span className="printer-settings-mode-desc">{t('58mm paper hint')}</span>
                                </span>
                            </label>
                            <label
                                className={`printer-settings-mode-item ${receiptPaper === RECEIPT_PAPER_80 ? 'printer-settings-mode-item--active' : ''}`}
                            >
                                <input
                                    type="radio"
                                    name="receipt-paper"
                                    checked={receiptPaper === RECEIPT_PAPER_80}
                                    onChange={() => handleReceiptPaperChange(RECEIPT_PAPER_80)}
                                />
                                <span className="printer-settings-mode-copy">
                                    <span className="printer-settings-mode-title">{t('80mm paper')}</span>
                                    <span className="printer-settings-mode-desc">{t('80mm paper hint')}</span>
                                </span>
                            </label>
                        </div>
                    </div>

                    {(mode === 'bluetooth' || isWeb) && (
                        <div className="printer-settings-card printer-settings-card--devices">
                            <div className="printer-settings-card-head">
                                <span className="printer-settings-card-title">{t('Bluetooth Devices')}</span>
                            </div>
                            {isWeb && (
                                <div className="printer-settings-web-connect">
                                    <Button
                                        fill
                                        large
                                        className="printer-settings-connect-btn font-bold font-medium"
                                        disabled={pairingPrinter || !webPrintAvailable}
                                        onClick={handlePairWebPrinter}
                                    >
                                        {pairingPrinter ? (
                                            <span className="printer-settings-connect-btn-inner">
                                                <Preloader color="black" size={20} />
                                                <span>{t('Connecting...')}</span>
                                            </span>
                                        ) : (
                                            <span className="printer-settings-connect-btn-inner">
                                                <Icon f7="antenna_radiowaves_left_right" className="printer-settings-connect-btn-icon" />
                                                <span>{t('Connect Printer')}</span>
                                            </span>
                                        )}
                                    </Button>
                                </div>
                            )}
                            {loadingBonded && (
                                <div className="printer-settings-loading">
                                    <Preloader />
                                    <span>{t('Loading...')}</span>
                                </div>
                            )}
                            {needsBtPermission && (
                                <Block strong inset className="printer-settings-alert">
                                    <p className="printer-settings-alert-title">{t('Bluetooth permission required')}</p>
                                    <p className="printer-settings-alert-text">
                                        {t('Enable Nearby devices permission to list paired Bluetooth printers.')}
                                    </p>
                                    <Button fill className="printer-settings-alert-btn font-bold font-medium" onClick={requestNearbyPermission}>
                                        {t('Grant Permission')}
                                    </Button>
                                </Block>
                            )}
                            {!isWeb && !loadingBonded && !needsBtPermission && devices.length === 0 && (
                                <p className="printer-settings-empty">{t('No paired Bluetooth printers. Pair the printer in Android Settings first.')}</p>
                            )}
                            {isWeb && bluetoothDevice?.address && (
                                <div className="printer-settings-device-list">
                                    <div className="printer-settings-device-item printer-settings-device-item--active printer-settings-device-item--saved">
                                        <span className="printer-settings-device-body">
                                            <span className="printer-settings-device-name">
                                                {bluetoothDevice.name || t('My printer')}
                                            </span>
                                            <span className="printer-settings-device-mac">{t('Saved printer')}</span>
                                        </span>
                                        <Icon f7="checkmark_circle_fill" className="printer-settings-device-check" />
                                    </div>
                                </div>
                            )}
                            {!isWeb && (
                                <div className="printer-settings-device-list">
                                    {devices.map((d) => {
                                        const selected = bluetoothDevice?.address === d.address;
                                        return (
                                            <label
                                                key={d.address}
                                                className={`printer-settings-device-item ${selected ? 'printer-settings-device-item--active' : ''}`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="bt-printer"
                                                    checked={selected}
                                                    onChange={() => handleSelectDevice(d)}
                                                />
                                                <span className="printer-settings-device-body">
                                                    <span className="printer-settings-device-name">{d.name || d.address}</span>
                                                    <span className="printer-settings-device-mac">{d.address}</span>
                                                </span>
                                                {selected ? (
                                                    <Icon f7="checkmark_circle_fill" className="printer-settings-device-check" />
                                                ) : null}
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="printer-settings-card printer-settings-card--actions">
                        <div className="printer-settings-card-head printer-settings-card-head--compact">
                            <span className="printer-settings-card-title">{t('Verify printing')}</span>
                        </div>

                        <div className={`printer-settings-status-badge ${statusBadgeClass}`} role="status" aria-live="polite">
                            {printerStatus.loading ? (
                                <Preloader size={20} />
                            ) : (
                                <Icon
                                    f7={isPrinterReady ? 'checkmark_circle_fill' : 'xmark_circle_fill'}
                                    className="printer-settings-status-badge-icon"
                                />
                            )}
                            <span className="printer-settings-status-badge-copy">
                                <span className="printer-settings-status-badge-label">{statusLabel}</span>
                                <span className="printer-settings-status-badge-mode">{statusModeLabel}</span>
                            </span>
                        </div>

                        <p className="printer-settings-hint">{getTestPrintHint()}</p>

                        <Button
                            fill
                            large
                            className="printer-settings-btn-test font-bold font-medium"
                            disabled={!isTestPrintReady}
                            onClick={handleTestPrint}
                        >
                            {testPrinting ? (
                                <>
                                    <Preloader color="black" size={20} />
                                    <span>{t('Printing...')}</span>
                                </>
                            ) : (
                                <>
                                    <Icon f7="printer" className="printer-settings-btn-icon" />
                                    <span>{t('Test Print')}</span>
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
            <Tools />
        </Page>
    );
};

export default PrinterSettingsPage;
