import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Loader2, Sprout } from 'lucide-react'
import AppShell from './components/layout/AppShell'
import ProtectedRoute from './components/layout/ProtectedRoute'

const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Marketplace = lazy(() => import('./pages/Marketplace'))
const CommodityDetail = lazy(() => import('./pages/CommodityDetail'))
const Checkout = lazy(() => import('./pages/Checkout'))
const Payment = lazy(() => import('./pages/Payment'))
const Orders = lazy(() => import('./pages/Orders'))
const OrderDetail = lazy(() => import('./pages/OrderDetail'))
const DashboardRedirect = lazy(() => import('./pages/DashboardRedirect'))
const BuyerDashboard = lazy(() => import('./pages/BuyerDashboard'))
const Settlements = lazy(() => import('./pages/Settlements'))
const FarmerDashboard = lazy(() => import('./pages/FarmerDashboard'))
const FarmerListings = lazy(() => import('./pages/FarmerListings'))
const ListingForm = lazy(() => import('./pages/ListingForm'))
const Payouts = lazy(() => import('./pages/Payouts'))
const LogisticsDashboard = lazy(() => import('./pages/LogisticsDashboard'))
const Messages = lazy(() => import('./pages/Messages'))
const Profile = lazy(() => import('./pages/Profile'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const AdminUsers = lazy(() => import('./pages/AdminUsers'))
const AdminAnalytics = lazy(() => import('./pages/AdminAnalytics'))
const AdminDisputes = lazy(() => import('./pages/AdminDisputes'))
const QualityLab = lazy(() => import('./pages/QualityLab'))
const WaybillTerminal = lazy(() => import('./pages/WaybillTerminal'))
const InspectorTerminal = lazy(() => import('./pages/InspectorTerminal'))
const BatchProcurement = lazy(() => import('./pages/BatchProcurement'))
const SettlementReceipt = lazy(() => import('./pages/SettlementReceipt'))
const ArbitrationAward = lazy(() => import('./pages/ArbitrationAward'))
const EscrowTrust = lazy(() => import('./pages/EscrowTrust'))
// USSD gateway is parked until the offline channel is live.
// const UssdGateway = lazy(() => import('./pages/UssdGateway'))
const Forbidden = lazy(() => import('./pages/Forbidden'))
const NotFound = lazy(() => import('./pages/NotFound'))

const BUYER = ['buyer']
const FARMER = ['farmer']
const LOGISTICS = ['logistics_provider']
const ADMIN = ['admin']
const BUYER_ADMIN = ['buyer', 'admin']
const TRADING_ROLES = ['buyer', 'farmer', 'logistics_provider', 'admin']

function RouteFallback() {
  return (
    <div className="grid min-h-[62vh] place-items-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3">
        <span className="relative grid h-11 w-11 place-items-center rounded-xl bg-forest-50 text-forest-600">
          <Sprout size={19} />
          <Loader2 size={46} className="absolute animate-spin text-forest-500/25" />
        </span>
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-muted">
          Loading workspace
        </p>
      </div>
    </div>
  )
}

function guard(element, roles) {
  return <ProtectedRoute roles={roles}>{element}</ProtectedRoute>
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<AppShell />}>
          {/* Public surface */}
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="commodities" element={<Marketplace />} />
          <Route path="commodities/:id" element={<CommodityDetail />} />
          <Route path="escrow" element={<EscrowTrust />} />
          {/* <Route path="ussd" element={<UssdGateway />} /> */}

          {/* Shared authenticated workspace */}
          <Route path="dashboard" element={guard(<DashboardRedirect />)} />
          <Route path="orders" element={guard(<Orders />)} />
          <Route path="orders/:id" element={guard(<OrderDetail />)} />
          <Route path="messages" element={guard(<Messages />, TRADING_ROLES)} />
          <Route path="profile" element={guard(<Profile />)} />

          {/* Buyer procurement */}
          <Route path="cart" element={guard(<Checkout />, BUYER)} />
          <Route path="payment/:orderId" element={guard(<Payment />, BUYER)} />
          <Route path="buyer" element={guard(<BuyerDashboard />, BUYER)} />
          <Route path="buyer/procurement" element={guard(<BatchProcurement />, BUYER)} />
          <Route path="settlements" element={guard(<Settlements />, BUYER_ADMIN)} />

          {/* Farmer workspace */}
          <Route path="farmer" element={guard(<FarmerDashboard />, FARMER)} />
          <Route path="farmer/listings" element={guard(<FarmerListings />, FARMER)} />
          <Route path="farmer/listings/create" element={guard(<ListingForm />, FARMER)} />
          <Route path="farmer/listings/:id/edit" element={guard(<ListingForm />, FARMER)} />
          <Route path="farmer/payouts" element={guard(<Payouts />, FARMER)} />
          <Route path="farmer/settlement" element={guard(<SettlementReceipt />, FARMER)} />

          {/* Logistics */}
          <Route path="dispatch" element={guard(<LogisticsDashboard />, LOGISTICS)} />
          <Route path="dispatch/waybill" element={guard(<WaybillTerminal />, LOGISTICS)} />

          {/* Administration */}
          <Route path="admin" element={guard(<AdminDashboard />, ADMIN)} />
          <Route path="admin/users" element={guard(<AdminUsers />, ADMIN)} />
          <Route path="admin/analytics" element={guard(<AdminAnalytics />, ADMIN)} />
          <Route path="admin/disputes" element={guard(<AdminDisputes />, ADMIN)} />
          <Route path="admin/arbitration" element={guard(<ArbitrationAward />, ADMIN)} />
          <Route path="admin/quality" element={guard(<QualityLab />, ADMIN)} />
          <Route path="admin/quality/terminal" element={guard(<InspectorTerminal />, ADMIN)} />

          {/* Fallbacks */}
          <Route path="403" element={<Forbidden />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
