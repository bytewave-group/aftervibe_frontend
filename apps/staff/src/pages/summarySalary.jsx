import React, { useState, useEffect } from "react";
import { Page } from "framework7-react";
import Header from "../components/header";
import { useTranslation } from "../services/useTranslation";
import useAuthenticate from "../actions/Authenticate";
import { useTokenAndUser } from "../components/action/user-data";
import HomeSalarySummarySection from "../components/home/HomeSalarySummarySection";
import env from "../../environment.json";

const padDatePart = (value) => String(value).padStart(2, "0");

const getTodayISO = () => {
  const now = new Date();
  return `${now.getFullYear()}-${padDatePart(now.getMonth() + 1)}-${padDatePart(now.getDate())}`;
};

const getFirstDayOfCurrentMonthISO = () => {
  const now = new Date();
  return `${now.getFullYear()}-${padDatePart(now.getMonth() + 1)}-01`;
};

const isSalaryRole = (role) => {
  const roleLower = role?.toLowerCase();
  return roleLower === "doctor" || roleLower === "mummy" || roleLower === "staff";
};

const SummarySalaryPage = () => {
  const { t } = useTranslation();
  const { summary_salary } = useAuthenticate();
  const { user } = useTokenAndUser();

  const userRole = user?.role || user?.user?.role;
  const roleLower = userRole?.toLowerCase();

  const [startDate, setStartDate] = useState(getFirstDayOfCurrentMonthISO);
  const [endDate, setEndDate] = useState(getTodayISO);
  const [summaryData, setSummaryData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isSalaryRole(userRole)) return;

    let cancelled = false;

    const loadSalarySummary = async () => {
      setIsLoading(true);
      try {
        const response = await summary_salary({
          private_key: env.private_key,
          type: roleLower,
          start_date: startDate,
          end_date: endDate,
        });
        if (cancelled) return;
        if (response?.status) {
          setSummaryData(response.data ?? null);
        } else {
          setSummaryData(null);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch salary summary:", error);
          setSummaryData(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadSalarySummary();

    return () => {
      cancelled = true;
    };
  }, [userRole, startDate, endDate]);

  const handleStartDateChange = (e) => {
    const value = e.target.value;
    setStartDate(value);
    if (value > endDate) {
      setEndDate(value);
    }
  };

  const handleEndDateChange = (e) => {
    const value = e.target.value;
    setEndDate(value);
    if (value < startDate) {
      setStartDate(value);
    }
  };

  if (!isSalaryRole(userRole)) {
    return (
      <Page className="summary-salary-page">
        <Header title={t("Salary Summary")} />
        <div className="summary-salary-container">
          <div className="salary-summary-empty font-medium">
            {t("You do not have access to this page.")}
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page className="summary-salary-page">
      <Header title={t("Salary Summary")} />
      <div className="summary-salary-container">
        <HomeSalarySummarySection
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={handleStartDateChange}
          onEndDateChange={handleEndDateChange}
          summaryData={summaryData}
          isLoading={isLoading}
          userRole={userRole}
        />
      </div>
    </Page>
  );
};

export default SummarySalaryPage;
