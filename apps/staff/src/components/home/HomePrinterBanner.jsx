import React from 'react';
import { Icon } from 'framework7-react';
import { useTranslation } from '../../services/useTranslation';
import useCommon from '../action/Common';

const HomePrinterBanner = ({ show, status, onRefresh }) => {
    const { t } = useTranslation();
    const { navigate } = useCommon();

    if (!show) return null;

    const message = !status.configured
        ? t('Printer not connected home message')
        : status.needsReconnect
            ? t('Printer reconnect home message')
            : status.paired
                ? t('Printer reconnect home message')
                : t('Printer not connected home message');

    const handleOpenSettings = () => {
        navigate('/printer-settings');
        onRefresh?.();
    };

    return (
        <button
            type="button"
            className="home-printer-banner"
            onClick={handleOpenSettings}
            aria-label={t('Open Printer Settings')}
        >
            <Icon f7="printer" className="home-printer-banner-icon" />
            <span className="home-printer-banner-copy">
                <span className="home-printer-banner-title">{t('Printer not connected')}</span>
                <span className="home-printer-banner-text">{message}</span>
            </span>
            <Icon f7="chevron_right" className="home-printer-banner-chevron" />
        </button>
    );
};

export default HomePrinterBanner;
