import { useState, useEffect } from 'react';
import {
    getTenantName,
    loadTenantNameFromStorage,
    setCachedTenantName,
} from '../utils/tenantName';

export function useTenantName(globalData) {
    const [tenantName, setTenantName] = useState(() => getTenantName(globalData));

    useEffect(() => {
        if (globalData?.tenant_name) {
            const name = getTenantName(globalData);
            setTenantName(name);
            setCachedTenantName(name);
            return;
        }
        loadTenantNameFromStorage().then(setTenantName);
    }, [globalData?.tenant_name]);

    return tenantName;
}
