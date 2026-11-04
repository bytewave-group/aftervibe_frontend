import React, { useState, useEffect } from "react";
import {
    f7,
    Page,
} from "framework7-react";

import Header from "../components/header";
import useAuthenticate from "../actions/Authenticate";
import { useTranslation } from "../services/useTranslation";
import env from "../../environment.json";

const LeaderboardPage = () => {
    const { t } = useTranslation();
    const { getLeaderboard } = useAuthenticate();
    const [salesLeaderboard, setSalesLeaderboard] = useState([]);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            f7.preloader.show();
            try {
                const form = {
                    private_key: env.private_key,
                    type: "staff",
                };
                const response = await getLeaderboard(form);
                const data = response.data || [];
                setSalesLeaderboard(data);
            } catch (error) {
                console.error("Failed to fetch leaderboard data:", error);
                setSalesLeaderboard([]);
            } finally {
                f7.preloader.hide();
            }
        };

        fetchLeaderboard();
    }, []);

    const getTop10 = (leaderboardData, field) => {
        if (!Array.isArray(leaderboardData)) {
            console.error("Expected an array but received:", leaderboardData);
            return [];
        }
        const sortedData = leaderboardData.sort((a, b) => b[field] - a[field]);
        return sortedData.slice(0, 10);
    };

    const top10Sales = getTop10(
        Array.isArray(salesLeaderboard) ? salesLeaderboard : [],
        "total_order_amount"
    );

    const getRankClass = (index) => {
        if (index === 0) return "rank-first";
        if (index === 1) return "rank-second";
        if (index === 2) return "rank-third";
        return "rank-other";
    };


    return (
        <Page className="leaderboard-page">
            <Header title={t("Leaderboard")} />

            <div className="leaderboard-container">
                {top10Sales.length > 0 ? (
                    <>
                        <div className="leaderboard-header font-bold uppercase">
                            <div className="header-rank">{t("Rank")}</div>
                            <div className="header-name">{t("Staff Name")}</div>
                            <div className="header-amount">{t("Sales Amount")}</div>
                        </div>
                        <div className="leaderboard-list">
                            {top10Sales.map((item, index) => {
                                const rank = index + 1;
                                const rankClass = getRankClass(index);

                                return (
                                    <div key={index} className={`leaderboard-item ${rankClass}`}>
                                        <div className="leaderboard-rank">
                                            <span className="rank-number">{rank}</span>
                                        </div>
                                        <div className="leaderboard-name">
                                            {item?.staff_nickname || "—"}
                                        </div>
                                        <div className="leaderboard-amount">
                                            <span className="amount-value">
                                                RM {item?.total_order_amount?.toLocaleString() || 0}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    <div className="no-data-message">
                        <p>
                            {t("No rankings available yet")}
                        </p>
                    </div>
                )}
            </div>
        </Page>
    );
};

export default LeaderboardPage;
