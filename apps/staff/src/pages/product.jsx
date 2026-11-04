import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Page, Button, f7, Input, Icon } from 'framework7-react';
import Header from "../components/header";
import { useTranslation } from "../services/useTranslation";
import useAuthenticate, { VERIFY_QR_TYPE } from "../actions/Authenticate";
import useCommon from "../components/action/Common";
import env from "../../environment.json";
import { Preferences } from "@capacitor/preferences";
import { preferencesEmitter } from "../components/action/preferences";
import Tools from "../components/tools";
import QrScanner from '../components/QrScanner';
import {
    buildPosReceipt,
    buildPaymentRows,
    apiOrderRef,
    printPosReceipt,
} from '../utils/androidReceiptPrinter';
import { RECEIPT_STATUS_KIND, resolveReceiptStatusLabel } from '../constants/receiptStatus';
import { STAFF_WORK_TYPE } from '../constants/staffWorkType';

const ProductPage = ({ f7router }) => {
    const { t, i18n } = useTranslation();
    const { navigate } = useCommon();
    const { product_lists, staff_work_lists, create_order_product, verify_qr } = useAuthenticate();

    const [selectedProducts, setSelectedProducts] = useState({});
    const [quantities, setQuantities] = useState({});
    const [productOptions, setProductOptions] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [roomNumber, setRoomNumber] = useState("");

    const [form, setForm] = useState({
        private_key: env.private_key,
        staff_id: "",
    });
    const [staffList, setStaffList] = useState([]);
    const [staffDropdownOpen, setStaffDropdownOpen] = useState(false);
    const [staffFilter, setStaffFilter] = useState("");
    const [paymentMethodsFromGlobal, setPaymentMethodsFromGlobal] = useState([]);
    const [showAlertToast, setShowAlertToast] = useState(false);
    const [alertToastData, setAlertToastData] = useState({});
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [paymentAmounts, setPaymentAmounts] = useState({});
    const [grandTotal, setGrandTotal] = useState(0);
    const [feeBreakdown, setFeeBreakdown] = useState("");
    const [orderInfo, setOrderInfo] = useState({
        staffName: "",
        amount: 0,
        tableNumber: "",
        selectedItems: []
    });
    const [showPaymentErrorToast, setShowPaymentErrorToast] = useState(false);
    const [paymentErrorToastData, setPaymentErrorToastData] = useState({});
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [successToastData, setSuccessToastData] = useState({});
    const [showQrScanner, setShowQrScanner] = useState(false);
    const isProcessingScanRef = useRef(false);
    const [productPermissions, setProductPermissions] = useState([]);
    const [userRole, setUserRole] = useState(null);

    useEffect(() => {
        const handleLanguageChange = (event) => {
            const newLanguage = event.detail;
            i18n.changeLanguage(newLanguage);
        };

        window.addEventListener('languageChanged', handleLanguageChange);
        return () => {
            window.removeEventListener('languageChanged', handleLanguageChange);
        };
    }, [i18n]);

    useEffect(() => {
        loadProductPermissions();
        fetchProductLists();
        fetchStaffWorkList();
        loadPaymentMethods();

        // Listen to user data updates from preferencesEmitter (e.g., when getProfile updates user data)
        const unsubscribe = preferencesEmitter.on("userUpdated", (updatedUserData) => {
            // Handle both nested structure { token, user } and flat structure
            const userData = updatedUserData?.user || updatedUserData;
            if (userData) {
                const permissions = userData?.product_permissions || [];
                setProductPermissions(permissions);
                const role = userData?.role;
                if (role) {
                    setUserRole(role);
                }
            }
        });

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, []);

    const loadProductPermissions = async () => {
        try {
            const { value } = await Preferences.get({ key: "user" });
            if (value) {
                const parsed = JSON.parse(value);
                // Handle both nested structure { token, user } and flat structure
                const userData = parsed.user || parsed;
                const permissions = userData?.product_permissions || [];
                setProductPermissions(permissions);
                const role = userData?.role;
                if (role) {
                    setUserRole(role);
                }
            }
        } catch (error) {
            console.error("Error loading product permissions:", error);
            setProductPermissions([]);
        }
    };

    const loadPaymentMethods = async () => {
        try {
            const { value } = await Preferences.get({ key: "global_data" });
            if (value) {
                const globalData = JSON.parse(value);
                const methods = globalData?.payment_methods ?? [];
                setPaymentMethodsFromGlobal(Array.isArray(methods) ? methods : []);
            }
        } catch (error) {
            console.error("Error loading payment methods:", error);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (staffDropdownOpen && !event.target.closest('.staff-custom-dropdown')) {
                setStaffDropdownOpen(false);
            }
        };

        if (staffDropdownOpen) {
            document.addEventListener('click', handleClickOutside);
        }

        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [staffDropdownOpen]);

    const fetchProductLists = async () => {
        f7.preloader.show();
        try {
            const res = await product_lists({ private_key: env.private_key });
            if (res && res.status && res.data) {
                setAllProducts(res.data || []);
            }
        } catch (error) {
            console.error('Error fetching product lists:', error);
        } finally {
            f7.preloader.hide();
        }
    };

    useEffect(() => {
        if (productPermissions.length === 0) {
            setProductOptions([]);
            return;
        }

        if (allProducts.length === 0) return;

        const permissionIds = productPermissions.map(perm => parseInt(perm));
        const filteredProducts = allProducts.filter(product =>
            permissionIds.includes(parseInt(product.id))
        );

        setProductOptions(filteredProducts);
    }, [allProducts, productPermissions]);

    const fetchStaffWorkList = async () => {
        try {
            const response = await staff_work_lists({ private_key: env.private_key, type: STAFF_WORK_TYPE.PRODUCT });
            if (response.status && response.data) {
                setStaffList(response.data || []);
            }
        } catch (error) {
            console.error("Error fetching staff work list:", error);
            setStaffList([]);
        }
    };

    const handleProductSelect = (product) => {
        setSelectedProducts(prev => {
            const newSelected = { ...prev };
            if (newSelected[product.id]) {
                delete newSelected[product.id];
                setQuantities(prevQuantities => {
                    const newQuantities = { ...prevQuantities };
                    delete newQuantities[product.id];
                    return newQuantities;
                });
            } else {
                newSelected[product.id] = product;
                setQuantities(prevQuantities => ({
                    ...prevQuantities,
                    [product.id]: 1
                }));
            }
            return newSelected;
        });
    };

    const handleQuantityChange = (productId, change) => {
        setQuantities(prev => {
            const currentQuantity = prev[productId] || 1;
            const newQuantity = currentQuantity + change;
            return {
                ...prev,
                [productId]: newQuantity >= 1 ? newQuantity : 1
            };
        });
    };

    const handleStaffChange = (staffId) => {
        setForm(prevForm => ({
            ...prevForm,
            staff_id: staffId
        }));
        setStaffDropdownOpen(false);
        setStaffFilter("");
    };

    const toggleStaffDropdown = () => {
        setStaffDropdownOpen(!staffDropdownOpen);
        if (!staffDropdownOpen) {
            setStaffFilter("");
        }
    };

    const handleStaffFilterChange = (e) => {
        setStaffFilter(e.target.value);
    };

    const handleScanStaff = async () => {
        // Use html5-qrcode for all platforms (web, iOS, Android) to show overlay modal
        setShowQrScanner(true);
    };

    const handleQrCodeScanned = async (qrCode) => {
        f7.preloader.show();
        try {
            const verifyResponse = await verify_qr({
                qr: qrCode,
                type: VERIFY_QR_TYPE.ORDER,
            });

            if (!verifyResponse.status) {
                f7.preloader.hide();
                handleStaffChange("");
                f7.toast.show({
                    text: verifyResponse.message || t("QR code verification failed"),
                    position: 'center',
                    type: 'error',
                    closeTimeout: 2000,
                });
                return;
            }

            const responseData = verifyResponse.data || verifyResponse;
            const role = (responseData && typeof responseData === 'object' && responseData.role) ? String(responseData.role).toLowerCase() : '';
            if (role !== 'staff') {
                f7.preloader.hide();
                handleStaffChange("");
                f7.toast.show({
                    text: t("Invalid QR code - staff only"),
                    position: 'center',
                    type: 'error',
                    closeTimeout: 2000,
                });
                return;
            }

            // Get the id from the verify response
            let staffId = null;

            if (typeof responseData === 'object' && responseData !== null) {
                staffId = responseData.id || responseData.staff_id || responseData.user_id;
            } else if (typeof responseData === 'number') {
                staffId = responseData;
            } else if (typeof responseData === 'string') {
                // Try to parse as number
                const parsed = parseInt(responseData);
                if (!isNaN(parsed)) {
                    staffId = parsed;
                }
            }

            if (staffId) {
                // Find staff in the list
                const foundStaff = staffList.find(staff =>
                    staff.id.toString() === staffId.toString()
                );

                if (foundStaff) {
                    // Use the staff.id from the found staff to ensure type consistency
                    handleStaffChange(foundStaff.id);
                    f7.toast.show({
                        text: t("Staff selected successfully"),
                        position: 'center',
                        type: 'success',
                        closeTimeout: 2000,
                    });
                } else {
                    // Staff not found, fetch the list one more time for confirmation
                    try {
                        const refreshResponse = await staff_work_lists({ private_key: env.private_key, type: STAFF_WORK_TYPE.PRODUCT });
                        if (refreshResponse.status && refreshResponse.data) {
                            const refreshedList = refreshResponse.data || [];
                            setStaffList(refreshedList);

                            // Check again after refresh
                            const foundStaffAfterRefresh = refreshedList.find(staff =>
                                staff.id.toString() === staffId.toString()
                            );

                            if (foundStaffAfterRefresh) {
                                handleStaffChange(foundStaffAfterRefresh.id);
                                f7.toast.show({
                                    text: t("Staff selected successfully"),
                                    position: 'center',
                                    type: 'success',
                                    closeTimeout: 2000,
                                });
                            } else {
                                handleStaffChange("");
                                f7.toast.show({
                                    text: t("Staff not found in the list"),
                                    position: 'center',
                                    type: 'error',
                                    closeTimeout: 2000,
                                });
                            }
                        } else {
                            handleStaffChange("");
                            f7.toast.show({
                                text: t("Staff not found in the list"),
                                position: 'center',
                                type: 'error',
                                closeTimeout: 2000,
                            });
                        }
                    } catch (refreshError) {
                        console.error("Error refreshing staff list:", refreshError);
                        handleStaffChange("");
                        f7.toast.show({
                            text: t("Staff not found in the list"),
                            position: 'center',
                            type: 'error',
                            closeTimeout: 2000,
                        });
                    }
                }
            } else {
                handleStaffChange("");
                f7.toast.show({
                    text: t("Invalid QR code format"),
                    position: 'center',
                    type: 'error',
                    closeTimeout: 2000,
                });
            }
        } catch (error) {
            console.error("Error processing QR code:", error);
            handleStaffChange("");
            f7.toast.show({
                text: t("Error processing QR code"),
                position: 'center',
                type: 'error',
                closeTimeout: 2000,
            });
        } finally {
            isProcessingScanRef.current = false;
            f7.preloader.hide();
        }
    };

    const showAlert = (message) => {
        setAlertToastData({
            title: t("Alert"),
            message: message,
            buttonText: t("OK")
        });
        setShowAlertToast(true);
    };

    const handleCloseAlert = () => {
        setShowAlertToast(false);
    };

    const isReadyToPlaceOrder = () => {
        return form.staff_id && roomNumber.trim() && Object.keys(selectedProducts).length > 0;
    };

    const handlePlaceOrder = () => {
        if (!form.staff_id) {
            showAlert(t("Please select a staff"));
            return;
        }

        if (!roomNumber.trim()) {
            showAlert(t("Please enter table number"));
            return;
        }

        let totalAmount = 0;
        let selectedItems = [];

        Object.keys(selectedProducts).forEach(productId => {
            const product = selectedProducts[productId];
            const quantity = quantities[productId] || 1;
            const itemTotal = parseFloat(product.amount) * quantity;
            totalAmount += itemTotal;

            selectedItems.push({
                id: product.id,
                name: product.name,
                value: quantity,
                amount: parseFloat(product.amount),
                total: itemTotal
            });
        });

        if (selectedItems.length === 0) {
            showAlert(t("Please select at least one product"));
            return;
        }

        const selectedStaff = staffList.find(staff => String(staff.id) === String(form.staff_id));
        const staffName = selectedStaff ? (selectedStaff.name || selectedStaff.staff_name || `Staff ${selectedStaff.id}`) : "";

        const nextOrderInfo = {
            staffName: staffName,
            amount: totalAmount,
            tableNumber: roomNumber,
            selectedItems: selectedItems
        };

        setOrderInfo(nextOrderInfo);
        // Payment method entry is temporarily bypassed for direct order placement.
        // setPaymentAmounts({});
        // setGrandTotal(0);
        // setFeeBreakdown("");
        // setShowPaymentForm(true);
        proceedOrder({ payments: [], handle_fee: 0 }, nextOrderInfo);
    };

    const uniqueTypes = useMemo(() => {
        const byTypeId = new Map();
        paymentMethodsFromGlobal.forEach((pm) => {
            if (!byTypeId.has(pm.type_id)) {
                byTypeId.set(pm.type_id, { type_id: pm.type_id, type: pm.type });
            }
        });
        return Array.from(byTypeId.values());
    }, [paymentMethodsFromGlobal]);

    const getMethodsForType = (typeId) =>
        paymentMethodsFromGlobal.filter((pm) => pm.type_id === typeId);

    const handlePaymentAmountChange = (methodId, value) => {
        const formatted = value.replace(/[^\d.]/g, '').replace(/(\..*?)\..*/g, '$1').replace(/^(\d*\.\d{0,2}).*$/, '$1');
        setPaymentAmounts(prev => ({
            ...prev,
            [methodId]: formatted
        }));
    };

    useEffect(() => {
        let subtotal = 0;
        let totalFees = 0;
        const breakdownLines = [];
        paymentMethodsFromGlobal.forEach((pm) => {
            const amt = parseFloat(paymentAmounts[pm.id] || 0) || 0;
            if (amt > 0) {
                subtotal += amt;
                const feePct = parseFloat(pm.handle_fee_percentage || 0) || 0;
                const fee = amt * (feePct / 100);
                totalFees += fee;
                if (fee > 0) {
                    breakdownLines.push(`${t(pm.name)} ${t("Fee")} (${feePct}%): RM ${fee.toFixed(2)}`);
                }
            }
        });
        setGrandTotal(subtotal + totalFees);
        setFeeBreakdown(breakdownLines.join('\n'));
    }, [paymentAmounts, paymentMethodsFromGlobal, t]);

    const handleClosePopup = () => {
        setShowPaymentForm(false);
    };

    const handleConfirmPopup = () => {
        const payments = paymentMethodsFromGlobal
            .filter((pm) => (parseFloat(paymentAmounts[pm.id] || 0) || 0) > 0)
            .map((pm) => ({ payment_method_id: pm.id, amount: parseFloat(paymentAmounts[pm.id] || 0) }));
        let subtotal = 0;
        let totalFees = 0;
        payments.forEach((p) => {
            subtotal += p.amount;
            const pm = paymentMethodsFromGlobal.find((m) => m.id === p.payment_method_id);
            if (pm) totalFees += p.amount * (parseFloat(pm.handle_fee_percentage || 0) || 0) / 100;
        });
        const orderTotal = orderInfo.amount;

        if (subtotal < orderTotal) {
            showPaymentError(
                t("Total payment amount is less than the order amount"),
                orderTotal,
                subtotal
            );
            return;
        }

        if (subtotal > orderTotal) {
            showPaymentError(
                t("Total payment amount is more than the order amount"),
                orderTotal,
                subtotal
            );
            return;
        }

        if (payments.length === 0) {
            showPaymentError(t("Please enter at least one payment amount"), orderTotal, 0);
            return;
        }

        proceedOrder({
            payments,
            handle_fee: parseFloat(totalFees.toFixed(2))
        });
        setShowPaymentForm(false);
    };

    const showPaymentError = (message, orderAmount, totalPayment) => {
        const errorMessage = `${message}\n\n${t("Order Amount")}: RM ${orderAmount.toFixed(2)}\n${t("Total Payment")}: RM ${totalPayment.toFixed(2)}`;
        setPaymentErrorToastData({
            title: t("Payment Error"),
            message: errorMessage,
            buttonText: t("Close")
        });
        setShowPaymentErrorToast(true);
    };

    const handleClosePaymentError = () => {
        setShowPaymentErrorToast(false);
    };

    const buildProductOrderReceiptText = (paymentData, nextOrderInfo, apiData, layout) => {
        const payLater = !paymentData.payments || paymentData.payments.length === 0;
        const total = Number(nextOrderInfo.amount) || 0;
        const metaRows = [
            { label: 'Staff', value: nextOrderInfo.staffName || '' },
            { label: 'Table Number', value: String(nextOrderInfo.tableNumber || '') },
        ];
        const items = (nextOrderInfo.selectedItems || []).map((item) => {
            const qty = item.value ?? 1;
            const unit = Number(item.amount) || 0;
            const lineTotal = item.total != null ? Number(item.total) : unit * qty;
            return { name: item.name, qty, total: lineTotal };
        });

        return buildPosReceipt({
            title: 'Product',
            orderId: apiOrderRef(apiData),
            status: resolveReceiptStatusLabel(apiData, RECEIPT_STATUS_KIND.ORDER, { payLater }),
            metaRows,
            items: items.length ? items : [{ name: 'Product Order', qty: 1, total }],
            total,
            paymentRows: buildPaymentRows({
                payLater,
                payments: paymentData.payments,
                handleFee: paymentData.handle_fee,
                paymentMethodsFromGlobal,
            }),
            receiptType: payLater ? 'confirmation' : 'payment',
            layout,
        });
    };

    const handleCloseSuccessToast = () => {
        setShowSuccessToast(false);
        navigate(-1);
    };

    const proceedOrder = (paymentData, nextOrderInfo = orderInfo) => {
        f7.preloader.show();

        // Determine action_type based on user role (mummy or doctor only)
        const role = userRole?.toLowerCase();
        const actionType = (role === 'mummy' || role === 'doctor') ? role : 'mummy';

        const orderData = {
            private_key: env.private_key,
            action_type: actionType,
            target_type: "staff",
            target_id: form.staff_id,
            amount: nextOrderInfo.amount,
            payments: paymentData.payments,
            handle_fee: paymentData.handle_fee,
            items: nextOrderInfo.selectedItems,
            table_number: parseInt(nextOrderInfo.tableNumber)
        };

        create_order_product(orderData).then(async (res) => {
            f7.preloader.hide();
            if (!res.status) {
                showAlert(res.message);
                return;
            }

            void printPosReceipt((layout) => buildProductOrderReceiptText(paymentData, nextOrderInfo, res.data, layout));

            setSuccessToastData({
                title: t("Success"),
                message: t("Your order has been created successfully."),
                buttonText: t("Done")
            });
            setShowSuccessToast(true);
        }).catch(error => {
            f7.preloader.hide();
            showAlert(error.message || t("Failed to create order"));
        });
    };

    const getSelectedCount = () => {
        return Object.keys(selectedProducts).length;
    };

    const getTotalAmount = () => {
        let total = 0;
        Object.keys(selectedProducts).forEach(productId => {
            const product = selectedProducts[productId];
            const quantity = quantities[productId] || 1;
            total += parseFloat(product.amount) * quantity;
        });
        return total;
    };

    const selectedStaff = staffList.find(staff => staff.id === form.staff_id);
    const filteredStaffList = staffList.filter((staff) => {
        const staffName = (staff.name || staff.staff_name || `Staff ${staff.id}`).toLowerCase();
        return staffName.includes(staffFilter.toLowerCase());
    });

    return (
        <Page className="beer-page">
            <Header title={t("Product")} orderListType="product" />
            <div className="content-panel">
                <div className="content">
                    <div className="form-group">
                        <span className="form-label font-medium font-bold">{t("Staff")}</span>
                        <div className="form-input-container font-medium staff-input-with-scan">
                            <div className="staff-custom-dropdown">
                                <div
                                    className="selected-staff"
                                    onClick={() => toggleStaffDropdown()}
                                >
                                    {selectedStaff ? (
                                        <>
                                            <span>{selectedStaff.name || selectedStaff.staff_name || `Staff ${selectedStaff.id}`}</span>
                                        </>
                                    ) : (
                                        <span>{t("Select Staff")}</span>
                                    )}
                                    <i className="f7-icons font-medium">chevron_down</i>
                                </div>
                                {staffDropdownOpen && (
                                    <div className="staff-dropdown-options">
                                        <div className="staff-search-container">
                                            <Input
                                                type="text"
                                                value={staffFilter}
                                                onChange={handleStaffFilterChange}
                                                placeholder={t("Search staff...")}
                                                className="staff-search-input"
                                                clearButton
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                        <div className="staff-options-list">
                                            {filteredStaffList.length > 0 ? (
                                                <>
                                                    <div
                                                        className="staff-dropdown-option"
                                                        onClick={() => handleStaffChange("")}
                                                    >
                                                        <span>{t("Clear Selection")}</span>
                                                    </div>
                                                    {filteredStaffList.map((staff) => (
                                                        <div
                                                            key={staff.id}
                                                            className={`staff-dropdown-option ${String(form.staff_id) === String(staff.id) ? 'selected' : ''}`}
                                                            onClick={() => handleStaffChange(staff.id)}
                                                        >
                                                            <div className="staff-image-container">
                                                                {staff.profile_image ? (
                                                                    <img src={staff.profile_image} alt={staff.name || staff.staff_name} />
                                                                ) : (
                                                                    <i className="f7-icons">person</i>
                                                                )}
                                                            </div>
                                                            <span>{staff.name || staff.staff_name || `Staff ${staff.id}`}</span>
                                                        </div>
                                                    ))}
                                                </>
                                            ) : (
                                                <div className="staff-dropdown-option no-results">
                                                    <span>{t("No staff found")}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <Button
                                className="scan-staff-button font-medium"
                                onClick={handleScanStaff}
                                title={t("Scan Staff")}
                            >
                                <Icon f7="qrcode_viewfinder" />
                            </Button>
                        </div>
                    </div>

                    <div className="beer-container">
                        <div className="room-number-input" style={{ marginBottom: 16 }}>
                            <label htmlFor="room-number" style={{ color: '#E1E1E2', fontWeight: 'bold', marginBottom: 6, display: 'block', fontSize: "16px" }}>
                                {t("Table Number")}
                            </label>
                            <input
                                id="room-number"
                                type="number"
                                inputMode="numeric"
                                min="1"
                                step="1"
                                value={roomNumber}
                                onChange={e => {
                                    const value = e.target.value;
                                    if (value === '' || /^\d+$/.test(value)) {
                                        setRoomNumber(value);
                                    }
                                }}
                                placeholder={t("Enter Table Number")}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: '1.5px solid #282837',
                                    background: 'transparent',
                                    color: '#E1E1E2',
                                    fontSize: 16,
                                    marginBottom: 8
                                }}
                            />
                        </div>
                        <div className="amount-title">{t("Select Product")}</div>
                        <div className="product-list-container">
                            {productOptions.length > 0 ? (
                                productOptions.map((product) => (
                                    <div
                                        key={product.id}
                                        className={`product-item ${selectedProducts[product.id] ? 'selected' : ''}`}
                                    >
                                        <div className="product-main-content">
                                            <div className="product-info">
                                                <div className="product-name font-medium font-bold">{product.name}</div>
                                                <div className="product-price">RM {parseFloat(product.amount).toFixed(2)}</div>
                                            </div>
                                            {!selectedProducts[product.id] && (
                                                <div className="product-add-icon" onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleProductSelect(product);
                                                }}>
                                                    <i className="f7-icons">plus_circle_fill</i>
                                                </div>
                                            )}
                                        </div>
                                        {selectedProducts[product.id] && (
                                            <>
                                                <div className="quantity-control-section">
                                                    <div className="quantity-control">
                                                        <div className="minus-button" onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleQuantityChange(product.id, -1);
                                                        }}>
                                                            <i className="f7-icons">minus_circle</i>
                                                        </div>
                                                        <div className="quantity-display">
                                                            {quantities[product.id] || 1}
                                                        </div>
                                                        <div className="add-button" onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleQuantityChange(product.id, 1);
                                                        }}>
                                                            <i className="f7-icons">plus_circle</i>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="product-remove-btn" onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleProductSelect(product);
                                                }}>
                                                    <i className="f7-icons">trash</i>
                                                    <span>{t("Remove")}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="no-products-message text-center" style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '100%',
                                    padding: '40px 20px',
                                    color: '#E1E1E2',
                                    fontSize: '16px'
                                }}>
                                    <Icon f7="cube_box" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }} />
                                    <div className="font-medium">{t("No products available")}</div>
                                </div>
                            )}
                        </div>

                        {getSelectedCount() > 0 && (
                            <div className="next-button-container">
                                <div className="selection-summary">
                                    <div className="selected-count">
                                        {t("Selected Items")}: {getSelectedCount()}
                                    </div>
                                    <div className="total-amount">
                                        RM {getTotalAmount().toFixed(2)}
                                    </div>
                                </div>
                                <Button
                                    className="next-button font-bold"
                                    fill
                                    onClick={() => handlePlaceOrder()}
                                >
                                    {isReadyToPlaceOrder() ? t("Place Order") : t("Next")}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Tools
                type="toast"
                active={showAlertToast}
                data={alertToastData}
                onToastClose={handleCloseAlert}
            />
            <Tools
                type="custom"
                active={showPaymentForm}
                data={{
                    title: t("Please Check the Details"),
                    confirmText: t("confirm"),
                    cancelText: t("Close")
                }}
                onConfirm={handleConfirmPopup}
                onCancel={handleClosePopup}
            >
                <div className="ktv-payment-form">
                    <div className="order-info text-center">
                        <p>
                            {orderInfo?.staffName} - RM {orderInfo?.amount?.toFixed(2)} {orderInfo?.tableNumber && `(Table ${orderInfo.tableNumber})`}
                        </p>
                    </div>
                    <div className="payment-methods-section">
                        <div className="payment-methods payment-methods-dynamic">
                            {uniqueTypes.map((typeRow) => {
                                const methods = getMethodsForType(typeRow.type_id);
                                return (
                                    <div key={typeRow.type_id} className="payment-type-group">
                                        <div className="payment-type-label font-large font-bold">{t(typeRow.type)}</div>
                                        <div className="payment-row">
                                            {methods.map((pm) => (
                                                <div key={pm.id} className="payment-method">
                                                    <label className="payment-method-label font-large">{t(pm.name)}{pm.handle_fee_percentage && parseFloat(pm.handle_fee_percentage) > 0 ? ` (${pm.handle_fee_percentage}%)` : ""}</label>
                                                    <Input
                                                        type="text"
                                                        inputmode="decimal"
                                                        placeholder="0.00"
                                                        value={paymentAmounts[pm.id] ?? ""}
                                                        onChange={(e) => handlePaymentAmountChange(pm.id, e.target.value)}
                                                        className="payment-input"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="total-section">
                        <div className="total-label-section">
                            <span className="section-title font-medium font-bold">{t("Order Total")}</span>
                        </div>
                        <div className="total-row">
                            <div className="total-item order-total-item">
                                <span className="total-label">{t("Order Total")}:</span>
                                <span className="total-value">RM {orderInfo.amount.toFixed(2)}</span>
                            </div>
                            {feeBreakdown && (
                                <div className="fee-breakdown">
                                    {feeBreakdown.split('\n').map((line, index) => {
                                        const parts = line.split(': RM ');
                                        const label = parts[0] + (parts[1] ? ':' : '');
                                        const value = parts[1] ? `RM ${parts[1]}` : '';
                                        return (
                                            <div key={index} className="fee-item">
                                                <span className="fee-label font-medium font-bold">{label}</span>
                                                {value && <span className="fee-value font-medium">{value}</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            <div className="total-item grand-total">
                                <span className="total-label">{t("Total")}:</span>
                                <span className="total-value">RM {grandTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </Tools>
            <Tools
                type="toast"
                active={showPaymentErrorToast}
                data={paymentErrorToastData}
                onToastClose={handleClosePaymentError}
            />
            <Tools
                type="toast"
                active={showSuccessToast}
                data={successToastData}
                onToastClose={handleCloseSuccessToast}
            />

            <QrScanner
                readerElementId="qr-reader-staff-product"
                active={showQrScanner}
                onActiveChange={setShowQrScanner}
                onDecoded={handleQrCodeScanned}
                isProcessingScanRef={isProcessingScanRef}
                showPreloaderOnCameraScan={false}
            />
        </Page>
    );
};

export default ProductPage;
