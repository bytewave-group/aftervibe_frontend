import React, { useState, useEffect } from "react";
import { Page, f7, Input } from "framework7-react";
import Header from "../components/header";
import { useTranslation } from "../services/useTranslation";
import useAuthenticate from "../actions/Authenticate";
import env from "../../environment.json";

const TicketListPage = () => {
  const { ticket_lists, update_ticket_status } = useAuthenticate();
  const { t, i18n } = useTranslation();
  const today = new Date().toISOString().split("T")[0];
  const [ticketData, setTicketData] = useState([]);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [form, setForm] = useState({
    private_key: env.private_key,
    status: 2,
    start_date: today,
    end_date: today,
  });
  const [formUpdate] = useState({
    private_key: env.private_key,
    ticket_id: "",
    status: "",
  });

  useEffect(() => {
    const handleLanguageChange = (event) => {
      const newLanguage = event.detail;
      i18n.changeLanguage(newLanguage);
    };

    window.addEventListener("languageChanged", handleLanguageChange);
    return () => {
      window.removeEventListener("languageChanged", handleLanguageChange);
    };
  }, [i18n]);

  const fetchTicketList = async (requestForm) => {
    f7.preloader.show();
    try {
      const response = await ticket_lists(requestForm);
      if (response.status) {
        setTicketData(response.data || []);
      } else {
        setTicketData([]);
      }
    } catch (error) {
      console.error("Error fetching ticket list:", error);
      setTicketData([]);
    } finally {
      f7.preloader.hide();
    }
  };

  const handleStartDateChange = (e) => {
    const newStartDate = e.target.value;
    setStartDate(newStartDate);
    const updatedForm = {
      ...form,
      start_date: newStartDate,
    };
    setForm(updatedForm);
    fetchTicketList(updatedForm);
  };

  const handleEndDateChange = (e) => {
    const newEndDate = e.target.value;
    setEndDate(newEndDate);
    const updatedForm = {
      ...form,
      end_date: newEndDate,
    };
    setForm(updatedForm);
    fetchTicketList(updatedForm);
  };

  const handleStatusChange = (e) => {
    const newStatus = parseInt(e.target.value, 10);
    const updatedForm = {
      ...form,
      status: newStatus,
    };
    setForm(updatedForm);
    fetchTicketList(updatedForm);
  };

  useEffect(() => {
    fetchTicketList(form);
  }, []);

  const handleCancelTicket = async (ticketId) => {
    try {
      f7.preloader.show();
      const response = await update_ticket_status({
        ...formUpdate,
        ticket_id: ticketId,
        status: 1,
      });
      if (response.status) {
        f7.toast.show({
          text: response.message,
          position: "center",
          type: "success",
          closeTimeout: 1000,
        });
        fetchTicketList(form);
      } else {
        f7.toast.show({
          text: response.message,
          position: "center",
          type: "error",
          closeTimeout: 2000,
        });
      }
    } catch (error) {
      console.error("Error updating ticket status:", error);
      f7.toast.show({
        text: t("Error updating ticket status"),
        position: "center",
        type: "error",
        closeTimeout: 2000,
      });
    } finally {
      f7.preloader.hide();
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 1:
        return "rejected";
      case 2:
        return "approved";
      default:
        return "unknown";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 1:
        return t("Cancelled");
      case 2:
        return t("Confirmed");
      default:
        return t("Unknown");
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-GB", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <Page className="mc-request-page ticket-list-page">
      <Header title={t("Ticket List")} />
      <div className="content-panel">
        <div className="content">
          <div className="date-picker-container">
            <div className="start-date-container">
              <label htmlFor="ticket-start-date" className="form-label font-medium font-bold">
                {t("Start Date")}
              </label>
              <div className="form-input-container">
                <Input
                  type="date"
                  value={startDate}
                  onChange={handleStartDateChange}
                  id="ticket-start-date"
                  className="form-input date-picker"
                />
              </div>
            </div>
            <div className="end-date-container">
              <label htmlFor="ticket-end-date" className="form-label font-medium font-bold">
                {t("End Date")}
              </label>
              <div className="form-input-container">
                <Input
                  type="date"
                  value={endDate}
                  onChange={handleEndDateChange}
                  id="ticket-end-date"
                  className="form-input date-picker"
                />
              </div>
            </div>
          </div>

          <div className="status-filter-container">
            <label htmlFor="ticket-status-filter" className="form-label font-medium font-bold">
              {t("Status")}
            </label>
            <div className="form-input-container">
              <select
                id="ticket-status-filter"
                value={form.status}
                onChange={handleStatusChange}
                className="form-input status-select"
              >
                <option value={2}>{t("Confirmed")}</option>
                <option value={1}>{t("Cancelled")}</option>
              </select>
            </div>
          </div>

          <div className="mc-list-container">
            {ticketData.length > 0 ? (
              ticketData.map((ticket) => (
                <div key={ticket?.ticket_id ?? ticket?.id} className="mc-item">
                  <div className="mc-item-header">
                    <div className="mc-info">
                      <div className="mc-date">
                        <i className="icon f7-icons">calendar</i>
                        <span>{formatDate(ticket?.date)}</span>
                      </div>
                      <div className="mc-status">
                        <span
                          className={`font-bold status-badge status-${getStatusClass(ticket?.status)}`}
                        >
                          {getStatusText(ticket?.status)}
                        </span>
                      </div>
                    </div>
                    <div className="mc-actions">
                      {ticket.status === 2 && (
                        <button
                          className="action-btn reject-btn"
                          onClick={() => handleCancelTicket(ticket?.ticket_id ?? ticket?.id)}
                          aria-label={t("Cancel")}
                        >
                          <i className="icon f7-icons">xmark</i>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mc-item-details">
                    <div className="detail-row">
                      <span className="label font-medium">{t("Staff")}</span>
                      <span className="value font-medium">{ticket?.staff_name || "-"}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label font-medium">{t("Type")}</span>
                      <span className="value font-medium">{ticket?.type_label || "-"}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label font-medium">{t("Amount")}</span>
                      <span className="value font-medium">
                        RM {Number(ticket?.amount || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="label font-medium">{t("Remarks")}</span>
                      <span className="value font-medium">{ticket?.remark || "-"}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label font-medium">{t("Action at")}</span>
                      <span className="value font-medium uppercase">{formatDateTime(ticket?.action_at)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label font-medium">{t("Action by")}</span>
                      <span className="value font-medium">{ticket?.action_by || "-"}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-mc-message">
                <p>{t("No tickets at the moment")}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Page>
  );
};

export default TicketListPage;
