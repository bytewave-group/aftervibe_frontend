import React, { useState, useRef, useEffect } from "react";
import {
    Page,
    Button,
    Preloader,
    f7
} from "framework7-react";
import Header from "../components/header";
import useAuthenticate from "../actions/Authenticate";
// import { useNavigation } from "../services/functionService";
import env from "../../environment.json";
import useCommon from "../components/action/Common.jsx";
import { useTranslation } from "../services/useTranslation";
import { Preferences } from "@capacitor/preferences";
import { loadUser } from "../components/action/preferences.jsx";

/** Convert API time like "19.00" or "13:30:00" (24h) to display "7 PM" / "1:30 PM" (12h) */
const formatEndMcSubmitTime = (timeStr) => {
    if (!timeStr || typeof timeStr !== "string") return "7 PM";
    const parts = timeStr.trim().split(/[.:]/);
    const hour = parseInt(parts[0], 10);
    const minutes = parts[1] !== undefined ? parseInt(parts[1], 10) : 0;
    if (Number.isNaN(hour) || hour < 0 || hour > 23) return "7 PM";
    if (Number.isNaN(minutes) || minutes < 0 || minutes > 59) return "7 PM";

    const period = hour >= 12 ? "PM" : "AM";
    let displayHour = hour % 12;
    if (displayHour === 0) displayHour = 12;
    const minutePart = minutes > 0 ? `:${String(minutes).padStart(2, "0")}` : "";
    return `${displayHour}${minutePart} ${period}`;
};

const UploadMCPage = () => {
    const { t } = useTranslation();
    const { uploadMc } = useAuthenticate();
    const { navigate } = useCommon();
    const fileInputRef = useRef(null);
    const [filePath, setFilePath] = useState("");
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState(null);
    const [endMcSubmitTimeDisplay, setEndMcSubmitTimeDisplay] = useState();
    const [showMessage, setShowMessage] = useState(false);

    const [form, setForm] = useState({
        private_key: env.private_key,
        type: "staff",
        file: null,
    });

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setFilePath(file.name);
        setForm({ ...form, file: file });
        setUploadStatus(null);

        if (file.type.startsWith('image/')) {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        } else {
            setPreviewUrl(null);
        }
    };

    const handleUploadMc = async () => {
        try {
            setIsUploading(true);
            setUploadStatus(null);

            if (!form.file) {
                setUploadStatus('error');
                f7.toast.create({
                    text: t("Please select a file first."),
                    position: 'center',
                    closeTimeout: 2000,
                    cssClass: 'error-toast'
                }).open();
                setIsUploading(false);
                return;
            }

            // Create FormData for multipart/form-data upload
            const formData = new FormData();
            formData.append('private_key', form.private_key);
            formData.append('type', form.type);
            formData.append('file', form.file);

            const response = await uploadMc(formData);

            if (response.status) {
                setUploadStatus('success');
                // Reset form after successful upload
                setForm({
                    private_key: env.private_key,
                    type: "staff",
                    file: null,
                });
                setFilePath("");
                setPreviewUrl(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = null;
                }

                // Show success toast
                f7.toast.create({
                    text: response.message ? response.message : t("File uploaded successfully!"),
                    position: 'center',
                    closeTimeout: 2000,
                }).open();

                setTimeout(() => {
                    navigate("-1");
                }, 2000)
            } else {
                setUploadStatus('error');
                // Show error toast
                f7.toast.create({
                    text: response.message ? response.message : t("Failed to upload file. Please try again."),
                    position: 'center',
                    closeTimeout: 2000,
                    cssClass: 'error-toast'
                }).open();
            }
        } catch (error) {
            setUploadStatus('error');
            // console.log("error",error);
        } finally {
            setIsUploading(false);
        }
    };

    const openPhotoBrowser = () => {
        if (!previewUrl) return;
        const photoBrowser = f7.photoBrowser.create({
            photos: [{
                url: previewUrl,
            }],
            type: 'popup',
            theme: 'dark',
            navbar: true,
            toolbar: false,
            virtualSlides: false,
            closeByBackdropClick: false,
            on: {
                closed() {
                    photoBrowser.destroy();
                }
            }
        });
        photoBrowser.open();
    };

    const handleMcHistoryClick = () => {
        navigate('/mc-history');
    };

    useEffect(() => {
        const loadEndMcSubmitTime = async () => {
            const { value } = await Preferences.get({ key: "global_data" });
            const userData = await loadUser();
            if (userData) {
                try {
                    const timeFromSettings = userData?.mc_upload_endtime;
                    if (timeFromSettings) {
                        setEndMcSubmitTimeDisplay(formatEndMcSubmitTime(timeFromSettings));
                        setShowMessage(true);
                    } else {
                        setShowMessage(false);
                        setEndMcSubmitTimeDisplay("7 PM");
                    }
                } catch (_) { }
            }
        };
        loadEndMcSubmitTime();
    }, []);

    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    return (
        <Page className="upload-mc-page">
            <Header
                title={t("Upload MC")}
                onClockClick={handleMcHistoryClick}
            />

            <div className="content-panel">
                <div className="content">
                    <div className="upload-section">
                        {showMessage && (
                            <div className="upload-notice">
                                <i className="icon f7-icons">exclamationmark_circle_fill</i>
                                <p>{t("Please submit your medical certificate before {{time}} on the same day.", { time: endMcSubmitTimeDisplay })}</p>
                            </div>
                        )}

                        <div className="custom-upload">
                            <div className="upload-wrapper">
                                <Button
                                    className="choose-file-button"
                                    onClick={() => fileInputRef.current.click()}
                                    disabled={isUploading}
                                >
                                    {t("Choose File")}
                                </Button>
                                <span className="file-name text-center">
                                    {filePath || (t("No file chosen"))}
                                </span>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png"
                                    onChange={handleFileChange}
                                    className="file-input"
                                    style={{ display: 'none' }}
                                    disabled={isUploading}
                                />
                            </div>
                        </div>

                        {previewUrl && (
                            <div className="preview-section">
                                <div className="image-preview" onClick={() => openPhotoBrowser()}>
                                    <img src={previewUrl} alt="Preview" />
                                    <div className="preview-overlay">
                                        <span>{t("Click to expand")}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {uploadStatus === 'success' && (
                            <div className="upload-status success">
                                {t("File uploaded successfully!")}
                            </div>
                        )}

                        {uploadStatus === 'error' && (
                            <div className="upload-status error">
                                {t("Failed to upload file. Please try again.")}
                            </div>
                        )}

                        <div className="upload-mc-button-container">
                            <Button
                                onClick={() => handleUploadMc()}
                                disabled={!form.file || isUploading}
                                className={isUploading ? 'uploading' : ''}
                            >
                                {isUploading ? (
                                    <>
                                        <Preloader className="upload-preloader" />
                                        {t("Uploading...")}
                                    </>
                                ) : (
                                    t("Upload MC")
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </Page>
    );
};

export default UploadMCPage;
