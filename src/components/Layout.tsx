import React, { useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, Search, User, Heart, Menu, X, MessageCircle, Phone, Mail, Instagram, Youtube, Facebook, ChevronDown, Clock, Trophy } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { cn } from '../lib/utils';
import { useSettings } from '../hooks/useSettings';
import { useStorefront } from '../hooks/useStorefront';
import { useStoreCategories } from '../hooks/useStoreData';
import { createContactMessage, createNewsletterSubscriber } from '../lib/storeApi';
import { useCustomerSession } from '../context/CustomerSessionContext';
import { getWhatsAppUrl } from '../lib/customerForm';
import { WELCOME_NEWSLETTER_COUPON_CODE } from '../lib/newsletter';
import { StoreImage } from './StoreImage';

export function Layout() {
  const { t } = useStorefront();
  const { settings, loading: settingsLoading } = useSettings();
  const categories = useStoreCategories();
  const { activateNewsletterBenefitForCurrentCustomer } = useCustomerSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactFeedback, setContactFeedback] = useState('');
  const [contactError, setContactError] = useState('');
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterFeedback, setNewsletterFeedback] = useState('');
  const [newsletterError, setNewsletterError] = useState('');
  const [isSubmittingNewsletter, setIsSubmittingNewsletter] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    orderNumber: '',
    message: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredDropdownCategoryId, setHoveredDropdownCategoryId] = useState<string | null>(null);
  
  const { cartCount, wishlist } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const settingsReady = !settingsLoading;
  const salesWhatsApp = settingsReady ? (settings.supportSalesPhone || settings.phone) : '';
  const sacWhatsApp = settingsReady ? (settings.supportSacPhone || settings.phone) : '';
  const supportEmail = settingsReady ? (settings.supportEmail || settings.email) : '';
  const salesWhatsAppUrl = settingsReady
    ? getWhatsAppUrl(salesWhatsApp, settings.supportSalesPhoneCountry || settings.phoneCountry)
    : '#';
  const sacWhatsAppUrl = settingsReady
    ? getWhatsAppUrl(sacWhatsApp, settings.supportSacPhoneCountry || settings.phoneCountry)
    : '#';
  const floatingWhatsAppUrl = settingsReady
    ? getWhatsAppUrl(salesWhatsApp, settings.supportSalesPhoneCountry || settings.phoneCountry, t('whatsappFloatingMessage'))
    : '#';

  const closeMenu = () => setIsMenuOpen(false);

  const resetContactForm = () => {
    setContactForm({
      name: '',
      email: '',
      phone: '',
      orderNumber: '',
      message: '',
    });
    setContactFeedback('');
    setContactError('');
    setIsSubmittingContact(false);
  };

  const closeContactModal = () => {
    setIsContactModalOpen(false);
    resetContactForm();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/catalog?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  const handleContactChange = (field: keyof typeof contactForm, value: string) => {
    setContactForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleContactSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setContactError('');
    setIsSubmittingContact(true);

    try {
      await createContactMessage(contactForm);
      setContactFeedback(t('contactSuccess'));
      setTimeout(() => {
        closeContactModal();
      }, 1200);
    } catch (error) {
      setContactError(error instanceof Error ? error.message : 'Não foi possível enviar a sua mensagem.');
      setIsSubmittingContact(false);
    }
  };

  const handleNewsletterSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!newsletterEmail.trim()) {
      return;
    }

    setNewsletterError('');
    setNewsletterFeedback('');
    setIsSubmittingNewsletter(true);

    try {
      const subscriber = await createNewsletterSubscriber({
        email: newsletterEmail,
        source: 'footer-newsletter',
      });
      await activateNewsletterBenefitForCurrentCustomer(subscriber);
      setNewsletterFeedback(
        t('newsletterSuccess', {
          coupon: subscriber.couponCode || WELCOME_NEWSLETTER_COUPON_CODE,
        }),
      );
      setNewsletterEmail('');
    } catch (error) {
      setNewsletterError(error instanceof Error ? error.message : t('newsletterError'));
    } finally {
      setIsSubmittingNewsletter(false);
    }
  };

  const activeCategories = categories
    .filter((category) => category.status === 'Ativo')
    .sort((a, b) => a.menuOrder - b.menuOrder || a.nome.localeCompare(b.nome));
  const automaticCategoryKeys = new Set(['lancamentos', 'lançamentos', 'mais vendidos', 'mais-vendidos']);
  const isAutomaticCategory = (name: string) => automaticCategoryKeys.has(name.trim().toLowerCase());
  const menuCategories = activeCategories.filter((category) => category.showInMenu && !isAutomaticCategory(category.nome));
  const visibleMenuCategories = menuCategories.slice(0, 7);
  const dropdownCategories = activeCategories.filter((category) => !isAutomaticCategory(category.nome));
  const categoryLink = (categoryName: string, subcategoryName?: string) =>
    subcategoryName
      ? `/catalog?category=${encodeURIComponent(categoryName)}&subcategory=${encodeURIComponent(subcategoryName)}`
      : `/catalog?category=${encodeURIComponent(categoryName)}`;
  const activeDropdownCategory = useMemo(() => {
    if (!dropdownCategories.length) return null;
    return dropdownCategories.find((category) => category.id === hoveredDropdownCategoryId) || dropdownCategories[0];
  }, [dropdownCategories, hoveredDropdownCategoryId]);
  const automaticMenuLinks = [
    { name: t('menuLaunches'), path: '/catalog?sort=lancamentos', active: location.search.includes('sort=lancamentos') },
    { name: t('menuBestSellers'), path: '/catalog?sort=mais-vendidos', active: location.search.includes('sort=mais-vendidos') },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-white text-secondary font-sans selection:bg-primary/20 selection:text-primary">
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
                {settingsReady && settings.logoUrl ? (
                  <StoreImage
                    src={settings.logoUrl}
                    alt={settings.storeName}
                    className="h-10 sm:h-12 lg:h-14 object-contain"
                    loading="eager"
                    fetchPriority="high"
                  />
                ) : settingsReady ? (
                  <span className="text-xl sm:text-2xl font-serif font-bold text-secondary uppercase tracking-widest">{settings.storeName}</span>
                ) : (
                  <div className="h-10 sm:h-12 lg:h-14 w-32 sm:w-40 rounded bg-neutral-100 animate-pulse" />
                )}
              </Link>
            </div>

            {/* Search - Desktop */}
            <div className="hidden lg:flex flex-1 max-w-2xl relative pl-8 xl:pl-16">
              <form onSubmit={handleSearchSubmit} className="w-full">
                 <input
                   type="text"
                   placeholder={t('searchPlaceholder')}
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
                     <span className="text-secondary/70 text-xs text-left">{t('supportCenterPretitle')}</span>
                     <span className="text-secondary font-bold flex items-center">{t('supportCenterTitle')} <ChevronDown className="w-3 h-3 ml-1 text-secondary/50" /></span>
                  </div>

                  {/* Dropdown Content */}
                  <div className="absolute top-[calc(100%+15px)] right-1/2 translate-x-1/2 w-[280px] bg-white rounded-md shadow-[0_10px_30px_-10px_rgba(0,0,0,0.15)] border border-neutral-100 opacity-0 invisible group-hover/support:opacity-100 group-hover/support:visible transition-all duration-200 z-50 p-4 origin-top">
                    {/* Arrow pointing up */}
                    <div className="absolute -top-2 right-1/2 translate-x-1/2 w-4 h-4 bg-white border-t border-l border-neutral-100 transform rotate-45"></div>
                    
                    <div className="relative z-10 flex flex-col gap-4 cursor-default" onClick={e => e.stopPropagation()}>
                       {/* Whatsapp */}
                       <div>
                         <h4 className="font-bold text-secondary mb-2">{t('supportWhatsappTitle')}</h4>
                         <div className="flex flex-col gap-2">
                           <a href={salesWhatsAppUrl} className="flex items-start gap-3 hover:bg-neutral-50 p-2 rounded-sm transition-colors -mx-2">
                             <div className="text-green-500 bg-green-50 p-1.5 rounded-full shrink-0">
                               <MessageCircle className="w-4 h-4" />
                             </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-secondary leading-tight">{salesWhatsApp || ' '}</span>
                              <span className="text-[10px] text-secondary/70 font-bold uppercase tracking-wider mt-0.5">{t('supportSalesLabel')}</span>
                            </div>
                          </a>
                           <a href={sacWhatsAppUrl} className="flex items-start gap-3 hover:bg-neutral-50 p-2 rounded-sm transition-colors -mx-2">
                             <div className="text-green-500 bg-green-50 p-1.5 rounded-full shrink-0">
                               <MessageCircle className="w-4 h-4" />
                             </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-secondary leading-tight">{sacWhatsApp || ' '}</span>
                              <span className="text-[10px] text-secondary/70 font-bold uppercase tracking-wider mt-0.5">{t('supportSacLabel')}</span>
                            </div>
                          </a>
                         </div>
                       </div>

                       <div className="border-t border-neutral-100 pt-4">
                         <h4 className="font-bold text-secondary mb-2">{t('supportMessageTitle')}</h4>
                         <a href={`mailto:${supportEmail}`} className="flex items-start gap-3 hover:bg-neutral-50 p-2 rounded-sm transition-colors -mx-2">
                           <Mail className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                           <div className="flex flex-col">
                             <span className="font-bold text-secondary text-sm break-all leading-tight">{supportEmail || ' '}</span>
                             <span className="text-[10px] text-secondary/70 font-bold uppercase tracking-wider mt-1">{t('supportSacLabel')}</span>
                           </div>
                         </a>
                       </div>

                       <div className="border-t border-neutral-100 pt-4">
                         <h4 className="font-bold text-secondary mb-2">{t('supportHoursTitle')}</h4>
                         <div className="flex items-start gap-3 p-2 -mx-2">
                           <Clock className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                           <div className="flex flex-col text-sm text-secondary gap-0.5">
                             <span>{settingsReady ? settings.supportWeekHours : ' '}</span>
                             <span>{settingsReady ? settings.supportSaturdayHours : ' '}</span>
                           </div>
                         </div>
                       </div>

                       <button onClick={() => { resetContactForm(); setIsContactModalOpen(true); setIsMenuOpen(false); }} className="w-full flex items-center justify-center gap-2 bg-[#f6f2ec] text-secondary font-bold text-xs uppercase tracking-wider py-3 rounded-sm hover:bg-primary hover:text-white transition-colors mt-2">
                          <Mail className="w-4 h-4" /> {t('supportSendMessage')}
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
                     <span className="text-secondary/70 text-xs text-left">{t('welcome')}</span>
                     <span className="text-secondary font-bold flex items-center">
                       <span>{t('loginOrRegister')}</span> 
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
                <div
                  className="relative group/categories flex items-center gap-2 text-secondary font-bold py-3 pr-6 border-r border-[#e8dccb] cursor-pointer hover:text-primary transition-colors"
                  onMouseEnter={() => setHoveredDropdownCategoryId(dropdownCategories[0]?.id || null)}
                >
                  <Menu className="w-5 h-5 text-primary" />
                  <span className="text-sm font-bold uppercase tracking-wider">{t('allCategories')}</span>
                  <ChevronDown className="w-4 h-4 ml-1 text-secondary/50" />
                  <div className="absolute top-full left-0 w-[880px] bg-white rounded-b-md shadow-[0_14px_30px_-12px_rgba(0,0,0,0.18)] border border-neutral-100 opacity-0 invisible group-hover/categories:opacity-100 group-hover/categories:visible transition-all duration-200 z-50 overflow-hidden">
                    {dropdownCategories.length && activeDropdownCategory ? (
                      <div className="grid grid-cols-[320px_minmax(0,1fr)] min-h-[420px]">
                        <div className="border-r border-neutral-100 py-3 max-h-[420px] overflow-y-auto">
                          {dropdownCategories.map((category) => (
                            <Link
                              key={category.id}
                              to={categoryLink(category.nome)}
                              onMouseEnter={() => setHoveredDropdownCategoryId(category.id)}
                              className={cn(
                                'flex items-center justify-between px-4 py-3 text-[13px] font-semibold uppercase tracking-wide transition-colors',
                                activeDropdownCategory.id === category.id
                                  ? 'bg-neutral-100 text-secondary'
                                  : 'text-secondary hover:text-primary hover:bg-neutral-50',
                              )}
                            >
                              <span>{category.nome}</span>
                              {category.subcategories.length > 0 && <ChevronDown className="-rotate-90 w-4 h-4 text-neutral-400" />}
                            </Link>
                          ))}
                        </div>

                        <div className="p-6">
                          <div className="flex items-center justify-between gap-4 border-b border-neutral-100 pb-4 mb-4">
                            <h4 className="text-3xl font-serif text-secondary uppercase">{activeDropdownCategory.nome}</h4>
                            <Link to={categoryLink(activeDropdownCategory.nome)} className="text-[11px] font-bold uppercase tracking-wider text-secondary hover:text-primary">
                              Ver categoria
                            </Link>
                          </div>

                          {activeDropdownCategory.subcategories.length ? (
                            <div className="grid sm:grid-cols-2 gap-x-10 gap-y-4">
                              {activeDropdownCategory.subcategories.map((subcategory) => (
                                <Link
                                  key={subcategory}
                                  to={categoryLink(activeDropdownCategory.nome, subcategory)}
                                  className="text-[13px] font-semibold text-secondary hover:text-primary transition-colors"
                                >
                                  {subcategory}
                                </Link>
                              ))}
                            </div>
                          ) : (
                            <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-4 text-[12px] font-medium text-neutral-400">
                              Esta categoria ainda não possui subcategorias cadastradas.
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="px-4 py-3 text-[12px] font-medium text-neutral-400">{t('noAdditionalCategories')}</div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center pl-6 space-x-6 xl:space-x-8">
                  {automaticMenuLinks.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={cn(
                        "text-sm font-semibold tracking-wide uppercase text-secondary hover:text-primary transition-colors py-3 flex items-center",
                        link.active ? 'text-primary' : ''
                      )}
                    >
                      {link.name}
                    </Link>
                  ))}
                  {visibleMenuCategories.map((category) => (
                    category.subcategories.length ? (
                      <div key={category.id} className="relative group/submenu">
                        <Link
                          to={categoryLink(category.nome)}
                          className={cn(
                            'text-sm font-semibold tracking-wide uppercase text-secondary hover:text-primary transition-colors py-3 flex items-center gap-1',
                            location.search.includes(category.nome) ? 'text-primary' : '',
                          )}
                        >
                          {category.nome}
                          <ChevronDown className="w-3.5 h-3.5 text-secondary/50" />
                        </Link>
                        <div className="absolute top-full left-0 min-w-[240px] bg-white rounded-b-md shadow-[0_14px_30px_-12px_rgba(0,0,0,0.18)] border border-neutral-100 opacity-0 invisible group-hover/submenu:opacity-100 group-hover/submenu:visible transition-all duration-200 z-50 py-2">
                          {category.subcategories.map((subcategory) => (
                            <Link
                              key={subcategory}
                              to={categoryLink(category.nome, subcategory)}
                              className="block px-4 py-2.5 text-[13px] font-semibold text-secondary hover:text-primary hover:bg-neutral-50 transition-colors"
                            >
                              {subcategory}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <Link
                        key={category.id}
                        to={categoryLink(category.nome)}
                        className={cn(
                          "text-sm font-semibold tracking-wide uppercase text-secondary hover:text-primary transition-colors py-3 flex items-center",
                           location.search.includes(category.nome) ? 'text-primary' : ''
                        )}
                      >
                        {category.nome}
                      </Link>
                    )
                  ))}
                  <Link
                    to="/sorteios"
                    className={cn(
                      "text-sm font-semibold tracking-wide uppercase text-secondary hover:text-primary transition-colors py-3 flex items-center",
                      location.pathname === '/sorteios' ? 'text-primary' : ''
                    )}
                  >
                    {t('menuRaffles')}
                  </Link>
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
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-100 pl-12 pr-4 py-4 text-base rounded-sm focus:outline-none focus:ring-1 focus:ring-primary w-full transition-shadow"
              />
              <button 
                type="submit" 
                className="absolute right-2 bg-primary text-white px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-sm hover:bg-primary-dark transition-colors"
              >
                {t('searchButton')}
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
                    placeholder={t('mobileSearchPlaceholder')} 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-neutral-50 px-10 py-2.5 rounded-sm text-sm outline-none focus:ring-1 focus:ring-primary" 
                  />
               </form>
            </div>
            
            {automaticMenuLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={closeMenu}
                className="block px-3 py-3 text-sm font-semibold uppercase tracking-wide text-secondary hover:text-primary hover:bg-neutral-50 rounded-md"
              >
                {link.name}
              </Link>
            ))}
            {activeCategories.filter((category) => !isAutomaticCategory(category.nome)).map((category) => (
              <div key={category.id} className="px-3 py-1">
                <Link
                  to={categoryLink(category.nome)}
                  onClick={closeMenu}
                  className="block py-2 text-sm font-semibold uppercase tracking-wide text-secondary hover:text-primary hover:bg-neutral-50 rounded-md"
                >
                  {category.nome}
                </Link>
                {category.subcategories.length > 0 && (
                  <div className="pl-3 pb-1 space-y-1">
                    {category.subcategories.map((subcategory) => (
                      <Link
                        key={`${category.id}-${subcategory}`}
                        to={categoryLink(category.nome, subcategory)}
                        onClick={closeMenu}
                        className="block py-1.5 text-[12px] font-medium text-neutral-500 hover:text-primary"
                      >
                        {subcategory}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <Link
              to="/sorteios"
              onClick={closeMenu}
              className="block px-3 py-3 text-sm font-semibold uppercase tracking-wide text-secondary hover:text-primary hover:bg-neutral-50 rounded-md"
            >
              {t('menuRaffles')}
            </Link>
             <div className="border-t border-neutral-100 pt-4 mt-2 flex flex-col gap-4 px-3">
               <Link to="/account" onClick={closeMenu} className="flex items-center text-sm font-semibold uppercase text-secondary hover:text-primary">
                 <User className="w-4 h-4 mr-3" /> {t('myAccount')}
               </Link>
               <Link to="/wishlist" onClick={closeMenu} className="flex items-center text-sm font-semibold uppercase text-secondary hover:text-primary">
                 <Heart className="w-4 h-4 mr-3" /> {t('favorites')} ({wishlist.length})
               </Link>
               <Link to="/sorteios" onClick={closeMenu} className="flex items-center text-sm font-semibold uppercase text-secondary hover:text-primary">
                 <Trophy className="w-4 h-4 mr-3" /> {t('rafflesAndLoyalty')}
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
               {t('newsletterTitle')}
             </h3>
             <p className="text-secondary/70 text-sm mb-6">{t('newsletterSubtitle')}</p>
             <form className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto" onSubmit={(event) => { void handleNewsletterSubmit(event); }}>
               <input
                 type="email"
                 value={newsletterEmail}
                 onChange={(event) => setNewsletterEmail(event.target.value)}
                 placeholder={t('newsletterEmailPlaceholder')}
                 required
                 autoComplete="email"
                 className="flex-grow bg-white border border-neutral-300 px-4 py-3 text-sm focus:outline-none focus:border-primary rounded"
               />
               <button
                 type="submit"
                 disabled={isSubmittingNewsletter}
                 className="bg-primary text-white px-6 py-3 text-sm font-bold hover:bg-primary-dark transition-colors rounded uppercase tracking-wider"
               >
                 {isSubmittingNewsletter ? t('newsletterSubmitting') : t('subscribe')}
               </button>
             </form>
             {newsletterFeedback && (
               <p className="mt-4 text-sm font-semibold text-emerald-700">
                 {newsletterFeedback}
               </p>
             )}
             {newsletterError && (
               <p className="mt-4 text-sm font-semibold text-red-600">
                 {newsletterError}
               </p>
             )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            <div>
              <h4 className="font-bold uppercase tracking-wider text-sm mb-6 text-secondary border-b border-primary inline-block pb-1">{t('aboutStore')}</h4>
              <p className="text-secondary/70 text-sm leading-relaxed mb-6">
                {settingsReady ? settings.description : ''}
              </p>
            </div>

            <div>
              <h4 className="font-bold uppercase tracking-wider text-sm mb-6 text-secondary border-b border-primary inline-block pb-1">{t('content')}</h4>
              <ul className="space-y-4">
                <li><Link to="/about" className="text-secondary/70 hover:text-primary text-sm font-medium transition-colors">{t('aboutUs')}</Link></li>
                <li><Link to="/contact" className="text-secondary/70 hover:text-primary text-sm font-medium transition-colors">{t('contactUs')}</Link></li>
                <li><Link to="/privacy" className="text-secondary/70 hover:text-primary text-sm font-medium transition-colors">{t('privacyPolicy')}</Link></li>
                <li><Link to="/exchanges" className="text-secondary/70 hover:text-primary text-sm font-medium transition-colors">{t('exchangesPolicy')}</Link></li>
                <li><Link to="/shipping" className="text-secondary/70 hover:text-primary text-sm font-medium transition-colors">{t('shippingPolicy')}</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold uppercase tracking-wider text-sm mb-6 text-secondary border-b border-primary inline-block pb-1">{t('contact')}</h4>
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
              <h4 className="font-bold uppercase tracking-wider text-sm mb-6 text-secondary border-b border-primary inline-block pb-1">{t('social')}</h4>
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
                {settingsReady ? settings.storeName : ''} <br className="sm:hidden" />
                &copy; {t('allRightsReserved')} {new Date().getFullYear()}
              </p>
              <div className="text-2xl font-bold uppercase tracking-widest opacity-20">
                 {settingsReady && settings.logoUrl ? (
                   <StoreImage src={settings.logoUrl} alt={settings.storeName} className="h-8 object-contain grayscale opacity-50" />
                 ) : settingsReady ? (
                   settings.storeName
                 ) : (
                   <div className="h-8 w-24 rounded bg-neutral-200 animate-pulse" />
                 )}
              </div>
           </div>
        </div>
      </footer>

      {/* WhatsApp Floating Button */}
      {settingsReady && (
        <a
          href={floatingWhatsAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 bg-[#25D366] text-white p-4 rounded-full shadow-xl hover:bg-[#20bd5a] hover:-translate-y-1 transition-all z-40 group flex items-center justify-center"
          aria-label={t('whatsappFloatingLabel')}
        >
          <MessageCircle className="w-6 h-6" />
        </a>
      )}
    {/* Modal de Fale Conosco */}
      {isContactModalOpen && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeContactModal}></div>
            
            {/* Modal */}
            <div className="relative bg-white w-full max-w-lg rounded-sm shadow-2xl z-10 flex flex-col">
              {/* Header */}
              <div className="p-6 pb-2 text-center relative border-b border-neutral-100">
                 <button onClick={closeContactModal} className="absolute right-4 top-4 text-neutral-400 hover:text-secondary transition-colors">
                    <X className="w-5 h-5" />
                 </button>
                 <h2 className="text-xl font-bold uppercase tracking-wider text-secondary">{t('contactModalTitle')}</h2>
                 <p className="text-secondary/70 text-sm mt-1 mb-4">{t('contactModalSubtitle')}</p>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                 <form className="space-y-4" onSubmit={(event) => { void handleContactSubmit(event); }}>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">{t('contactName')}</label>
                      <input type="text" required value={contactForm.name} onChange={(event) => handleContactChange('name', event.target.value)} className="w-full border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm placeholder:text-neutral-300" />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">{t('contactEmail')}</label>
                      <input type="email" required value={contactForm.email} onChange={(event) => handleContactChange('email', event.target.value)} className="w-full border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm placeholder:text-neutral-300" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">{t('contactPhone')}</label>
                        <input type="text" value={contactForm.phone} onChange={(event) => handleContactChange('phone', event.target.value)} className="w-full border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm placeholder:text-neutral-300" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">{t('contactOrderNumber')}</label>
                        <input type="text" value={contactForm.orderNumber} onChange={(event) => handleContactChange('orderNumber', event.target.value)} className="w-full border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm placeholder:text-neutral-300" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">{t('contactMessage')}</label>
                      <textarea required rows={4} value={contactForm.message} onChange={(event) => handleContactChange('message', event.target.value)} className="w-full border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm placeholder:text-neutral-300 resize-none"></textarea>
                    </div>

                    {/* Actions */}
                    {contactError && (
                      <div className="bg-red-50 border border-red-100 text-red-700 text-sm font-semibold text-center px-4 py-3 rounded-sm">
                        {contactError}
                      </div>
                    )}
                    {contactFeedback && (
                      <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-semibold text-center px-4 py-3 rounded-sm">
                        {contactFeedback}
                      </div>
                    )}
                    <div className="flex justify-center gap-3 pt-6 pb-2">
                       <button type="button" onClick={closeContactModal} className="bg-[#f0f0f0] text-secondary font-bold text-sm px-6 py-2.5 rounded-sm hover:bg-neutral-200 transition-colors">
                          {t('close')}
                       </button>
                       <button type="submit" disabled={isSubmittingContact || Boolean(contactFeedback)} className="bg-[#c29656] text-white font-bold text-sm px-6 py-2.5 rounded-sm hover:bg-[#a67c42] transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                          {isSubmittingContact ? `${t('send')}...` : t('send')}
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
