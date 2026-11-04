import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import Printer from '../plugins/Printer';
import { PRINTER_PREFERENCES_KEY, RECEIPT_PAPER_58, RECEIPT_PAPER_80 } from '../constants/printerConfig';
import { ensureBluetoothPermission } from '../utils/bluetoothPermission';
import { isWebPrintSupported, printReceiptWeb } from '../utils/webReceiptPrinter';
import {
    loadTenantNameFromStorage,
    resolveReceiptShopName,
    setReceiptShopName,
} from './tenantName';

/** English-only labels for printed receipts (no i18n). */
export const RECEIPT_LABELS = {
    Item: 'Item',
    Qty: 'Qty',
    Amount: 'Amount',
    Service: 'Service',
    TOTAL: 'TOTAL',
    Payment: 'Payment',
    'Pay Later': 'Pay Later',
    'Handle Fee': 'Handle Fee',
    'ORDER CONFIRMATION': 'ORDER CONFIRMATION',
    'Order ID': 'Order ID',
    Date: 'Date',
    Status: 'Status',
    'Payment Method': 'Payment Method',
    'Confirmation slip disclaimer':
        'This receipt is for confirmation only and not a tax invoice.',
    'THANK YOU': 'THANK YOU',
    Order: 'Order',
    CONFIRMED: 'CONFIRMED',
    'This is NOT an official receipt': 'This is NOT an official receipt',
    'Final receipt issued after payment': 'Final receipt issued after payment',
};

export function receiptLabel(key) {
    return RECEIPT_LABELS[key] ?? key;
}

/** @deprecated Use resolveReceiptLayout().paperWidth */
export const RECEIPT_WIDTH = 32;

const PAPER_CHARS = {
    [RECEIPT_PAPER_58]: 32,
    [RECEIPT_PAPER_80]: 48,
};

/** Single-line rule of dashes or equals, exactly `width` characters. */
function separatorLine(ch, width) {
    const c = String(ch || '-').charAt(0);
    const n = Math.max(1, Math.round(Number(width) || 28));
    return c.repeat(n);
}

/**
 * Shift every line right so the receipt block sits in the middle of the paper.
 * Text stays left-aligned inside the block (not text-align: center).
 */
export function normalizeReceiptText(text, layout) {
    const paperWidth = Math.max(1, Math.round(Number(layout?.paperWidth ?? layout?.width) || 28));
    const contentWidth = Math.max(1, Math.round(Number(layout?.width) || paperWidth));
    const marginLeft = Math.max(
        0,
        layout?.marginLeft ?? Math.floor((paperWidth - contentWidth) / 2)
    );
    const pad = ' '.repeat(marginLeft);

    return String(text ?? '')
        .split('\n')
        .map((line) => {
            const trimmed = line.replace(/\r$/, '').trimEnd();
            if (!trimmed) return '';
            let inner;
            if (/^[-=]+$/.test(trimmed)) {
                // Full paper width — no side margin so rules reach both edges
                return separatorLine(trimmed.charAt(0), paperWidth);
            }
            inner = trimmed.length <= contentWidth ? trimmed : trimmed.slice(0, contentWidth);
            return pad + inner;
        })
        .join('\n');
}

export function charsForPaperSize(paperSize) {
    return PAPER_CHARS[paperSize] ?? PAPER_CHARS[RECEIPT_PAPER_58];
}

function padEnd(str, len) {
    const s = String(str ?? '');
    if (s.length >= len) return s.slice(0, len);
    return s + ' '.repeat(len - s.length);
}

function padStart(str, len) {
    const s = String(str ?? '');
    if (s.length >= len) return s.slice(-len);
    return ' '.repeat(len - s.length) + s;
}

