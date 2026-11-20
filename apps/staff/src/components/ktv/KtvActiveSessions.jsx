import React, { useEffect, useState } from "react";
import { Button } from "framework7-react";
import { useTranslation } from "../../services/useTranslation";
import useAuthenticate from "../../actions/Authenticate";
import env from "../../../environment.json";
import Tools from "../tools";
import {
    formatCountdown,
    getSessionTiming,
} from "../../utils/ktvSession";

const KtvActiveSessions = ({ f7router, onRefreshRequest }) => {
    const { t } = useTranslation();
    const { ktv_session_lists } = useAuthenticate();
    const [sessions, setSessions] = useState([]);
    const [sessionsError, setSessionsError] = useState("");
    const [nowTick, setNowTick] = useState(() => new Date());
    const [detailSession, setDetailSession] = useState(null);

    const fetchSessions = async () => {
        try {
            const response = await ktv_session_lists({ private_key: env.private_key });
            if (response.status) {
                setSessions(Array.isArray(response.data) ? response.data : []);
                setSessionsError("");
            } else {
                setSessions([]);
                setSessionsError(response.message || t("Failed to load KTV sessions"));
            }
        } catch (error) {
            setSessions([]);
            setSessionsError(error.message || t("Failed to load KTV sessions"));
        }
    };

    useEffect(() => {
        fetchSessions();
        const timer = setInterval(() => setNowTick(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (onRefreshRequest) {
            onRefreshRequest(fetchSessions);
        }
    }, [onRefreshRequest]);

    const timingLabel = (session) => {
        const timing = getSessionTiming(session.end_time, nowTick);
        if (timing.state === "overtime") {
            return t("Overtime");
        }
        if (timing.state === "ended") {
            return t("Ended");
        }
        return formatCountdown(timing.remainingSeconds);
    };

    return (
        <div className="ktv-session-list">
            {sessionsError && <div className="ktv-warning">{sessionsError}</div>}
            {sessions.length === 0 && !sessionsError && (
                <div className="ktv-empty">{t("No active KTV sessions")}</div>
            )}
            {sessions.map((session) => {
                const timing = getSessionTiming(session.end_time, nowTick);
                const extensionCount = Array.isArray(session.extensions) ? session.extensions.length : 0;
                return (
                    <div
                        key={session.id}
                        className={`ktv-session-card${timing.isUrgent ? " urgent" : ""}`}
                        onClick={() => setDetailSession(session)}
                    >
                        <div className="ktv-session-main">
                            <div className="ktv-session-name">{session.staff_name || "—"}</div>
                            <div className="ktv-session-meta">
                                {session.table ? `${t("Table")}: ${session.table}` : t("No table")}
                                {" · "}
                                {t("End Time")}: {session.end_time || "—"}
                            </div>
                            <div className="ktv-session-meta">
                                {t("Extensions")}: {extensionCount}
                            </div>
                        </div>
                        <div className="ktv-session-side">
                            <div className={`ktv-countdown${timing.isUrgent ? " urgent" : ""}`}>
                                {timingLabel(session)}
                            </div>
                            {session.can_extend && (
                                <Button
                                    fill
                                    className="ktv-extend-btn font-bold"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        event.currentTarget.blur();
                                        if (document.activeElement instanceof HTMLElement) {
                                            document.activeElement.blur();
                                        }
                                        f7router.navigate(`/ktv-extend/${session.id}`);
                                    }}
                                >
                                    {t("Extend time")}
                                </Button>
                            )}
                        </div>
                    </div>
                );
            })}

            <Tools
                type="custom"
                active={Boolean(detailSession)}
                data={{
                    title: t("KTV"),
                    cancelText: t("Close"),
                }}
                onCancel={() => setDetailSession(null)}
                onToastClose={() => setDetailSession(null)}
            >
                {detailSession && (
                    <div className="ktv-detail">
                        <p><strong>{t("Staff")}:</strong> {detailSession.staff_name || "—"}</p>
                        <p><strong>{t("Table")}:</strong> {detailSession.table || "—"}</p>
                        <p><strong>{t("Hours")}:</strong> {detailSession.hours ?? "—"}</p>
                        <p><strong>{t("Amount")}:</strong> RM {Number(detailSession.amount || 0).toFixed(2)}</p>
                        <p><strong>{t("End Time")}:</strong> {detailSession.end_time || "—"}</p>
                        <p className="font-bold">{t("Extensions")}</p>
                        {Array.isArray(detailSession.extensions) && detailSession.extensions.length > 0 ? (
                            detailSession.extensions.map((extension) => (
                                <div key={extension.id} className="ktv-extension-row">
                                    #{extension.id} · {extension.duration_minutes} {t("Minutes")} · RM {Number(extension.amount || 0).toFixed(2)} · {extension.end_time}
                                    {extension.status_label ? ` · ${t(extension.status_label)}` : ""}
                                </div>
                            ))
                        ) : (
                            <div className="ktv-empty">{t("No extensions")}</div>
                        )}
                    </div>
                )}
            </Tools>
        </div>
    );
};

export default KtvActiveSessions;
