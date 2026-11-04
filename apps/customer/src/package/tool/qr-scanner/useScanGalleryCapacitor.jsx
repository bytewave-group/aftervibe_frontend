import { useTranslation } from "react-i18next";
import { BrowserMultiFormatReader } from "@zxing/library";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { show_toast } from "../toast";

export default function useScanGalleryCapacitor(props) {
  const { t } = useTranslation();

  const handleGallery = async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos,
      });

      const img = new Image();
      img.src = image.webPath;

      img.crossOrigin = "anonymous";

      img.onload = async () => {
        const codeReader = new BrowserMultiFormatReader();
        try {
          const result = await codeReader.decodeFromImage(img);
          const url = new URL(result.text);

          const ref = url.searchParams.get("refer");
          handleScanCode(ref);
        } catch (err) {
          show_toast(t("No barcode found or error decoding."));
        }
      };

      img.onerror = (err) => {
        show_toast(t("Error loading image."));
      };
    } catch (error) {
      show_toast(t("Scanning failed"));
    }
  };

  const handleScanCode = () => {};

  return {};
}
