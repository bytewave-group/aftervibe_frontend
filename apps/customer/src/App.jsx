import { HashRouter, Routes, Route } from "react-router-dom";

import Main from "./components/main";
// Fixed inconsistent import case for Header
import Header from "./components/header/Header";

import Screen from "./components/home/Screen";
import OverlayScreen from "./components/home/OverlayScreen";
import RankPage from "./components/home/RankPage";
import GiftPage from "./pages/Animation/GiftPage";
import FullScreenPage from "./pages/Animation/FullScreenPage";
import SideScreen from "./components/home/SideScreen";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DailyCheckInPage from "./pages/DailyCheckInPage";
import SpinWheelPage from "./pages/SpinWheelPage";
import MallPage from "./pages/MallPage";
import WalletPage from "./pages/WalletPage";
import JoinPage from "./pages/JoinPage";
import EventsPage from "./pages/EventsPage";
import EventDetailPage from "./pages/EventDetailPage";
import ProfilePage from "./pages/ProfilePage";
import NotificationsPage from "./pages/NotificationsPage";
import VisualEffect from "./components/home/VisualEffect";

function App() {
    return (
        <HashRouter>
            <Routes>
                {/* Main Routes */}
                <Route path="/" element={<LoginPage />} />
                <Route
                    path="/home"
                    element={
                        <ProtectedRoute>
                            <Main />
                        </ProtectedRoute>
                    }
                />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/join" element={<JoinPage />} />

                {/* Display Routes */}
                <Route path="/screen" element={<Screen />} />
                <Route path="/overlay" element={<OverlayScreen />} />
                <Route path="/sidescreen" element={<SideScreen />} />
                <Route path="/visualeffect" element={<VisualEffect />} />

                {/* Protected Routes */}
                <Route
                    path="/gift"
                    element={
                        <ProtectedRoute>
                            <GiftPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/fullscreen"
                    element={
                        <ProtectedRoute>
                            <FullScreenPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/rank"
                    element={
                        <ProtectedRoute>
                            <RankPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/daily-checkin"
                    element={
                        <ProtectedRoute>
                            <DailyCheckInPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/spinwheel"
                    element={
                        <ProtectedRoute>
                            <SpinWheelPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/mall"
                    element={
                        <ProtectedRoute>
                            <MallPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/wallet"
                    element={
                        <ProtectedRoute>
                            <WalletPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/events"
                    element={
                        <ProtectedRoute>
                            <EventsPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/events/:eventId"
                    element={
                        <ProtectedRoute>
                            <EventDetailPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/profile"
                    element={
                        <ProtectedRoute>
                            <ProfilePage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/notifications"
                    element={
                        <ProtectedRoute>
                            <NotificationsPage />
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </HashRouter>
    );
}

export default App;