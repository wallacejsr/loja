import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  CheckCircle2,
  Home as HomeIcon,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  PackageSearch,
  Palette,
  PlugZap,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Tag,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useSettings } from '../../hooks/useSettings';

export function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  const location = useLocation();
  const { settings } = useSettings();

  useEffect(() => {
    const handleToast = (e: any) => {
      setToast({ message: e.detail, visible: true });
      setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 3000);
    };

    window.addEventListener('admin-toast', handleToast);
    return () => window.removeEventListener('admin-toast', handleToast);
  }, []);

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Produtos', href: '/admin/products', icon: ShoppingBag },
    { name: 'Pedidos', href: '/admin/orders', icon: ShoppingCart },
    { name: 'Categorias', href: '/admin/categories', icon: PackageSearch },
    { name: 'Clientes', href: '/admin/customers', icon: Users },
    { name: 'Mensagens', href: '/admin/messages', icon: Mail },
    { name: 'Sorteios', href: '/admin/raffles', icon: Trophy },
    { name: 'Promoções', href: '/admin/promotions', icon: Tag },
    { name: 'Banners', href: '/admin/banners', icon: ImageIcon },
    { name: 'Home', href: '/admin/home', icon: HomeIcon },
    { name: 'Integrações', href: '/admin/integrations', icon: PlugZap },
    { name: 'Layout', href: '/admin/layout', icon: Palette },
    { name: 'Configurações', href: '/admin/settings', icon: Settings },
  ];
  const brandParts = getAdminBrandParts(settings.adminPanelName);

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex font-sans text-neutral-900 relative">
      <AnimatePresence>
        {toast.visible && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-4 left-1/2 z-[100] bg-neutral-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="text-[13px] font-medium tracking-wide">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 bg-[#0A0A0A] w-64 z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:w-[280px] flex flex-col',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="h-[72px] flex items-center justify-between px-6 border-b border-white/5">
          <Link to="/admin" className="text-lg font-serif font-bold text-white tracking-widest uppercase">
            {brandParts.secondary ? (
              <>
                {brandParts.primary} <span className="font-light text-white/40">{brandParts.secondary}</span>
              </>
            ) : (
              brandParts.primary
            )}
          </Link>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-white/50 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || (location.pathname.startsWith(item.href) && item.href !== '/admin');
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center px-3 py-2.5 text-[13px] font-medium tracking-wide rounded-lg transition-all group',
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-white/50 hover:bg-white/5 hover:text-white',
                )}
              >
                <item.icon className={cn('w-[18px] h-[18px] mr-3 shrink-0 transition-colors', isActive ? 'text-white' : 'text-white/40 group-hover:text-white/70')} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
          <Link
            to="/"
            className="flex items-center px-3 py-2.5 text-[13px] font-medium tracking-wide rounded-lg transition-colors text-red-400 hover:bg-red-400/10 hover:text-red-300"
          >
            <LogOut className="w-[18px] h-[18px] mr-3" />
            Sair para a Loja
          </Link>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-[72px] bg-[#F5F5F7]/80 backdrop-blur-xl sticky top-0 z-30 flex items-center px-6 lg:px-10 border-b border-neutral-200/60">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden mr-4 p-2 -ml-2 text-neutral-600 hover:bg-black/5 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1 flex items-center justify-between">
            <h1 className="text-[13px] font-semibold text-neutral-500 uppercase tracking-widest hidden sm:block">
              Painel de Controle
            </h1>
            <div className="flex items-center gap-4 ml-auto">
              <div className="text-right hidden sm:block">
                <div className="text-[13px] font-semibold text-neutral-900">Administrador</div>
                <div className="text-[11px] text-neutral-500 font-medium">admin@danibrand.com.br</div>
              </div>
              <div className="w-9 h-9 rounded-full bg-white border border-neutral-200/60 text-neutral-700 flex items-center justify-center font-bold text-sm shadow-sm">
                DA
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 lg:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function getAdminBrandParts(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return { primary: 'DANI', secondary: 'Studio' };
  }

  const parts = trimmed.split(/\s+/);
  return {
    primary: parts[0],
    secondary: parts.slice(1).join(' '),
  };
}
