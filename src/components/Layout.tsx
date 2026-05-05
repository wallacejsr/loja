import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, Search, User, Heart, Menu, X, MessageCircle, Phone, Mail, Instagram, Youtube, Facebook, ChevronDown, Clock, Trophy } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../hooks/useSettings';

export function Layout() {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactFeedback, setContactFeedback] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const { cartCount, wishlist } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const salesWhatsApp = settings.supportSalesPhone || settings.phone;
  const sacWhatsApp = settings.supportSacPhone || settings.phone;
  const supportEmail = settings.supportEmail || settings.email;
  const salesWhatsAppUrl = `https://wa.me/55${salesWhatsApp.replace(/\D/g, '')}`;
  const sacWhatsAppUrl = `https://wa.me/55${sacWhatsApp.replace(/\D/g, '')}`;

  const closeMenu = () => setIsMenuOpen(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/catalog?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  const navLinks = [
    { name: t('nav.new_arrivals'), path: '/catalog?sort=lancamentos' },
    { name: t('nav.occasions'), path: '/catalog?category=Ocasiões', hasDropdown: true },
    { name: t('nav.essential'), path: '/catalog?category=Linha Essencial' },
    { name: t('nav.jeans'), path: '/catalog?category=Jeans' },
    { name: t('nav.vestidos'), path: '/catalog?category=Vestidos' },
    { name: t('nav.pants'), path: '/catalog?category=Calças' },
    { name: t('nav.shirts'), path: '/catalog?category=Camisas' },
    { name: 'Sorteios', path: '/sorteios' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-white text-secondary font-sans selection:bg-primary/20 selection:text-primary">
      {/* Top Banner */}
      <div className="bg-primary text-white text-xs sm:text-sm py-2 px-4 shadow-sm relative z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="hidden md:flex gap-4">
            <a href="https://facebook.com/spacodanimoraisitb" target="_blank" rel="noreferrer" className="hover:text-white/80"><Facebook className="w-4 h-4" /></a>
            <a href="https://youtube.com.br/spacodanimorais" target="_blank" rel="noreferrer" className="hover:text-white/80"><Youtube className="w-4 h-4" /></a>
            <a href="https://instagram.com/spacodanimorais" target="_blank" rel="noreferrer" className="hover:text-white/80"><Instagram className="w-4 h-4" /></a>
          </div>
          <div className="flex justify-center md:justify-end w-full md:w-auto gap-4 md:gap-6 items-center flex-wrap">
            <a href={`tel:${sacWhatsApp.replace(/\D/g, '')}`} className="flex items-center hover:text-white/80 font-medium">
              <Phone className="w-3.5 h-3.5 mr-1.5" /> {sacWhatsApp}
            </a>
            <a href={salesWhatsAppUrl} target="_blank" rel="noreferrer" className="flex items-center hover:text-white/80 font-medium">
              <MessageCircle className="w-3.5 h-3.5 mr-1.5" /> Whatsapp: {salesWhatsApp}
            </a>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-neutral-100 shadow-sm transition-all md:relative md:top-auto">
        {/* Top Row: Logo, Search, Actions */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between gap-4 lg:gap-8">
            {/* Mobile Menu Button */}
            <div className="flex items-center lg:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-secondary hover:text-primary focus:outline-none p-2 -ml-2"
                aria-label="Menu"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

            {/* Logo */}
            <div className="flex-shrink-0 flex items-center justify-center lg:justify-start lg:w-auto left-0">
              <Link to="/" className="pointer-events-auto">
                {settings.logoUrl ? (
                  <img 
                    src={settings.logoUrl} 
                    alt={settings.storeName} 
                    className="h-10 sm:h-12 lg:h-14 object-contain"
                  />
                ) : (
                  <span className="text-xl sm:text-2xl font-serif font-bold text-secondary uppercase tracking-widest">{settings.storeName}</span>
                )}
              </Link>
            </div>

            {/* Search - Desktop */}
            <div className="hidden lg:flex flex-1 max-w-2xl relative pl-8 xl:pl-16">
              <form onSubmit={handleSearchSubmit} className="w-full">
                 <input
                   type="text"
                   placeholder={t('nav.search_placeholder')}
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   className="w-full bg-[#f6f2ec] placeholder-secondary/50 text-secondary rounded-full pl-6 pr-14 py-3 sm:py-3.5 focus:outline-none focus:ring-1 focus:ring-primary text-sm font-medium transition-shadow mx-auto"
                 />
                 <button type="submit" className="absolute right-6 top-1/2 -translate-y-1/2 text-secondary/70 hover:text-primary">
                   <Search className="w-5 h-5 stroke-[1.5]" />
                 </button>
              </form>
            </div>

            {/* Actions Desktop */}
            <div className="hidden lg:flex items-center gap-6 xl:gap-8">
               {/* Support */}
               <div className="relative flex items-center gap-3 group/support cursor-pointer">
                  <div className="text-secondary group-hover/support:text-primary transition-colors">
                    <MessageCircle className="w-7 h-7 stroke-[1]" />
                  </div>
                  <div className="flex flex-col text-sm whitespace-nowrap">
                     <span className="text-secondary/70 text-xs text-left">Central de</span>
                     <span className="text-secondary font-bold flex items-center">Atendimento <ChevronDown className="w-3 h-3 ml-1 text-secondary/50" /></span>
                  </div>

                  {/* Dropdown Content */}
                  <div className="absolute top-[calc(100%+15px)] right-1/2 translate-x-1/2 w-[280px] bg-white rounded-md shadow-[0_10px_30px_-10px_rgba(0,0,0,0.15)] border border-neutral-100 opacity-0 invisible group-hover/support:opacity-100 group-hover/support:visible transition-all duration-200 z-50 p-4 origin-top">
                    {/* Arrow pointing up */}
                    <div className="absolute -top-2 right-1/2 translate-x-1/2 w-4 h-4 bg-white border-t border-l border-neutral-100 transform rotate-45"></div>
                    
                    <div className="relative z-10 flex flex-col gap-4 cursor-default" onClick={e => e.stopPropagation()}>
                       {/* Whatsapp */}
                       <div>
                         <h4 className="font-bold text-secondary mb-2">Estamos no whatsapp</h4>
                         <div className="flex flex-col gap-2">
                           <a href={salesWhatsAppUrl} className="flex items-start gap-3 hover:bg-neutral-50 p-2 rounded-sm transition-colors -mx-2">
                             <div className="text-green-500 bg-green-50 p-1.5 rounded-full shrink-0">
                               <MessageCircle className="w-4 h-4" />
                             </div>
                             <div className="flex flex-col">
                               <span className="font-bold text-secondary leading-tight">{salesWhatsApp}</span>
                               <span className="text-[10px] text-secondary/70 font-bold uppercase tracking-wider mt-0.5">Vendas</span>
                             </div>
                           </a>
                           <a href={sacWhatsAppUrl} className="flex items-start gap-3 hover:bg-neutral-50 p-2 rounded-sm transition-colors -mx-2">
                             <div className="text-green-500 bg-green-50 p-1.5 rounded-full shrink-0">
                               <MessageCircle className="w-4 h-4" />
                             </div>
                             <div className="flex flex-col">
                               <span className="font-bold text-secondary leading-tight">{sacWhatsApp}</span>
                               <span className="text-[10px] text-secondary/70 font-bold uppercase tracking-wider mt-0.5">Sac</span>
                             </div>
                           </a>
                         </div>
                       </div>

                       <div className="border-t border-neutral-100 pt-4">
                         <h4 className="font-bold text-secondary mb-2">Envie uma mensagem</h4>
                         <a href={`mailto:${supportEmail}`} className="flex items-start gap-3 hover:bg-neutral-50 p-2 rounded-sm transition-colors -mx-2">
                           <Mail className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                           <div className="flex flex-col">
                             <span className="font-bold text-secondary text-sm break-all leading-tight">{supportEmail}</span>
                             <span className="text-[10px] text-secondary/70 font-bold uppercase tracking-wider mt-1">SAC</span>
                           </div>
                         </a>
                       </div>

                       <div className="border-t border-neutral-100 pt-4">
                         <h4 className="font-bold text-secondary mb-2">Horário de atendimento</h4>
                         <div className="flex items-start gap-3 p-2 -mx-2">
                           <Clock className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                           <div className="flex flex-col text-sm text-secondary gap-0.5">
                             <span>{settings.supportWeekHours}</span>
                             <span>{settings.supportSaturdayHours}</span>
                           </div>
                         </div>
                       </div>

                       <button onClick={() => { setIsContactModalOpen(true); setIsMenuOpen(false); }} className="w-full flex items-center justify-center gap-2 bg-[#f6f2ec] text-secondary font-bold text-xs uppercase tracking-wider py-3 rounded-sm hover:bg-primary hover:text-white transition-colors mt-2">
                          <Mail className="w-4 h-4" /> Enviar mensagem
                       </button>
                    </div>
                  </div>
               </div>
               
               {/* User */}
               <Link to="/account" className="flex items-center gap-3 group">
                  <div className="text-secondary group-hover:text-primary transition-colors">
                    <User className="w-7 h-7 stroke-[1]" />
                  </div>
                  <div className="flex flex-col text-sm whitespace-nowrap">
                     <span className="text-secondary/70 text-xs text-left">Bem-vindo(a)</span>
                     <span className="text-secondary font-bold flex items-center">
                       <span>Entrar ou <span className="font-extrabold">Cadastrar</span></span> 
                       <ChevronDown className="w-3 h-3 ml-1 text-secondary/50" />
                     </span>
                  </div>
               </Link>

               {/* Cart */}
               <Link to="/cart" className="flex items-center gap-2 group">
                  <div className="relative text-secondary group-hover:text-primary transition-colors">
                    <ShoppingBag className="w-7 h-7 stroke-[1]" />
                  </div>
                  <span className="bg-secondary text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center justify-center shadow-sm">
                    {cartCount}
                  </span>
               </Link>
            </div>

            {/* Mobile Icons */}
            <div className="flex items-center justify-end space-x-4 z-10 bg-white lg:hidden">
              <button 
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="text-secondary hover:text-primary transition-colors block"
              >
                {isSearchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
              </button>
              
              <Link to="/account" className="text-secondary hover:text-primary transition-colors block">
                <User className="w-5 h-5" />
              </Link>

              <Link to="/cart" className="text-secondary hover:text-primary transition-colors relative flex items-center group">
                <ShoppingBag className="w-5 h-5 group-hover:scale-105 transition-transform" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-primary text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center animate-in zoom-in">
                    {cartCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden lg:block bg-[#f6f2ec] border-t border-neutral-100">
           <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <nav className="flex items-center">
                <div className="flex items-center gap-2 text-secondary font-bold py-3 pr-6 border-r border-[#e8dccb] cursor-pointer hover:text-primary transition-colors">
                  <Menu className="w-5 h-5 text-primary" />
                  <span className="text-sm font-bold uppercase tracking-wider">Todas as Categorias</span>
                  <ChevronDown className="w-4 h-4 ml-1 text-secondary/50" />
                </div>
                
                <div className="flex items-center pl-6 space-x-6 xl:space-x-8">
                  {navLinks.map((link) => (
                    <Link
                      key={link.name}
                      to={link.path}
                      className={cn(
                        "text-sm font-semibold tracking-wide uppercase text-secondary hover:text-primary transition-colors py-3 flex items-center",
                         location.search.includes(link.name) ? 'text-primary' : ''
                      )}
                    >
                      {link.name}
                      {link.hasDropdown && <ChevronDown className="w-3 h-3 ml-1 text-secondary/50" />}
                    </Link>
                  ))}
                </div>
              </nav>
           </div>
        </div>

        {/* Search Overlay/Drawer */}
        <div 
          className={cn(
            "absolute top-full left-0 w-full bg-white border-b border-neutral-100 shadow-md origin-top transition-all duration-300 pointer-events-none",
            isSearchOpen ? "opacity-100 scale-y-100 pointer-events-auto" : "opacity-0 scale-y-0"
          )}
        >
          <div className="max-w-3xl mx-auto p-4 sm:py-6 relative">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full">
              <Search className="absolute left-4 text-neutral-400 w-5 h-5 pointer-events-none" />
              <input
                autoFocus={isSearchOpen}
                type="text"
                placeholder="O que você está procurando?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-100 pl-12 pr-4 py-4 text-base rounded-sm focus:outline-none focus:ring-1 focus:ring-primary w-full transition-shadow"
              />
              <button 
                type="submit" 
                className="absolute right-2 bg-primary text-white px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-sm hover:bg-primary-dark transition-colors"
              >
                Buscar
              </button>
            </form>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={cn(
            "lg:hidden absolute top-full left-0 w-full bg-white border-b border-neutral-100 origin-top transition-all duration-300 ease-in-out shadow-lg",
            isMenuOpen ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0"
          )}
        >
          <div className="px-4 pt-2 pb-6 space-y-1">
            <div className="flex items-center border-b border-neutral-100 pb-4 mb-4 gap-4 px-2">
               <form onSubmit={handleSearchSubmit} className="flex-1 relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                  <input 
                    type="text" 
                    placeholder="Buscar produto..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-neutral-50 px-10 py-2.5 rounded-sm text-sm outline-none focus:ring-1 focus:ring-primary" 
                  />
               </form>
            </div>
            
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={closeMenu}
                className="block px-3 py-3 text-sm font-semibold uppercase tracking-wide text-secondary hover:text-primary hover:bg-neutral-50 rounded-md"
              >
                {link.name}
              </Link>
            ))}
             <div className="border-t border-neutral-100 pt-4 mt-2 flex flex-col gap-4 px-3">
               <Link to="/account" onClick={closeMenu} className="flex items-center text-sm font-semibold uppercase text-secondary hover:text-primary">
                 <User className="w-4 h-4 mr-3" /> Minha Conta
               </Link>
               <Link to="/wishlist" onClick={closeMenu} className="flex items-center text-sm font-semibold uppercase text-secondary hover:text-primary">
                 <Heart className="w-4 h-4 mr-3" /> Favoritos ({wishlist.length})
               </Link>
               <Link to="/sorteios" onClick={closeMenu} className="flex items-center text-sm font-semibold uppercase text-secondary hover:text-primary">
                 <Trophy className="w-4 h-4 mr-3" /> Sorteios & Fidelidade
               </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-neutral-200 mt-auto">
        <div className="bg-neutral-100 py-12">
          <div className="max-w-3xl mx-auto px-4 text-center">
             <h3 className="text-xl font-bold uppercase tracking-wider mb-2 text-secondary">
               <Mail className="w-5 h-5 inline-block mr-2" />
               {t('footer.newsletter_title')}
             </h3>
             <p className="text-secondary/70 text-sm mb-6">{t('footer.newsletter_subtitle')}</p>
             <form className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto" onSubmit={(e) => e.preventDefault()}>
               <input
                 type="email"
                 placeholder="Digite seu email"
                 className="flex-grow bg-white border border-neutral-300 px-4 py-3 text-sm focus:outline-none focus:border-primary rounded"
               />
               <button
                 type="submit"
                 className="bg-primary text-white px-6 py-3 text-sm font-bold hover:bg-primary-dark transition-colors rounded uppercase tracking-wider"
               >
                 {t('footer.subscribe')}
               </button>
             </form>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            <div>
              <h4 className="font-bold uppercase tracking-wider text-sm mb-6 text-secondary border-b border-primary inline-block pb-1">Sobre a loja</h4>
              <p className="text-secondary/70 text-sm leading-relaxed mb-6">
                {settings.description}
              </p>
            </div>

            <div>
              <h4 className="font-bold uppercase tracking-wider text-sm mb-6 text-secondary border-b border-primary inline-block pb-1">Conteúdo</h4>
              <ul className="space-y-4">
                <li><Link to="/about" className="text-secondary/70 hover:text-primary text-sm font-medium transition-colors">Quem somos</Link></li>
                <li><Link to="/contact" className="text-secondary/70 hover:text-primary text-sm font-medium transition-colors">Fale Conosco</Link></li>
                <li><Link to="/privacy" className="text-secondary/70 hover:text-primary text-sm font-medium transition-colors">Política de privacidade</Link></li>
                <li><Link to="/exchanges" className="text-secondary/70 hover:text-primary text-sm font-medium transition-colors">Política de Trocas e Devoluções</Link></li>
                <li><Link to="/shipping" className="text-secondary/70 hover:text-primary text-sm font-medium transition-colors">Política de frete e pagamento</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold uppercase tracking-wider text-sm mb-6 text-secondary border-b border-primary inline-block pb-1">Contato</h4>
              <ul className="space-y-4">
                 <li className="flex items-start text-secondary/70 text-sm font-medium">
                   <Phone className="w-4 h-4 mr-2 shrink-0 mt-0.5 text-primary" /> 
                   <span>{sacWhatsApp}</span>
                 </li>
                 <li className="flex items-start text-secondary/70 text-sm font-medium">
                   <MessageCircle className="w-4 h-4 mr-2 shrink-0 mt-0.5 text-primary" /> 
                   <span>{salesWhatsApp}</span>
                 </li>
                 <li className="flex items-start text-secondary/70 text-sm font-medium">
                   <Mail className="w-4 h-4 mr-2 shrink-0 mt-0.5 text-primary" /> 
                   <span>{supportEmail}</span>
                 </li>
                 <li className="flex items-start text-secondary/70 text-sm font-medium mt-4 pt-4 border-t border-neutral-100">
                   <span>Avenida Beira Rio Nº 151</span>
                 </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold uppercase tracking-wider text-sm mb-6 text-secondary border-b border-primary inline-block pb-1">Social</h4>
              <div className="flex gap-4">
                 {settings.facebook && <a href={settings.facebook} className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-secondary hover:bg-primary hover:text-white transition-colors" target="_blank" rel="noreferrer"><Facebook className="w-5 h-5"/></a>}
                 {settings.tiktok && <a href={settings.tiktok} className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-secondary hover:bg-primary hover:text-white transition-colors" target="_blank" rel="noreferrer"><Youtube className="w-5 h-5"/></a>}
                 {settings.instagram && <a href={settings.instagram} className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-secondary hover:bg-primary hover:text-white transition-colors" target="_blank" rel="noreferrer"><Instagram className="w-5 h-5"/></a>}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-neutral-50 border-t border-neutral-200 py-6">
           <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
              <p className="text-secondary/60 text-xs font-medium">
                {settings.storeName} <br className="sm:hidden" />
                &copy; Todos os direitos reservados. {new Date().getFullYear()}
              </p>
              <div className="text-2xl font-bold uppercase tracking-widest opacity-20">
                 {settings.logoUrl ? (
                   <img src={settings.logoUrl} alt={settings.storeName} className="h-8 object-contain grayscale opacity-50" />
                 ) : (
                   settings.storeName
                 )}
              </div>
           </div>
        </div>
      </footer>

      {/* WhatsApp Floating Button */}
      <a
        href={`${salesWhatsAppUrl}?text=Ol%C3%A1%2C%20Gostaria%20de%20adquirir%20alguns%20de%20seus%20produtos.`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 bg-[#25D366] text-white p-4 rounded-full shadow-xl hover:bg-[#20bd5a] hover:-translate-y-1 transition-all z-40 group flex items-center justify-center"
        aria-label="Falar no WhatsApp"
      >
        <MessageCircle className="w-6 h-6" />
      </a>
    {/* Modal de Fale Conosco */}
      {isContactModalOpen && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsContactModalOpen(false)}></div>
            
            {/* Modal */}
            <div className="relative bg-white w-full max-w-lg rounded-sm shadow-2xl z-10 flex flex-col">
              {/* Header */}
              <div className="p-6 pb-2 text-center relative border-b border-neutral-100">
                 <button onClick={() => setIsContactModalOpen(false)} className="absolute right-4 top-4 text-neutral-400 hover:text-secondary transition-colors">
                    <X className="w-5 h-5" />
                 </button>
                 <h2 className="text-xl font-bold uppercase tracking-wider text-secondary">Fale Conosco</h2>
                 <p className="text-secondary/70 text-sm mt-1 mb-4">Preencha o formulário abaixo.</p>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                 <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setContactFeedback('Mensagem enviada com sucesso!'); setTimeout(() => { setIsContactModalOpen(false); setContactFeedback(''); }, 1200); }}>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">Nome</label>
                      <input type="text" required className="w-full border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm placeholder:text-neutral-300" />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">E-mail</label>
                      <input type="email" required className="w-full border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm placeholder:text-neutral-300" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">Telefone</label>
                        <input type="text" className="w-full border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm placeholder:text-neutral-300" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">Nº do pedido</label>
                        <input type="text" className="w-full border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm placeholder:text-neutral-300" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">Mensagem</label>
                      <textarea required rows={4} className="w-full border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm placeholder:text-neutral-300 resize-none"></textarea>
                    </div>

                    {/* Fake Recaptcha */}
                    <div className="flex justify-center mt-6">
                      <div className="border border-neutral-300 bg-neutral-50 px-4 py-3 rounded-sm flex items-center justify-between w-64 shadow-sm">
                         <div className="flex items-center gap-3">
                           <input type="checkbox" required className="w-6 h-6 border-neutral-300 text-primary focus:ring-primary rounded-sm cursor-pointer" />
                           <span className="text-secondary text-sm">Não sou um robô</span>
                         </div>
                         <div className="flex flex-col items-center">
                           <img src="https://www.gstatic.com/recaptcha/api2/logo_48.png" alt="reCAPTCHA" className="w-7 h-7" />
                           <span className="text-[9px] text-neutral-500 mt-0.5">reCAPTCHA</span>
                         </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {contactFeedback && (
                      <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-semibold text-center px-4 py-3 rounded-sm">
                        {contactFeedback}
                      </div>
                    )}
                    <div className="flex justify-center gap-3 pt-6 pb-2">
                       <button type="button" onClick={() => setIsContactModalOpen(false)} className="bg-[#f0f0f0] text-secondary font-bold text-sm px-6 py-2.5 rounded-sm hover:bg-neutral-200 transition-colors">
                          Fechar
                       </button>
                       <button type="submit" className="bg-[#c29656] text-white font-bold text-sm px-6 py-2.5 rounded-sm hover:bg-[#a67c42] transition-colors">
                          Enviar
                       </button>
                    </div>
                 </form>
              </div>
            </div>
         </div>
      )}
    </div>
  );
}
