/**
 * Role-based home menu sections. Callbacks / dynamic flags are injected by the caller.
 */
export function getHomeRoleMenuConfig({
  handleCameraClick,
  showProductAction,
  showDaysSelection,
  isLoadingProfile,
  profileData,
}) {
  return {
    manager: [
      {
        title: "Flower",
        items: [
          {
            permission: "order_flower",
            icon: "money_dollar_circle",
            text: "Order Flower",
            route: "/order-flower",
          },
          {
            permission: "claim_flower",
            icon: "money_dollar_circle",
            text: "Claim Flower",
            route: "/claim-flower",
          },
          {
            permission: "flower_tracking",
            icon: "money_dollar_circle",
            text: "Flower Tracking",
            route: "/flower-tracking",
          },
          {
            permission: "return_flower",
            icon: "money_dollar_circle",
            text: "Return Flower",
            route: "/return-flower",
          },
        ],
      },
      {
        title: "Actions",
        items: [
          {
            permission: "scan_qr_code",
            icon: "qrcode_viewfinder",
            text: "Scan QR Code",
            onClick: handleCameraClick,
          },
          {
            permission: "mc_request",
            icon: "doc_text",
            text: "MC Request",
            route: "/mc-request",
            badgeKey: "medical_certificate_pending_count",
          },
          {
            permission: "penalty",
            icon: "money_dollar_circle",
            text: "Penalty List",
            route: "/penalty",
            badgeKey: "penalty_pending_count",
          },
          {
            permission: "accommodation",
            icon: "money_dollar_circle",
            text: "Accommodation",
            route: "/accommodation",
          },
          {
            permission: "payment_collection",
            icon: "person_2",
            text: "Payment Collection",
            route: "/payment-collection",
            useTranslation: true,
          },
          {
            permission: "floor_plan",
            icon: "map",
            text: "Floor Plan",
            route: "/floor-plan",
            useTranslation: true,
          },
        ],
      },
      {
        title: "View",
        items: [
          {
            permission: "order_history",
            icon: "clock",
            text: "Order History",
            route: "/report-sales",
          },
          {
            permission: "ticket_list",
            icon: "tickets",
            text: "Ticket List",
            route: "/ticket-list",
          },
        ],
      },
      {
        title: "Device",
        items: [
          {
            icon: "doc_text",
            text: "Printer Settings",
            route: "/printer-settings",
            useTranslation: true,
          },
        ],
      },
    ],
    mummy: [
      {
        title: "Actions",
        items: [
          {
            permission: "check_in",
            icon: "checkmark_square",
            text: "Check In",
            route: "/checkin",
            useTranslation: true,
          },
        ],
      },
      {
        title: "Order",
        items: [
          {
            permission: "order_ktv",
            icon: "money_dollar_circle",
            text: "KTV",
            route: "/ktv",
            useTranslation: true,
          },
          {
            permission: "floor_plan",
            icon: "map",
            text: "Floor Plan",
            route: "/floor-plan",
            useTranslation: true,
          },
          {
            permission: "order_buyout",
            icon: "clock",
            text: "Buyout",
            route: "/buyout",
            useTranslation: true,
          },
          {
            permission: "order_product",
            icon: "cube_box",
            text: "Product",
            route: "/product",
            useTranslation: true,
          },
        ],
      },
      {
        title: "Report",
        items: [
          {
            permission: "staff_report",
            icon: "person_2",
            text: "Staff",
            route: "/staff",
            useTranslation: true,
          },
          {
            permission: "sales_report",
            icon: "chart_bar",
            text: "Report",
            route: "/report-mummy",
            useTranslation: true,
          },
          {
            permission: "penalty_list",
            icon: "chart_bar",
            text: "Penalty List",
            route: "/penalty",
            useTranslation: true,
          },
          {
            permission: "flower_movement_list",
            icon: "doc_text",
            text: "Flower Movement Lists",
            route: "/flower-movement",
            useTranslation: true,
          },
          {
            permission: "check_in_history",
            icon: "checkmark_circle",
            text: "Check In History",
            route: "/checkin-history",
            useTranslation: true,
          },
          {
            icon: "money_dollar_circle",
            text: "Salary",
            route: "/summary-salary",
            useTranslation: true,
          },
        ],
      },
      {
        title: "Management",
        items: [
          {
            permission: "payment_collection",
            icon: "person_2",
            text: "Pending Payment",
            route: "/payment-collection",
            useTranslation: true,
          },
        ],
      },
      {
        title: "Device",
        items: [
          {
            icon: "doc_text",
            text: "Printer Settings",
            route: "/printer-settings",
            useTranslation: true,
          },
        ],
      },
    ],
    staff: [
      {
        title: "Actions",
        items: [
          {
            text: "Check In",
            icon: "checkmark_square",
            route: "/checkin",
            permission: "check_in",
            condition: () => !showDaysSelection && !isLoadingProfile && profileData,
          },
          {
            text: "Upload Medical Certificate",
            icon: "plus_circle",
            route: "/upload-mc",
            permission: "upload_medical_certificate",
          },
          {
            text: "Product",
            icon: "plus_circle",
            route: "/product",
            permission: "order_product",
            condition: () => showProductAction,
          },
        ],
      },
      {
        title: "View",
        items: [
          {
            text: "Flower Movement Lists",
            icon: "doc_text",
            route: "/flower-movement",
            permission: "flower_movement_list",
          },
          {
            text: "Leaderboard",
            icon: "person_3",
            route: "/leaderboard",
            permission: "leaderboard",
          },
          {
            text: "Sales",
            icon: "money_dollar_circle",
            route: "/report-sales",
            permission: "sales_report",
          },
          {
            text: "Check In History",
            icon: "checkmark_circle",
            route: "/checkin-history",
            permission: "check_in_history",
          },
          {
            text: "Penalty List",
            icon: "money_dollar_circle",
            route: "/penalty",
            permission: "penalty_list",
          },
          {
            text: "Salary",
            icon: "money_dollar_circle",
            route: "/summary-salary",
          },
        ],
      },
    ],
  };
}