/** Word-wrap; never splits words unless a single word exceeds line width. */
function wrapByWords(text, maxWidth) {
    const words = String(text ?? '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return [];

    const lines = [];
    let current = '';

    words.forEach((word) => {
        if (word.length > maxWidth) {
            if (current) {
                lines.push(current);
                current = '';
            }
            for (let i = 0; i < word.length; i += maxWidth) {
                lines.push(word.slice(i, i + maxWidth));
            }
            return;
        }
        const next = current ? `${current} ${word}` : word;
        if (next.length <= maxWidth) {
            current = next;
        } else {
            if (current) lines.push(current);
            current = word;
        }
    });
    if (current) lines.push(current);
    return lines;
}

function centerLine(text, width) {
    const s = String(text ?? '').trim();
    if (!s) return '';
    if (s.length >= width) return s.slice(0, width);
    const left = Math.floor((width - s.length) / 2);
    return ' '.repeat(left) + s;
}

function wrapCenter(text, width) {
    return wrapByWords(text, width).map((line) => centerLine(line, width));
}

/**
 * Dynamic layout for thermal paper (58mm ≈ 32 chars, 80mm ≈ 48 chars).
 * Content is built in a narrower column, then shifted to sit centered on the paper.
 */
export function createReceiptLayout(charsPerLine = 28) {
    const paperWidth = Math.max(20, Math.min(48, Math.round(Number(charsPerLine) || 28)));
    const sideGutter = paperWidth >= 40 ? 4 : 2;
    const contentWidth = Math.max(16, paperWidth - sideGutter * 2);
    const marginLeft = Math.floor((paperWidth - contentWidth) / 2);
    const width = contentWidth;

    /** Fits "RM 999999.99" without clipping. */
    const amountCol = Math.max(11, Math.min(14, Math.floor(width * 0.4)));
    const qtyCol = 4;
    const itemCol = Math.max(10, width - qtyCol - amountCol);
    const serviceCol = Math.max(8, width - amountCol);
    const useStackedItems = width < 20;

    const formatTableAmount = (amount) => `RM ${formatMoney(amount)}`;

    /** Rules span the full printable width; text uses the narrower content column. */
    const sep = (ch = '-') => separatorLine(ch, paperWidth);

    const labelRow = (label, value) => {
        const val = String(value ?? '');
        const head = `${String(label ?? '').trim()}: `;
        if (head.length + val.length <= width) {
            return [`${head}${val}`];
        }
        const valLines = wrapByWords(val, Math.max(8, width - head.length));
        const indent = ' '.repeat(head.length);
        const out = [`${head}${valLines[0] ?? ''}`];
        valLines.slice(1).forEach((ln) => out.push(`${indent}${ln}`));
        return out;
    };

    const plainLine = (text) => {
        const s = String(text ?? '').trim();
        return s ? [s] : [];
    };

    const tableHeader = () => {
        if (useStackedItems) {
            return [];
        }
        return [
            `${padEnd(receiptLabel('Item'), itemCol)}${padStart(receiptLabel('Qty'), qtyCol)}${padStart(receiptLabel('Amount'), amountCol)}`,
        ];
    };

    const tableRow = (name, qty, total) => {
        const qtyStr = qty === '' || qty == null ? '' : String(qty);
        const money = formatTableAmount(total);
        const itemName = String(name ?? '').trim();

        if (useStackedItems) {
            const rows = [itemName.length <= width ? itemName : itemName.slice(0, width - 1) + '…'];
            const detail = `  Qty: ${qtyStr}  ${money}`;
            rows.push(detail.length <= width ? detail : detail.slice(0, width));
            return rows;
        }

        if (itemName.length <= itemCol) {
            return [
                `${padEnd(itemName, itemCol)}${padStart(qtyStr, qtyCol)}${padStart(money, amountCol)}`,
            ];
        }
        const nameLines = wrapByWords(itemName, itemCol);
        const rows = [
            `${padEnd(nameLines[0] ?? '', itemCol)}${padStart(qtyStr, qtyCol)}${padStart(money, amountCol)}`,
        ];
        nameLines.slice(1).forEach((ln) => {
            const display = ln.length <= itemCol ? ln : ln.slice(0, itemCol);
            rows.push(`${padEnd(display, itemCol)}${padStart('', qtyCol)}${padStart('', amountCol)}`);
        });
        return rows;
    };

    const serviceTableHeader = () => [
        `${padEnd(receiptLabel('Service'), serviceCol)}${padStart(receiptLabel('Amount'), amountCol)}`,
    ];

    const twoColTableRow = (name, amount) => {
        const label = String(name ?? '').trim();
        const money = formatTableAmount(amount);
        if (!label) {
            return [`${padEnd('', serviceCol)}${padStart(money, amountCol)}`];
        }
        if (label.length <= serviceCol) {
            return [`${padEnd(label, serviceCol)}${padStart(money, amountCol)}`];
        }
        const nameLines = wrapByWords(label, serviceCol);
        const rows = [
            `${padEnd(nameLines[0] ?? '', serviceCol)}${padStart(money, amountCol)}`,
        ];
        nameLines.slice(1).forEach((ln) => {
            const line = ln.length <= width ? ln : ln.slice(0, width);
            rows.push(line);
        });
        return rows;
    };

    const serviceTableRow = twoColTableRow;

    const totalRow = (total) => {
        const money = formatTableAmount(total);
        if (useStackedItems) {
            return [`${receiptLabel('TOTAL')}: ${money}`];
        }
        return [`${padEnd(receiptLabel('TOTAL'), itemCol)}${padStart('', qtyCol)}${padStart(money, amountCol)}`];
    };

    const amountTableHeader = (nameKey = 'Item') => [
        `${padEnd(receiptLabel(nameKey), serviceCol)}${padStart(receiptLabel('Amount'), amountCol)}`,
    ];

    const amountTotalRow = (total) => [
        `${padEnd(receiptLabel('TOTAL'), serviceCol)}${padStart(formatTableAmount(total), amountCol)}`,
    ];

    const appendItemTable = (lines, items, total) => {
        const headerLines = tableHeader();
        if (headerLines.length) {
            lines.push(sep('-'));
            headerLines.forEach((ln) => lines.push(ln));
            lines.push(sep('-'));
            items.forEach((item) => {
                tableRow(item.name, item.qty ?? 1, item.total ?? item.amount ?? 0).forEach((ln) =>
                    lines.push(ln)
                );
            });
            lines.push(sep('-'));
            totalRow(total).forEach((ln) => lines.push(ln));
        } else {
            items.forEach((item) => {
                tableRow(item.name, item.qty ?? 1, item.total ?? item.amount ?? 0).forEach((ln) =>
                    lines.push(ln)
                );
            });
            lines.push(`${receiptLabel('TOTAL')}: ${formatTableAmount(total)}`);
        }
    };

    /** Item + Amount only (no Qty column). */
    const appendAmountTable = (lines, items, total, nameKey = 'Item') => {
        lines.push(sep('-'));
        amountTableHeader(nameKey).forEach((ln) => lines.push(ln));
        lines.push(sep('-'));
        items.forEach((item) => {
            twoColTableRow(item.name, item.total ?? item.amount ?? 0).forEach((ln) => lines.push(ln));
        });
        lines.push(sep('-'));
        amountTotalRow(total).forEach((ln) => lines.push(ln));
    };

    return {
        width,
        paperWidth,
        contentWidth,
        marginLeft,
        useStackedItems,
        sep,
        center: (text) => centerLine(text, width),
        wrapCenter: (text) => wrapCenter(text, width),
        wrap: (text) => wrapByWords(text, width),
        plainLine,
        labelRow,
        tableHeader,
        tableRow,
        serviceTableHeader,
        serviceTableRow,
        totalRow,
        appendItemTable,
        appendAmountTable,
    };
}

let cachedLayout = null;
let cachedLayoutKey = '';

export async function resolveReceiptLayout() {
    try {
        const { value } = await Preferences.get({ key: PRINTER_PREFERENCES_KEY });
        const cfg = value ? JSON.parse(value) : {};
        const paper = cfg.receiptPaper || RECEIPT_PAPER_58;
        const key = String(paper);
        if (cachedLayout && cachedLayoutKey === key) {
            return cachedLayout;
        }
        cachedLayout = createReceiptLayout(charsForPaperSize(paper));
        cachedLayoutKey = key;
        return cachedLayout;
    } catch {
        return createReceiptLayout(charsForPaperSize(RECEIPT_PAPER_58));
    }
}

export function clearReceiptLayoutCache() {
    cachedLayout = null;
    cachedLayoutKey = '';
}

function formatMoney(amount) {
    return (Number(amount) || 0).toFixed(2);
}

export function formatReceiptDate(date = new Date()) {
    const dt = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(dt.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()}  ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

/** ISO-style date for confirmation slips: 2026-05-15 17:40 */
export function formatConfirmationSlipDate(date = new Date()) {
    const dt = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(dt.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

export function formatSlipOrderId(ref, prefix = '') {
    if (ref == null || ref === '') return null;
    const s = String(ref);
    if (!prefix) return s;
    return s.startsWith(prefix) ? s : `${prefix}${s}`;
}

export function apiOrderRef(apiData) {
    if (apiData == null || typeof apiData !== 'object') {
        return null;
    }
    const nested = apiData.record && typeof apiData.record === 'object' ? apiData.record : null;
    const ref = apiData.id
        ?? apiData.record_id
        ?? apiData.order_id
        ?? apiData.buy_flower_id
        ?? apiData.transaction_id
        ?? apiData.claim_flower_id
        ?? apiData.return_flower_id
        ?? apiData.hand_over_id
        ?? apiData.hand_over_account_id
        ?? nested?.id;
    if (ref === '' || ref == null) {
        return null;
    }
    return ref;
}

export function buildPaymentRows({ payLater, payments, handleFee, paymentMethodsFromGlobal }) {
    if (payLater) {
        return [{ label: receiptLabel('Payment'), value: receiptLabel('Pay Later'), payLater: true }];
    }
    const rows = [];
    if (payments?.length) {
        payments.forEach((p) => {
            const pm = paymentMethodsFromGlobal?.find((m) => m.id === p.payment_method_id);
            const label = pm?.name ?? p.name ?? `#${p.payment_method_id}`;
            rows.push({ label, value: `RM ${formatMoney(p.amount)}` });
        });
        const fee = Number(handleFee) || 0;
        if (fee > 0) {
            rows.push({ label: receiptLabel('Handle Fee'), value: `RM ${formatMoney(fee)}` });
        }
    }
    return rows;
}

/**
 * Confirmation slip (order / claim / return flower) — label rows, service + amount, payment block.
 */
export function buildConfirmationSlipReceipt({
    shopName,
    serviceName,
    orderId = null,
    orderIdPrefix = '',
    date = new Date(),
    status = null,
    partyRows = [],
    amount = 0,
    items = [],
    paymentRows = [],
    payLater = false,
    layout = null,
}) {
    const L = layout ?? createReceiptLayout(32);
    const lines = [];
    const shop = resolveReceiptShopName(shopName);
    const ref = formatSlipOrderId(orderId, orderIdPrefix);
    const statusText = status != null && status !== '' ? status : null;

    lines.push(L.sep('='));
    lines.push(L.center(shop));
    lines.push(L.sep('='));
    lines.push(L.center(receiptLabel('ORDER CONFIRMATION')));
    lines.push(L.sep('-'));

    if (ref != null) {
        L.labelRow(receiptLabel('Order ID'), ref).forEach((ln) => lines.push(ln));
    }
    const dateStr = formatConfirmationSlipDate(date);
    if (dateStr) {
        L.labelRow(receiptLabel('Date'), dateStr).forEach((ln) => lines.push(ln));
    }

    const parties = partyRows.filter((r) => r?.label && r?.value != null && r.value !== '');
    if (parties.length) {
        lines.push('');
        parties.forEach(({ label, value }) => {
            L.labelRow(label, value).forEach((ln) => lines.push(ln));
        });
    }

    if (statusText) {
        L.labelRow(receiptLabel('Status'), statusText).forEach((ln) => lines.push(ln));
    }

    const lineItems = items.filter((item) => item?.name != null && item.name !== '');
    if (lineItems.length) {
        L.appendItemTable(lines, lineItems, amount);
    } else if (serviceName) {
        lines.push(L.sep('-'));
        L.serviceTableHeader().forEach((ln) => lines.push(ln));
        lines.push(L.sep('-'));
        L.serviceTableRow(serviceName, amount).forEach((ln) => lines.push(ln));
        lines.push(L.sep('-'));
    }

    L.plainLine(receiptLabel('Payment Method')).forEach((ln) => lines.push(ln));
    const isPayLaterOnly =
        payLater &&
        paymentRows.length === 1 &&
        (paymentRows[0].payLater || paymentRows[0].value === receiptLabel('Pay Later'));
    if (isPayLaterOnly) {
        L.plainLine(receiptLabel('Pay Later')).forEach((ln) => lines.push(ln));
    } else if (paymentRows.length) {
        paymentRows.forEach(({ label, value }) => {
            L.labelRow(label, value).forEach((ln) => lines.push(ln));
        });
    } else if (payLater) {
        L.plainLine(receiptLabel('Pay Later')).forEach((ln) => lines.push(ln));
    }

    lines.push(L.sep('='));
    L.wrap(receiptLabel('Confirmation slip disclaimer')).forEach((ln) => lines.push(ln));
    lines.push(L.sep('='));
    lines.push(L.center(receiptLabel('THANK YOU')));
    lines.push(L.sep('='));

    return lines.join('\n') + '\n\n';
}

export function buildPosReceipt({
    shopName,
    title = null,
    subtitle = null,
    orderId = null,
    date = new Date(),
    metaRows = [],
    items = [],
    total = 0,
    status = null,
    paymentRows = [],
    receiptType = 'confirmation',
    hideQty = false,
    layout = null,
}) {
    const L = layout ?? createReceiptLayout(32);
    const lines = [];
    const shop = resolveReceiptShopName(shopName);
    const isConfirmation = receiptType === 'confirmation';

    lines.push(L.sep('='));
    lines.push(L.center(shop));
    lines.push(L.sep('='));
    if (title) {
        lines.push(L.center(title));
        if (subtitle) {
            L.wrap(subtitle).forEach((ln) => lines.push(ln));
        }
        lines.push(L.sep('-'));
    } else if (subtitle) {
        L.wrap(subtitle).forEach((ln) => lines.push(ln));
        lines.push(L.sep('-'));
    } else {
        lines.push(L.sep('-'));
    }

    if (orderId != null && orderId !== '') {
        L.labelRow(receiptLabel('Order ID'), orderId).forEach((ln) => lines.push(ln));
    }
    const dateStr = formatReceiptDate(date);
    if (dateStr) {
        L.labelRow(receiptLabel('Date'), dateStr).forEach((ln) => lines.push(ln));
    }

    metaRows.forEach(({ label, value }) => {
        if (label && value != null && value !== '') {
            L.labelRow(label, value).forEach((ln) => lines.push(ln));
        }
    });

    const statusText =
        status != null && status !== ''
            ? status
            : !hideQty && receiptType !== 'payment'
              ? receiptLabel('CONFIRMED')
              : null;
    if (statusText) {
        L.labelRow(receiptLabel('Status'), statusText).forEach((ln) => lines.push(ln));
    }

    const lineItems = items.length ? items : [{ name: receiptLabel('Order'), qty: 1, total }];
    if (hideQty) {
        L.appendAmountTable(lines, lineItems, total);
    } else {
        L.appendItemTable(lines, lineItems, total);
    }

    paymentRows.forEach(({ label, value }) => {
        L.labelRow(label, value).forEach((ln) => lines.push(ln));
    });

    if (isConfirmation) {
        lines.push(L.sep('-'));
        L.wrap(receiptLabel('This is NOT an official receipt')).forEach((ln) => lines.push(ln));
        L.wrap(receiptLabel('Final receipt issued after payment')).forEach((ln) => lines.push(ln));
    }

    lines.push(L.sep('-'));
    lines.push(L.center(receiptLabel('THANK YOU')));
    lines.push(L.sep('='));

    return lines.join('\n') + '\n\n';
}

/** Build receipt with paper width from printer settings, then print. */
export async function printPosReceipt(buildFn) {
    const layout = await resolveReceiptLayout();
    setReceiptShopName(await loadTenantNameFromStorage());
    try {
        const text = normalizeReceiptText(buildFn(layout), layout);
        await printReceiptAndroid(text);
    } finally {
        setReceiptShopName(null);
    }
}

export async function printReceiptAndroid(text) {
    if (!text) return;

    const isAndroidNative =
        Capacitor.isNativePlatform() &&
        Capacitor.getPlatform() === 'android';

    if (!isAndroidNative) {
        if (!isWebPrintSupported()) {
            console.warn('Web Bluetooth printing is not supported in this browser.');
            return;
        }
        try {
            await printReceiptWeb(text);
        } catch (e) {
            console.warn('Receipt print failed', e);
        }
        return;
    }

    try {
        const ok = await ensureBluetoothPermission();
        if (!ok) {
            console.warn('Bluetooth permission denied');
            return;
        }

        const { value } = await Preferences.get({ key: PRINTER_PREFERENCES_KEY });
        const cfg = value ? JSON.parse(value) : { mode: 'builtin' };
        const bt = cfg.bluetoothDevice || {};

        await Printer.setPrinterConfig({
            mode: cfg.mode,
            bluetoothAddress: bt.address ?? cfg.bluetoothAddress ?? '',
            bluetoothName: bt.name ?? cfg.bluetoothName ?? '',
            usbDevicePath: cfg.usbDevicePath ?? '',
            printerIp: cfg.printerIp ?? '',
            printerPort: cfg.printerPort ?? '9100',
        });

        await Printer.printText({ text });
    } catch (e) {
        console.warn('Receipt print failed', e);
    }
}

