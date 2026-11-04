import { useEffect } from 'react';
import { warmUpPrinterConnection } from '../utils/printerConnection';

/**
 * Reconnect saved printer after login / refresh.
 * Wire this in app.jsx (not in shared user-data.jsx).
 */
export function usePrinterWarmUp(token, user) {
    useEffect(() => {
        if (!token || !user) return;
        void warmUpPrinterConnection();
    }, [token, user]);
}
