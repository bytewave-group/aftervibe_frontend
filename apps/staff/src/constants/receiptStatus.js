/** create_order_ktv / buyout / product */
export const ORDER_STATUS = {
    PENDING: 1,
    COMPLETED: 2,
    CANCELLED: 3,
};

/** create_buy_flower / claim_flower / return_flower */
export const FLOWER_RECORD_STATUS = {
    PENDING: 1,
    CONFIRM: 2,
    CANCELLED: 3,
};

/** create_hand_over_account */
export const HAND_OVER_STATUS = {
    PENDING: 1,
    APPROVED: 2,
    REJECTED: 3,
};

export const RECEIPT_STATUS_KIND = {
    ORDER: 'order',
    FLOWER_RECORD: 'flowerRecord',
    HAND_OVER: 'handOver',
};

export function getStatusCodeFromApi(apiData) {
    if (apiData == null || typeof apiData !== 'object') {
        return null;
    }
    const nested = apiData.record && typeof apiData.record === 'object' ? apiData.record : null;
    const raw = apiData.status ?? nested?.status;
    if (raw == null || raw === '') {
        return null;
    }
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
}

/**
 * Map API status code to English receipt label (no i18n).
 * @param {number|null|undefined} statusCode - 1 | 2 | 3
 * @param {'order'|'flowerRecord'|'handOver'} kind
 * @param {{ payLater?: boolean }} [options] - used when statusCode missing (new create)
 */
export function formatReceiptStatus(statusCode, kind, options = {}) {
    let code = statusCode;
    if (code == null || code === '') {
        if (kind === RECEIPT_STATUS_KIND.HAND_OVER) {
            code = HAND_OVER_STATUS.PENDING;
        } else {
            code = options.payLater ? 1 : 2;
        }
    } else {
        code = Number(code);
    }

    switch (kind) {
        case RECEIPT_STATUS_KIND.ORDER:
            if (code === ORDER_STATUS.COMPLETED) return 'Completed';
            if (code === ORDER_STATUS.CANCELLED) return 'Cancelled';
            return 'Pending';
        case RECEIPT_STATUS_KIND.FLOWER_RECORD:
            if (code === FLOWER_RECORD_STATUS.CONFIRM) return 'Confirm';
            if (code === FLOWER_RECORD_STATUS.CANCELLED) return 'Cancelled';
            return 'Pending';
        case RECEIPT_STATUS_KIND.HAND_OVER:
            if (code === HAND_OVER_STATUS.APPROVED) return 'Approved';
            if (code === HAND_OVER_STATUS.REJECTED) return 'Rejected';
            return 'Pending';
        default:
            return 'Pending';
    }
}

export function resolveReceiptStatusLabel(apiData, kind, options = {}) {
    return formatReceiptStatus(getStatusCodeFromApi(apiData), kind, options);
}
