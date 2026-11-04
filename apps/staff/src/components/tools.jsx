import React, { useEffect, useState } from "react";
import { Button, Icon } from "framework7-react";
import useCommon from './action/Common';
import { useTranslation } from "../services/useTranslation";

const Tools = ({ type, active = false, data = {}, onToastClose, onConfirm, onCancel, children }) => {
    const { navigate } = useCommon();
    const { t } = useTranslation();
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        setIsActive(active);
    }, [active]);

    const handleToastClose = () => {
        if (data?.path && data.path !== "") {
            navigate(data.path);
        }
        if (onToastClose) {
            onToastClose();
        }
    };

    const handleConfirm = () => {
        if (onConfirm) {
            onConfirm();
        } else {
            handleToastClose();
        }
    };

    const handleCancel = () => {
        if (onCancel) {
            onCancel();
        } else {
            handleToastClose();
        }
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            handleToastClose();
        }
    };

    const hasConfirmCancel = onConfirm || onCancel;

    if (type === "toast") {
        return (
            <div
                className={`toast-container ${isActive ? "active" : ""}`}
                onClick={(e) => handleBackdropClick(e)}
            >
                <div className="toast-content" onClick={(e) => e.stopPropagation()}>
                    {data?.title && data.title !== "" && (
                        <div className="toast-header">
                            <div className="toast-title font-large font-bold">{data.title}</div>
                            {hasConfirmCancel && (data?.showCloseButton !== false) && (
                                <div className="toast-close-button" onClick={() => handleToastClose()}>
                                    <Icon f7="xmark" className="font-large font-bold" />
                                </div>
                            )}
                        </div>
                    )}
                    {data?.message && data.message !== "" && (
                        <div className="toast-body">
                            <div className="toast-message font-large">{data.message}</div>
                        </div>
                    )}
                    <div className={`toast-footer ${hasConfirmCancel ? "toast-footer-dual" : ""}`}>
                        {hasConfirmCancel ? (
                            <>
                                {onCancel && (
                                    <Button
                                        className="toast-button-cancel"
                                        onClick={() => handleCancel()}
                                    >
                                        {data?.cancelText || t("Cancel")}
                                    </Button>
                                )}
                                {onConfirm && (
                                    <Button
                                        fill
                                        className="toast-button-confirm font-medium font-bold"
                                        onClick={() => handleConfirm()}
                                    >
                                        {data?.confirmText || t("Confirm")}
                                    </Button>
                                )}
                            </>
                        ) : (
                            <Button fill onClick={() => handleToastClose()} className="font-medium font-bold">
                                {data?.buttonText || t("OK")}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (type === "custom") {
        return (
            <div
                className={`custom-container ${isActive ? "active" : ""}`}
                onClick={(e) => handleBackdropClick(e)}
            >
                <div className="custom-content" onClick={(e) => e.stopPropagation()}>
                    {data?.title && data.title !== "" && (
                        <div className="custom-header">
                            <div className="custom-title font-large font-bold">{data.title}</div>
                        </div>
                    )}
                    {children && (
                        <div className="custom-body">
                            {children}
                        </div>
                    )}
                    <div className={`custom-footer ${hasConfirmCancel ? "custom-footer-dual" : ""}`}>
                        {hasConfirmCancel ? (
                            <>
                                {onCancel && (
                                    <Button
                                        className="custom-button-cancel"
                                        onClick={() => handleCancel()}
                                    >
                                        {data?.cancelText || t("Cancel")}
                                    </Button>
                                )}
                                {onConfirm && (
                                    <Button
                                        fill
                                        className="custom-button-confirm font-medium font-bold"
                                        onClick={() => handleConfirm()}
                                    >
                                        {data?.confirmText || t("Confirm")}
                                    </Button>
                                )}
                            </>
                        ) : (
                            <Button fill onClick={() => handleToastClose()} className="font-medium font-bold">
                                {data?.buttonText || t("OK")}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

export default Tools;

