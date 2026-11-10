import { useTranslation } from "react-i18next";
import NavigationBar from "../components/common/NavigationBar";

function ChatPage() {
    const { t } = useTranslation();

    return (
        <div className="home-page home-vibe">
            <div className="home-content">
                <h1 className="vibe-chat-title">{t("Chat")}</h1>
            </div>
            <NavigationBar active="chat" />
        </div>
    );
}

export default ChatPage;
