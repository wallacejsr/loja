/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Catalog } from './pages/Catalog';
import { ProductDetails } from './pages/Product';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { CartProvider } from './context/CartContext';
import { SettingsProvider } from './hooks/useSettings';

function ScrollToTop() {
  const { pathname } = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  
  return null;
}

import { Wishlist } from './pages/Wishlist';
import { Raffles } from './pages/Raffles';
import { Account } from './pages/Account';
import { Register } from './pages/Register';

import { AdminLayout } from './pages/admin/AdminLayout';
import { Dashboard } from './pages/admin/Dashboard';
import { Products } from './pages/admin/Products';
import { Orders } from './pages/admin/Orders';
import { Categories } from './pages/admin/Categories';
import { Customers } from './pages/admin/Customers';
import { Banners } from './pages/admin/Banners';
import { Settings } from './pages/admin/Settings';
import { Promotions } from './pages/admin/Promotions';
import { AdminRaffles } from './pages/admin/Raffles';
import { LayoutTheme } from './pages/admin/LayoutTheme';

// Simple placeholder components for other routes
const Institutional = ({ title }: { title: string }) => <div className="flex justify-center py-32 text-xl font-bold uppercase">{title}</div>;

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <SettingsProvider>
        <CartProvider>
          <Routes>
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="products" element={<Products />} />
              <Route path="orders" element={<Orders />} />
              <Route path="categories" element={<Categories />} />
              <Route path="customers" element={<Customers />} />
              <Route path="banners" element={<Banners />} />
              <Route path="settings" element={<Settings />} />
              <Route path="promotions" element={<Promotions />} />
              <Route path="raffles" element={<AdminRaffles />} />
              <Route path="layout" element={<LayoutTheme />} />
            </Route>

            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="catalog" element={<Catalog />} />
              <Route path="product/:id" element={<ProductDetails />} />
              <Route path="cart" element={<Cart />} />
              <Route path="checkout" element={<Checkout />} />
              <Route path="account" element={<Account />} />
              <Route path="sorteios" element={<Raffles />} />
              <Route path="register" element={<Register />} />
              <Route path="wishlist" element={<Wishlist />} />
              
              {/* Institutional Routes */}
              <Route path="about" element={<Institutional title="Sobre a Marca" />} />
              <Route path="contact" element={<Institutional title="Contato" />} />
              <Route path="terms" element={<Institutional title="Termos de Uso" />} />
              <Route path="privacy" element={<Institutional title="Política de Privacidade" />} />
              <Route path="exchanges" element={<Institutional title="Trocas e Devoluções" />} />
              <Route path="faq" element={<Institutional title="Perguntas Frequentes" />} />
              <Route path="shipping" element={<Institutional title="Prazos e Envios" />} />
            </Route>
          </Routes>
        </CartProvider>
      </SettingsProvider>
    </Router>
  );
}
