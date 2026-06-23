/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect, type ReactElement } from 'react';
import { Layout } from './components/Layout';
import { CartProvider } from './context/CartContext';
import { CustomerSessionProvider } from './context/CustomerSessionContext';
import { SettingsProvider } from './hooks/useSettings';
import { useStorefront } from './hooks/useStorefront';
import { StoreDataProvider } from './hooks/useStoreData';

const Home = lazy(() => import('./pages/Home').then((module) => ({ default: module.Home })));
const Catalog = lazy(() => import('./pages/Catalog').then((module) => ({ default: module.Catalog })));
const ProductDetails = lazy(() => import('./pages/Product').then((module) => ({ default: module.ProductDetails })));
const Cart = lazy(() => import('./pages/Cart').then((module) => ({ default: module.Cart })));
const Checkout = lazy(() => import('./pages/Checkout').then((module) => ({ default: module.Checkout })));
const Wishlist = lazy(() => import('./pages/Wishlist').then((module) => ({ default: module.Wishlist })));
const Raffles = lazy(() => import('./pages/Raffles').then((module) => ({ default: module.Raffles })));
const Account = lazy(() => import('./pages/Account').then((module) => ({ default: module.Account })));
const Register = lazy(() => import('./pages/Register').then((module) => ({ default: module.Register })));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout').then((module) => ({ default: module.AdminLayout })));
const Dashboard = lazy(() => import('./pages/admin/Dashboard').then((module) => ({ default: module.Dashboard })));
const Products = lazy(() => import('./pages/admin/Products').then((module) => ({ default: module.Products })));
const Orders = lazy(() => import('./pages/admin/Orders').then((module) => ({ default: module.Orders })));
const Categories = lazy(() => import('./pages/admin/Categories').then((module) => ({ default: module.Categories })));
const Customers = lazy(() => import('./pages/admin/Customers').then((module) => ({ default: module.Customers })));
const Messages = lazy(() => import('./pages/admin/Messages').then((module) => ({ default: module.Messages })));
const Banners = lazy(() => import('./pages/admin/Banners').then((module) => ({ default: module.Banners })));
const Settings = lazy(() => import('./pages/admin/Settings').then((module) => ({ default: module.Settings })));
const Promotions = lazy(() => import('./pages/admin/Promotions').then((module) => ({ default: module.Promotions })));
const AdminRaffles = lazy(() => import('./pages/admin/Raffles').then((module) => ({ default: module.AdminRaffles })));
const LayoutTheme = lazy(() => import('./pages/admin/LayoutTheme').then((module) => ({ default: module.LayoutTheme })));
const HomeSections = lazy(() => import('./pages/admin/HomeSections').then((module) => ({ default: module.HomeSections })));

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

const Institutional = ({ titleKey }: { titleKey: string }) => {
  const { t } = useStorefront();
  return <div className="flex justify-center py-32 text-xl font-bold uppercase">{t(titleKey)}</div>;
};

function RouteFallback() {
  return (
    <div className="min-h-[60vh] bg-[#f7f5f2] px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-5 animate-pulse">
        <div className="h-8 w-48 rounded-full bg-neutral-200/80" />
        <div className="h-28 rounded-[24px] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)]" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="h-52 rounded-[24px] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)]" />
          <div className="h-52 rounded-[24px] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)]" />
          <div className="hidden h-52 rounded-[24px] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)] xl:block" />
        </div>
      </div>
    </div>
  );
}

function lazyRoute(element: ReactElement) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>;
}

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <SettingsProvider>
        <StoreDataProvider>
          <CustomerSessionProvider>
            <CartProvider>
              <Routes>
                <Route path="/admin" element={lazyRoute(<AdminLayout />)}>
                  <Route index element={lazyRoute(<Dashboard />)} />
                  <Route path="products" element={lazyRoute(<Products />)} />
                  <Route path="orders" element={lazyRoute(<Orders />)} />
                  <Route path="categories" element={lazyRoute(<Categories />)} />
                  <Route path="customers" element={lazyRoute(<Customers />)} />
                  <Route path="messages" element={lazyRoute(<Messages />)} />
                  <Route path="banners" element={lazyRoute(<Banners />)} />
                  <Route path="home" element={lazyRoute(<HomeSections />)} />
                  <Route path="settings" element={lazyRoute(<Settings />)} />
                  <Route path="promotions" element={lazyRoute(<Promotions />)} />
                  <Route path="raffles" element={lazyRoute(<AdminRaffles />)} />
                  <Route path="layout" element={lazyRoute(<LayoutTheme />)} />
                </Route>

                <Route path="/" element={<Layout />}>
                  <Route index element={lazyRoute(<Home />)} />
                  <Route path="catalog" element={lazyRoute(<Catalog />)} />
                  <Route path="product/:id" element={lazyRoute(<ProductDetails />)} />
                  <Route path="cart" element={lazyRoute(<Cart />)} />
                  <Route path="checkout" element={lazyRoute(<Checkout />)} />
                  <Route path="account" element={lazyRoute(<Account />)} />
                  <Route path="sorteios" element={lazyRoute(<Raffles />)} />
                  <Route path="register" element={lazyRoute(<Register />)} />
                  <Route path="wishlist" element={lazyRoute(<Wishlist />)} />
                  <Route path="about" element={<Institutional titleKey="institutionalAbout" />} />
                  <Route path="contact" element={<Institutional titleKey="institutionalContact" />} />
                  <Route path="terms" element={<Institutional titleKey="institutionalTerms" />} />
                  <Route path="privacy" element={<Institutional titleKey="institutionalPrivacy" />} />
                  <Route path="exchanges" element={<Institutional titleKey="institutionalExchanges" />} />
                  <Route path="faq" element={<Institutional titleKey="institutionalFaq" />} />
                  <Route path="shipping" element={<Institutional titleKey="institutionalShipping" />} />
                </Route>
              </Routes>
            </CartProvider>
          </CustomerSessionProvider>
        </StoreDataProvider>
      </SettingsProvider>
    </Router>
  );
}
