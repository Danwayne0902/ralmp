import { lazy, Suspense, useEffect } from 'react'
import { Outlet, Route, Routes, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import AppShell from './components/AppShell'
import ProtectedRoute from './components/ProtectedRoute'
import Spinner from './components/Spinner'
import Home from './pages/Home'

const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Commodities = lazy(() => import('./pages/Commodities'))
const CommodityDetail = lazy(() => import('./pages/CommodityDetail'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const BuyerDashboard = lazy(() => import('./pages/BuyerDashboard'))
const FarmerDashboard = lazy(() => import('./pages/FarmerDashboard'))
const FarmerListings = lazy(() => import('./pages/FarmerListings'))
const ListingForm = lazy(() => import('./pages/ListingForm'))
const Cart = lazy(() => import('./pages/Cart'))
const Orders = lazy(() => import('./pages/Orders'))
const OrderDetail = lazy(() => import('./pages/OrderDetail'))
const Payment = lazy(() => import('./pages/Payment'))
const Messages = lazy(() => import('./pages/Messages'))
const Profile = lazy(() => import('./pages/Profile'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const AdminUsers = lazy(() => import('./pages/AdminUsers'))
const AdminAnalytics = lazy(() => import('./pages/AdminAnalytics'))
const NotFound = lazy(() => import('./pages/NotFound'))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [pathname])
  return null
}

function MarketingLayout() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  return (
    <>
      <Navbar />
      <main className={isHome ? 'min-h-[60vh]' : 'min-h-[70vh] pt-16'}>
        <Outlet />
      </main>
      <Footer />
    </>
  )
}

function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense
        fallback={
          <div className="grid min-h-[70svh] place-items-center">
            <Spinner />
          </div>
        }
      >
        <Routes>
          {/* Public / marketing */}
          <Route element={<MarketingLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/commodities" element={<Commodities />} />
            <Route path="/commodities/:id" element={<CommodityDetail />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* Bare auth screens */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Authenticated workspace */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/buyer" element={<ProtectedRoute role="buyer"><BuyerDashboard /></ProtectedRoute>} />
            <Route path="/farmer" element={<ProtectedRoute role="farmer"><FarmerDashboard /></ProtectedRoute>} />
            <Route path="/farmer/listings" element={<ProtectedRoute role="farmer"><FarmerListings /></ProtectedRoute>} />
            <Route path="/farmer/listings/create" element={<ProtectedRoute role="farmer"><ListingForm /></ProtectedRoute>} />
            <Route path="/farmer/listings/:id/edit" element={<ProtectedRoute role="farmer"><ListingForm /></ProtectedRoute>} />

            <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
            <Route path="/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
            <Route path="/payment/:id" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

            <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute role="admin"><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/analytics" element={<ProtectedRoute role="admin"><AdminAnalytics /></ProtectedRoute>} />
          </Route>
        </Routes>
      </Suspense>
    </>
  )
}
