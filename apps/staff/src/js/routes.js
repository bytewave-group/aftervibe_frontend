
import HomePage from '../pages/home.jsx';
import LoginPage from '../pages/login.jsx';
import ProfilePage from '../pages/profile.jsx';

//manager pages
import OrderFlowerPage from '../pages/orderFlower.jsx';
import ClaimFlowerPage from '../pages/claimFlower.jsx';
import ReturnFlowerPage from '../pages/returnFlower.jsx';
import McRequestPage from '../pages/mcRequest.jsx';
import PenaltyPage from '../pages/penalty.jsx';
import HandOverPage from '../pages/handOver.jsx';
import AccommodationPage from '../pages/accommodation.jsx';
import TicketListPage from '../pages/ticketList.jsx';
//mummy pages
import KtvPage from '../pages/ktv.jsx';
import StaffPage from '../pages/staff.jsx';
import FlowerMovementPage from '../pages/flowerMovement.jsx';
import PaymentCollectionPage from '../pages/paymentCollection.jsx';
import ReportMummyPage from '../pages/reportMummy.jsx';
import BuyoutPage from '../pages/buyout.jsx';
import ProductPage from '../pages/product.jsx';
import OrderListPage from '../pages/orderList.jsx';
import PrinterSettingsPage from '../pages/PrinterSettings.jsx';

//staff pages
import LeaderboardPage from '../pages/leaderboard.jsx';
import UploadMcPage from '../pages/uploadMc.jsx';
import OrderConfirmationPage from '../pages/orderConfirmation.jsx';
import FlowerMovementConfirmationPage from '../pages/flowerMovementConfirmation.jsx';
import CheckInHistoryPage from '../pages/checkInHistory.jsx';
import McHistoryPage from '../pages/mcHistory.jsx';
import CheckinPage from '../pages/checkin.jsx';
import SalesPage from '../pages/sales.jsx';
import SummarySalaryPage from '../pages/summarySalary.jsx';

import { loadToken } from '../components/action/preferences';
const isUserLoggedIn = async () => {
  const token = await loadToken();
  // console.log(token);
  return token != null;
};
var routes = [
  {
    name: "/",
    path: '/',
    async: async function ({ router, resolve }) {
      const loggedIn = await isUserLoggedIn();
      if (loggedIn) {
        // console.log("User is logged in");
        resolve({ component: HomePage });
      } else {
        // console.log("User is not logged in");
        resolve({ component: LoginPage });
      }
    }
  },
  {
    path: '/login',
    component: LoginPage,
  },
  {
    path: '/home',
    async: async function ({ router, resolve }) {
      const loggedIn = await isUserLoggedIn();
      if (loggedIn) {
        resolve({ component: HomePage });
      } else {
        resolve({ component: LoginPage });
      }
    },
  },
  {
    path: '/profile',
    component: ProfilePage,
  },
  {
    path: '/order-flower',
    component: OrderFlowerPage,
  },
  {
    path: '/claim-flower',
    component: ClaimFlowerPage,
  },
  {
    path: '/return-flower',
    component: ReturnFlowerPage,
  },
  {
    path: '/mc-request',
    component: McRequestPage,
  },
  {
    path: '/penalty',
    component: PenaltyPage,
  },
  {
    path: '/hand-in',
    component: HandOverPage,
  },
  {
    path: '/accommodation',
    component: AccommodationPage,
  },
  {
    path: '/ticket-list',
    component: TicketListPage,
  },
  {
    path: '/ktv',
    component: KtvPage,
  },
  {
    path: '/staff',
    component: StaffPage,
  },
  {
    path: '/flower-movement',
    component: FlowerMovementPage,
  },
  {
    path: '/payment-collection',
    component: PaymentCollectionPage,
  },
  {
    path: '/report-mummy',
    component: ReportMummyPage,
  },
  {
    path: '/buyout',
    component: BuyoutPage,
  },
  {
    path: '/product',
    component: ProductPage,
  },
  {
    path: '/order-list',
    component: OrderListPage,
  },
  {
    path: '/printer-settings',
    component: PrinterSettingsPage,
  },
  {
    path: '/leaderboard',
    component: LeaderboardPage,
  },
  {
    path: '/upload-mc',
    component: UploadMcPage,
  },
  {
    path: '/mc-history',
    component: McHistoryPage,
  },
  {
    path: '/order-confirmation',
    component: OrderConfirmationPage,
  },
  {
    path: '/flower-movement-confirmation',
    component: FlowerMovementConfirmationPage,
  },
  {
    path: '/checkin-history',
    component: CheckInHistoryPage,
  },
  {
    path: '/checkin',
    component: CheckinPage,
  },
  {
    path: '/report-sales',
    component: SalesPage,
  },
  {
    path: '/summary-salary',
    component: SummarySalaryPage,
  },
];

export default routes;
