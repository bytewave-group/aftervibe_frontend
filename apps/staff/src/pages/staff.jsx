import React, { useState, useEffect, useRef } from "react";
import { Page, Icon, f7 } from "framework7-react";
import Header from "../components/header";
import useAuthenticate from "../actions/Authenticate";
import { useTranslation } from "../services/useTranslation";
import env from "../../environment.json";
import { STAFF_WORK_TYPE } from "../constants/staffWorkType";

const StaffPage = () => {
    const [staffLists, setStaffLists] = useState([]);
    const { staff_work_lists, uploadProfileImage } = useAuthenticate();
    const { t, i18n } = useTranslation();
    const [formStaff, setFormStaff] = useState({
        private_key: env.private_key,
        type: STAFF_WORK_TYPE.ATTENDANCE,
    });
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [showImagePicker, setShowImagePicker] = useState(false);
    const fileInputRef = useRef(null);

    const fetchStaffWork = async () => {
        f7.preloader.show();
        try {
            const res = await staff_work_lists(formStaff);

            if (res && res.status) {
                setStaffLists(res.data);
                f7.dialog.close();
            }
        } catch (error) {
            // console.error("Error fetching staff work:", error);
        } finally {
            f7.preloader.hide();
        }
    };

    useEffect(() => {
        fetchStaffWork();
    }, []);

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

    const handleImageClick = (staff) => {
        setSelectedStaff(staff);
        setShowImagePicker(true);
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file || !selectedStaff) return;

        // Check file type
        if (!file.type.startsWith('image/')) {
            f7.dialog.alert(t("Please select an image file"));
            return;
        }

        // Check file size (max 5MB)
        // if (file.size > 5 * 1024 * 1024) {
        //   f7.dialog.alert(translations.imageSizeLimit || 'Image size should be less than 5MB');
        //   return;
        // }

        handleImageUpload(file);
    };

    const handleImageUpload = async (file) => {
        f7.preloader.show();
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('target_type', 'staff');
            formData.append('target_id', selectedStaff.id);

            const response = await uploadProfileImage(formData);

            if (response && response.status) {
                await fetchStaffWork();
                f7.toast.show({
                    text: t("Profile image updated successfully"),
                    position: 'center',
                    type: 'success',
                    closeTimeout: 2000,
                });
            } else {
                f7.toast.show({
                    text: response?.message || t("Failed to upload image"),
                    position: 'center',
                    type: 'error',
                    closeTimeout: 2000,
                });
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            f7.dialog.alert(t("Error uploading image"));
        } finally {
            f7.preloader.hide();
            setShowImagePicker(false);
            setSelectedStaff(null);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = null;
            }
        }
    };

    const triggerFileInput = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    return (
        <Page className="staff-page">
            <Header title={t("Staff")} />
            <div className="content-panel">
                <div className="content">
                    <div className="status-section">
                        <h3 className="status-title font-large">
                            {t("Present")}
                        </h3>
                        <div className="staff-status">
                            {staffLists?.length > 0
                                ? staffLists.map((item, index) => (
                                    <div key={index} className="staff-item Present">
                                        <div className="staff-avatar" onClick={() => handleImageClick(item)}>
                                            <img
                                                src={item?.profile_image ? item.profile_image : "/images/default-profile.png"}
                                                alt={`${item?.name} Profile`}
                                                onError={(e) => {
                                                    e.target.src = "/images/default-profile.png";
                                                }}
                                            />
                                            <div className="image-overlay">
                                                <Icon f7="camera" />
                                            </div>
                                        </div>
                                        <div className="staff-name-container">
                                            <span className="staff-name">
                                                {item?.name}
                                            </span>
                                            <span className="checked-in-time font-small font-bold">
                                                {t("Type")}: {item.type}
                                            </span>
                                        </div>
                                        <span className="status Present">
                                            {t("Present")}
                                        </span>
                                    </div>
                                ))
                                : (
                                    <div className="no-staff-message text-center uppercase" style={{ color: "gray", padding: "10px", border: "1px solid white", borderRadius: "5px" }}>
                                        {t("No staff present at the moment")}
                                    </div>
                                )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Hidden file input for image upload */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
            />

            {/* Image picker dialog */}
            {showImagePicker && (
                <div className="image-picker-overlay" onClick={() => setShowImagePicker(false)}>
                    <div className="image-picker-dialog" onClick={(e) => e.stopPropagation()}>
                        <h3>{t("Change Profile Image")}</h3>
                        <p>{t("Select a new profile image for")} {selectedStaff?.name}</p>
                        <div className="image-picker-buttons">
                            <button
                                className="button button-fill"
                                onClick={() => triggerFileInput()}
                            >
                                {t("Select Image")}
                            </button>
                            <button
                                className="button"
                                onClick={() => setShowImagePicker(false)}
                            >
                                {t("Cancel")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Page>
    );
};

export default StaffPage;