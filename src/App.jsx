
import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from '@/components/ui/toaster';
import { BRAND } from '@/config/brand';
import Layout from '@/components/Layout';
import RequireAuth from '@/components/auth/RequireAuth';
import TradeStation from '@/pages/TradeStation';
import TradingHistory from '@/pages/TradingHistory';
import Market from '@/pages/Market';
import TransactionsHistory from '@/pages/TransactionsHistory';
import Wallets from '@/pages/Wallets';
import Assets from '@/pages/Assets';
import Profile from '@/pages/Profile';
import Certificates from '@/pages/Certificates';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Onboarding from '@/pages/Onboarding';
import VerifyEmail from '@/pages/VerifyEmail';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import NotFound from '@/pages/NotFound';

// Signed-out screens render outside Layout: no bottom nav, no account chrome,
// and no TradingProvider, because none of it applies before sign-in.
const AUTH_ROUTES = ['/login', '/register', '/onboarding', '/verify-email', '/forgot-password', '/reset-password'];

function App() {
  const location = useLocation();
  const isAuthRoute = AUTH_ROUTES.includes(location.pathname);

  useEffect(() => {
    document.title = `${BRAND.name} - ${BRAND.tagline}`;
  }, []);

  return (
    <> 
      {isAuthRoute ? (
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Routes>
        </AnimatePresence>
      ) : (
        /* Everything below shows account data, so the gate wraps the whole
           branch rather than being repeated on each route — a route added
           later is protected by default instead of by remembering to. */
        <RequireAuth>
          <Layout>
            <AnimatePresence mode="wait">
              <Routes location={location} key={location.pathname}>
                <Route path="/" element={<TradeStation />} />
                <Route path="/trades" element={<TradingHistory />} />
                <Route path="/market" element={<Market />} />
                <Route path="/transactions" element={<TransactionsHistory />} />
                <Route path="/wallets" element={<Wallets />} />
                <Route path="/assets" element={<Assets />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/certificates" element={<Certificates />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AnimatePresence>
          </Layout>
        </RequireAuth>
      )}
      
      <Toaster />
    </>
  );
}

export default App;
