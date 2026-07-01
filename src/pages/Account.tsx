import React, { useEffect, useMemo, useRef, useState } from 'react';
import { User, Package, MapPin, LogOut, X, Loader2, Star, Trophy } from 'lucide-react';
import {
  type StoreCustomerAddress,
  useCustomerSession,
} from '../context/CustomerSessionContext';
import { useLoyalty } from '../hooks/useLoyalty';
import { useStorefront } from '../hooks/useStorefront';
import { Link } from 'react-router-dom';
import { StoreCountrySelect } from '../components/StoreCountrySelect';
import { StorePhoneField } from '../components/StorePhoneField';
import {
  AddressCountryCode,
  formatBirthDate,
  formatPostalCode,
  getAddressLabels,
  getBirthDatePlaceholder,
  getPhonePlaceholder,
  isBirthDateComplete,
  isBirthDateValid,
  isAddressLookupComplete,
  isManualAddressCountry,
  lookupAddressByCountry,
  toBirthDateIso,
} from '../lib/customerForm';

type AddressFormData = {
  nome: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
};

type ProfileFormData = {
  fullName: string;
  cellphone: string;
  birthDate: string;
  gender: string;
  phoneCountry: AddressCountryCode;
};

type ZipcodeStatusTone = 'idle' | 'loading' | 'success' | 'warning' | 'error' | 'manual';

const INITIAL_ADDRESS_DATA: AddressFormData = {
  nome: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  localidade: '',
  uf: '',
};

const INITIAL_PROFILE_FORM: ProfileFormData = {
  fullName: 'Cliente Teste',
  cellphone: '(321) 373-4253',
  birthDate: '1990-01-01',
  gender: 'feminino',
  phoneCountry: 'US',
};

const ACCOUNT_COUNTRY: AddressCountryCode = 'US';

const addressFieldClass =
  'w-full border border-neutral-300 px-4 py-3 bg-white focus:outline-none focus:border-primary transition-colors rounded-sm disabled:bg-neutral-100 disabled:text-secondary/50 disabled:cursor-not-allowed';

const zipcodeStatusToneClasses: Record<Exclude<ZipcodeStatusTone, 'idle'>, string> = {
  manual: 'text-neutral-500',
  loading: 'text-neutral-500',
  success: 'text-emerald-600',
  warning: 'text-amber-600',
  error: 'text-red-500',
};

export function Account() {
  const [activeTab, setActiveTab] = useState<'orders' | 'addresses' | 'data'>('orders');
  const { points } = useLoyalty();
  const { locale, t } = useStorefront();
  const {
    currentCustomer,
    primaryAddress,
    isLoggedIn,
    isSessionLoading,
    login,
    logout,
    updateProfile,
    saveAddress,
    removeAddress,
  } = useCustomerSession();
  
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isEditDataModalOpen, setIsEditDataModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [addressCountry, setAddressCountry] = useState<AddressCountryCode>(ACCOUNT_COUNTRY);
  const [cep, setCep] = useState('');
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [addressData, setAddressData] = useState<AddressFormData>(INITIAL_ADDRESS_DATA);
  const [profileForm, setProfileForm] = useState<ProfileFormData>(INITIAL_PROFILE_FORM);
  const [zipcodeStatusTone, setZipcodeStatusTone] = useState<ZipcodeStatusTone>('idle');
  const [isAddressUnlocked, setIsAddressUnlocked] = useState(false);
  const birthDateInputRef = useRef<HTMLInputElement | null>(null);
  const addressLabels = useMemo(() => getAddressLabels(addressCountry, locale), [addressCountry, locale]);
  const birthDatePlaceholder = useMemo(() => getBirthDatePlaceholder(locale), [locale]);
  const phonePlaceholder = useMemo(() => getPhonePlaceholder(profileForm.phoneCountry), [profileForm.phoneCountry]);
  const formattedBirthDate = useMemo(() => formatBirthDate(profileForm.birthDate, locale), [locale, profileForm.birthDate]);
  const hasCompleteBirthDate = useMemo(() => isBirthDateComplete(formattedBirthDate), [formattedBirthDate]);
  const hasInvalidBirthDate = useMemo(
    () => hasCompleteBirthDate && !isBirthDateValid(formattedBirthDate, locale),
    [formattedBirthDate, hasCompleteBirthDate, locale],
  );
  const hasValidatedAddressLookup = useMemo(
    () => (isManualAddressCountry(addressCountry) && isAddressUnlocked) || zipcodeStatusTone === 'success',
    [addressCountry, isAddressUnlocked, zipcodeStatusTone],
  );

  useEffect(() => {
    setAddressCountry((prev) => (prev === ACCOUNT_COUNTRY ? prev : ACCOUNT_COUNTRY));
    setProfileForm((prev) =>
      prev.phoneCountry === ACCOUNT_COUNTRY ? prev : { ...prev, phoneCountry: ACCOUNT_COUNTRY },
    );
  }, []);

  useEffect(() => {
    if (!currentCustomer) return;

    setProfileForm({
      fullName: currentCustomer.fullName,
      cellphone: currentCustomer.phone,
      birthDate: currentCustomer.birthDate,
      gender: currentCustomer.gender,
      phoneCountry: currentCustomer.phoneCountry || ACCOUNT_COUNTRY,
    });
  }, [currentCustomer]);

  const resetAddressForm = () => {
    setEditingAddressId(null);
    setAddressCountry(ACCOUNT_COUNTRY);
    setCep('');
    setAddressData(INITIAL_ADDRESS_DATA);
    setIsSearchingCep(false);
    setZipcodeStatusTone('idle');
    setIsAddressUnlocked(false);
  };

  const closeAddressModal = () => {
    setIsAddressModalOpen(false);
    resetAddressForm();
  };

  const handleOpenAddressModal = (address?: StoreCustomerAddress) => {
    resetAddressForm();

    if (address) {
      setEditingAddressId(address.id);
      setCep(address.postalCode);
      setAddressData({
        nome: address.label,
        logradouro: address.street,
        numero: address.number,
        complemento: address.complement,
        bairro: address.neighborhood,
        localidade: address.city,
        uf: address.region,
      });
      setIsAddressUnlocked(true);
      setZipcodeStatusTone('success');
    }

    setIsAddressModalOpen(true);
  };

  const clearAddressFields = (formattedZipcode: string) => {
    setCep(formattedZipcode);
    setAddressData((prev) => ({
      ...prev,
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      localidade: '',
      uf: '',
    }));
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedCep = formatPostalCode(e.target.value, addressCountry);
    const manualCountry = isManualAddressCountry(addressCountry);

    clearAddressFields(formattedCep);
    setIsAddressUnlocked(manualCountry);

    if (manualCountry) {
      setIsSearchingCep(false);
      setZipcodeStatusTone('manual');
      return;
    }

    if (!isAddressLookupComplete(addressCountry, formattedCep)) {
      setIsSearchingCep(false);
      setZipcodeStatusTone('idle');
      return;
    }

    setIsSearchingCep(true);
    setZipcodeStatusTone('loading');

    try {
      const data = await lookupAddressByCountry(addressCountry, formattedCep);

      if (data) {
        setAddressData((prev) => ({
          ...prev,
          logradouro: data.street,
          bairro: data.neighborhood,
          localidade: data.city,
          uf: data.region,
        }));
        setZipcodeStatusTone('success');
      } else {
        setZipcodeStatusTone('warning');
      }

      setIsAddressUnlocked(true);
    } catch (error) {
      console.error('Erro ao buscar CEP', error);
      setZipcodeStatusTone('error');
      setIsAddressUnlocked(true);
    } finally {
      setIsSearchingCep(false);
    }
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await saveAddress({
      id: editingAddressId || '',
      label: addressData.nome,
      country: ACCOUNT_COUNTRY,
      postalCode: cep,
      street: addressData.logradouro,
      number: addressData.numero,
      complement: addressData.complemento,
      neighborhood: addressData.bairro,
      city: addressData.localidade,
      region: addressData.uf,
      isPrimary: editingAddressId
        ? currentCustomer?.addresses.find((address) => address.id === editingAddressId)?.isPrimary
        : !currentCustomer?.addresses.length,
    });

    closeAddressModal();
  };

  const isAddressFieldsDisabled = !isAddressUnlocked || isSearchingCep;
  const zipcodeStatusMessage = {
    idle: addressCountry === 'BR' ? t('addressFieldsLockedHint') : t('postalFieldsLockedHint'),
    manual: t('addressManualCountryHint'),
    loading: addressCountry === 'BR' ? t('zipcodeLookupLoading') : t('postalLookupLoading'),
    success: addressCountry === 'BR' ? t('zipcodeLookupSuccess') : t('postalLookupSuccess'),
    warning: addressCountry === 'BR' ? t('zipcodeLookupNotFound') : t('postalLookupNotFound'),
    error: addressCountry === 'BR' ? t('zipcodeLookupError') : t('postalLookupError'),
  }[zipcodeStatusTone];

  if (isSessionLoading) {
    return (
      <div className="max-w-md mx-auto px-4 py-20">
        <div className="bg-neutral-50 p-8 border border-neutral-200 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-secondary/70">Loading your account...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto px-4 py-20">
        <h1 className="text-3xl font-serif font-bold text-secondary mb-8 text-center uppercase tracking-wider border-b-2 border-primary pb-4">{t('accountTitle')}</h1>
        
        <div className="bg-neutral-50 p-8 border border-neutral-200">
           <h2 className="text-lg font-bold text-secondary mb-6 uppercase tracking-wider">{t('alreadyCustomer')}</h2>
           <form
             onSubmit={async (e) => {
               e.preventDefault();
               const result = await login(loginEmail, loginPassword);

               if (!result.ok) {
                 setLoginError(t('invalidLoginCredentials'));
                 return;
               }

               setLoginError('');
             }}
             className="space-y-4"
           >
              <div>
                 <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">E-mail</label>
                 <input
                   required
                   type="email"
                   value={loginEmail}
                   onChange={(e) => setLoginEmail(e.target.value)}
                   className="w-full border border-neutral-300 px-4 py-3 bg-white focus:outline-none focus:border-primary transition-colors rounded-sm"
                 />
              </div>
              <div>
                 <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">{t('password')}</label>
                 <input
                   required
                   type="password"
                   value={loginPassword}
                   onChange={(e) => setLoginPassword(e.target.value)}
                   className="w-full border border-neutral-300 px-4 py-3 bg-white focus:outline-none focus:border-primary transition-colors rounded-sm"
                 />
              </div>
              <div className="flex justify-between items-center text-sm pt-2">
                 <a href="#" className="text-secondary/70 hover:text-primary transition-colors">{t('forgotPassword')}</a>
              </div>
              <button type="submit" className="w-full bg-primary text-white px-8 py-3 font-bold uppercase tracking-wider text-sm hover:bg-primary-dark transition-colors rounded-sm mt-4">
                 {t('login')}
              </button>
              {loginError ? <p className="text-sm font-medium text-red-500">{loginError}</p> : null}
           </form>

           <div className="my-8 text-center border-t border-neutral-200 relative">
              <span className="bg-neutral-50 px-4 text-xs font-bold uppercase text-secondary/50 absolute -top-2 left-1/2 -translate-x-1/2">{t('or')}</span>
           </div>

           <h2 className="text-lg font-bold text-secondary mb-4 uppercase tracking-wider">{t('noAccountYet')}</h2>
           <p className="text-sm text-secondary/70 mb-6">{t('noAccountSubtitle')}</p>
           <Link to="/register" className="block text-center w-full bg-secondary text-white px-8 py-3 font-bold uppercase tracking-wider text-sm hover:bg-primary transition-colors rounded-sm">
              {t('createAccount')}
           </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
      <div className="flex flex-col md:flex-row items-start gap-8">
        
        {/* Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0 bg-neutral-50 border border-neutral-200">
           <div className="p-6 border-b border-neutral-200">
              <p className="text-sm text-secondary/70">{t('hello')}</p>
              <h2 className="text-xl font-serif font-bold text-secondary truncate">{currentCustomer?.fullName || t('accountTitle')}</h2>
           </div>
           <nav className="p-4 space-y-2">
              <button 
                onClick={() => setActiveTab('orders')}
                className={`w-full flex items-center px-4 py-3 text-sm font-bold uppercase tracking-wider transition-colors rounded-sm ${activeTab === 'orders' ? 'bg-primary text-white' : 'text-secondary hover:bg-neutral-200'}`}
              >
                <Package className="w-4 h-4 mr-3" /> {t('myOrders')}
              </button>
              <button 
                onClick={() => setActiveTab('addresses')}
                className={`w-full flex items-center px-4 py-3 text-sm font-bold uppercase tracking-wider transition-colors rounded-sm ${activeTab === 'addresses' ? 'bg-primary text-white' : 'text-secondary hover:bg-neutral-200'}`}
              >
                <MapPin className="w-4 h-4 mr-3" /> {t('myAddresses')}
              </button>
              <button 
                onClick={() => setActiveTab('data')}
                className={`w-full flex items-center px-4 py-3 text-sm font-bold uppercase tracking-wider transition-colors rounded-sm ${activeTab === 'data' ? 'bg-primary text-white' : 'text-secondary hover:bg-neutral-200'}`}
              >
                <User className="w-4 h-4 mr-3" /> {t('myData')}
              </button>
              <button 
                onClick={() => {
                  void logout();
                }}
                className="w-full flex items-center px-4 py-3 text-sm font-bold uppercase tracking-wider text-red-500 hover:bg-red-50 transition-colors rounded-sm mt-4 border border-transparent hover:border-red-100"
              >
                <LogOut className="w-4 h-4 mr-3" /> {t('logout')}
              </button>
           </nav>
        </div>

        {/* Content */}
        <div className="flex-1 w-full space-y-8">
           {/* Loyalty Summary Card */}
           <div className="bg-gradient-to-r from-secondary to-neutral-800 rounded-3xl p-8 text-white flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl shadow-secondary/5">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/10">
                  <Star className="w-8 h-8 text-primary fill-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-serif font-bold">{t('loyaltyClubTitle')}</h3>
                  <p className="text-white/60 text-sm">{t('loyaltyPointsBalance', { points })}</p>
                </div>
              </div>
              <Link 
                to="/sorteios" 
                className="bg-primary text-white px-8 py-3 rounded-full text-[11px] font-bold uppercase tracking-widest hover:bg-primary-dark transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
              >
                <Trophy className="w-4 h-4" />
                {t('viewRaffles')}
              </Link>
           </div>

           {activeTab === 'orders' && (
             <div>
                <h3 className="text-2xl font-serif font-bold text-secondary mb-6 border-b border-neutral-200 pb-4">{t('myOrders')}</h3>
                <div className="bg-white border border-neutral-200 p-6 rounded-sm text-center py-16">
                   <Package className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                   <h4 className="text-lg font-bold text-secondary mb-2">{t('noOrdersYet')}</h4>
                   <p className="text-secondary/70 mb-6">{t('whatAboutNews')}</p>
                   <Link to="/catalog" className="inline-block bg-primary text-white px-8 py-3 font-bold uppercase tracking-wider text-sm hover:bg-primary-dark transition-colors rounded-sm">
                     {t('seeProducts')}
                   </Link>
                </div>
             </div>
           )}

           {activeTab === 'addresses' && (
             <div>
                <h3 className="text-2xl font-serif font-bold text-secondary mb-6 border-b border-neutral-200 pb-4">{t('myAddresses')}</h3>
                <div className="grid sm:grid-cols-2 gap-6">
                   {currentCustomer?.addresses.length ? currentCustomer.addresses.map((address) => (
                     <div key={address.id} className="bg-neutral-50 border border-neutral-200 p-6 rounded-sm relative">
                        {address.isPrimary ? (
                          <span className="absolute top-4 right-4 bg-primary text-white text-[10px] font-bold px-2 py-1 uppercase tracking-wider rounded-sm">{t('primary')}</span>
                        ) : null}
                        <h4 className="font-bold text-secondary uppercase tracking-wider mb-2">{address.label || t('homeAddress')}</h4>
                        <p className="text-sm text-secondary/70 mb-1">{address.street}, {address.number}{address.complement ? ` - ${address.complement}` : ''}</p>
                        <p className="text-sm text-secondary/70 mb-1">{address.city} - {address.region}</p>
                        <p className="text-sm text-secondary/70 mb-4">{addressLabels.postalCodeLabel}: {address.postalCode}</p>
                        <div className="flex gap-4">
                           <button type="button" onClick={() => handleOpenAddressModal(address)} className="text-xs font-bold uppercase text-primary hover:text-primary-dark">{t('edit')}</button>
                           <button type="button" onClick={() => { void removeAddress(address.id); }} className="text-xs font-bold uppercase text-red-500 hover:text-red-700">{t('remove')}</button>
                        </div>
                     </div>
                   )) : (
                     <div className="sm:col-span-2 rounded-sm border border-dashed border-neutral-300 bg-neutral-50 px-6 py-10 text-center">
                        <p className="text-sm text-secondary/70">{t('shippingAddressEmpty')}</p>
                     </div>
                   )}
                   <button
                      onClick={() => handleOpenAddressModal()}
                      className="border-2 border-dashed border-neutral-300 flex flex-col items-center justify-center p-6 rounded-sm text-secondary hover:border-primary hover:text-primary transition-colors min-h-[200px]"
                   >
                      <span className="text-4xl font-light mb-2">+</span>
                      <span className="font-bold uppercase tracking-wider text-sm">{t('addAddress')}</span>
                   </button>
                </div>
             </div>
           )}

           {activeTab === 'data' && (
             <div className="space-y-8">
                <div>
                   <h3 className="text-2xl font-serif font-bold text-secondary mb-6 border-b border-neutral-200 pb-4">{t('myData')}</h3>
                   <form className="bg-white border border-neutral-200 p-6 md:p-8 rounded-sm space-y-6">
                      <div className="grid sm:grid-cols-2 gap-6">
                        <div>
                           <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">{t('fullName')}</label>
                           <input type="text" value={currentCustomer?.fullName || ''} className="w-full border border-neutral-300 px-4 py-3 bg-neutral-100 focus:outline-none rounded-sm text-secondary/70" readOnly />
                        </div>
                        <div>
                           <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">E-mail</label>
                           <input type="email" value={currentCustomer?.email || ''} className="w-full border border-neutral-300 px-4 py-3 bg-neutral-100 focus:outline-none rounded-sm text-secondary/70" readOnly title="For email changes, please contact support." />
                        </div>
                        <div>
                           <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">{t('cellphone')}</label>
                           <input type="text" value={profileForm.cellphone} className="w-full border border-neutral-300 px-4 py-3 bg-neutral-100 focus:outline-none rounded-sm text-secondary/70" readOnly />
                        </div>
                        <div>
                           <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">{t('birthDate')}</label>
                           <input
                             type="text"
                             value={formattedBirthDate}
                             className="w-full border border-neutral-300 px-4 py-3 bg-neutral-100 focus:outline-none rounded-sm text-secondary/70"
                             readOnly
                           />
                        </div>
                        <div>
                           <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">{t('gender')}</label>
                           <select value={profileForm.gender} disabled className="w-full border border-neutral-300 px-4 py-3 bg-neutral-100 focus:outline-none rounded-sm text-secondary/70 appearance-none pointer-events-none cursor-not-allowed">
                              <option value="feminino">{t('female')}</option>
                              <option value="masculino">{t('male')}</option>
                              <option value="outro">{t('otherOrNoAnswer')}</option>
                           </select>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-neutral-100 mt-6 flex justify-between items-center">
                         <button 
                            type="button" 
                            onClick={() => setIsPasswordModalOpen(true)}
                            className="text-secondary font-bold uppercase tracking-wider text-sm hover:text-primary transition-colors"
                         >
                            {t('changePassword')}
                         </button>
                         <div className="flex gap-4">
                            <button 
                               type="button" 
                               onClick={() => setIsEditDataModalOpen(true)}
                               className="border border-secondary text-secondary hover:bg-neutral-100 px-8 py-3 font-bold uppercase tracking-wider text-sm transition-colors rounded-sm"
                            >
                               {t('edit')}
                            </button>
                            <button type="button" className="bg-secondary text-white px-8 py-3 font-bold uppercase tracking-wider text-sm hover:bg-primary transition-colors rounded-sm">
                               {t('saveData')}
                            </button>
                         </div>
                      </div>
                   </form>
                </div>
             </div>
           )}
        </div>
      </div>

      {/* Address Modal */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white max-w-2xl w-full rounded-sm shadow-xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={closeAddressModal}
              className="absolute top-4 right-4 text-secondary/50 hover:text-secondary transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-2xl font-serif font-bold text-secondary mb-6 border-b border-neutral-200 pb-4">
              {t('addAddress')}
            </h3>
            
            <form onSubmit={handleAddressSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">{t('addressNickname')}</label>
                <input 
                  type="text" 
                  required
                  value={addressData.nome}
                  onChange={(e) => setAddressData({...addressData, nome: e.target.value})}
                  className={addressFieldClass} 
                  placeholder="Ex: Casa"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">{t('country')}</label>
                <div className="max-w-[280px] space-y-2">
                  <StoreCountrySelect
                    value={ACCOUNT_COUNTRY}
                    onChange={() => undefined}
                    locale={locale}
                    disabled
                  />
                  <p className="text-[11px] text-neutral-500">{t('usOnlyShippingHint')}</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">{addressLabels.postalCodeLabel}</label>
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                      <div className="relative w-full sm:max-w-[180px]">
                        <input 
                          type="text" 
                          required
                          value={cep}
                          onChange={handleCepChange}
                          className={addressFieldClass} 
                          placeholder={addressLabels.postalPlaceholder}
                          inputMode="numeric"
                        />
                        {isSearchingCep && (
                          <Loader2 className="absolute right-3 top-3.5 w-5 h-5 animate-spin text-primary" />
                        )}
                      </div>
                    </div>
                    <div className={`text-[11px] font-medium flex items-center gap-2 ${zipcodeStatusTone === 'idle' ? 'text-neutral-500' : zipcodeStatusToneClasses[zipcodeStatusTone]}`}>
                      {isSearchingCep ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      <span>{zipcodeStatusMessage}</span>
                    </div>
                  </div>
                </div>
                
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">{t('street')}</label>
                  <input 
                    type="text" 
                    required
                    value={addressData.logradouro}
                    disabled={isAddressFieldsDisabled}
                    onChange={(e) => setAddressData({...addressData, logradouro: e.target.value})}
                    className={addressFieldClass} 
                    placeholder="Rua, Avenida, etc."
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">{t('number')}</label>
                  <input 
                    type="text" 
                    required
                    disabled={isAddressFieldsDisabled}
                    value={addressData.numero}
                    onChange={(e) => setAddressData({...addressData, numero: e.target.value})}
                    className={addressFieldClass} 
                    placeholder="Ex: 123"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">{t('complement')}</label>
                  <input 
                    type="text" 
                    disabled={isAddressFieldsDisabled}
                    value={addressData.complemento}
                    onChange={(e) => setAddressData({...addressData, complemento: e.target.value})}
                    className={addressFieldClass} 
                    placeholder="Ex: Apto 4"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">{t('neighborhood')}</label>
                  <input 
                    type="text" 
                    required
                    value={addressData.bairro}
                    disabled={isAddressFieldsDisabled}
                    onChange={(e) => setAddressData({...addressData, bairro: e.target.value})}
                    className={addressFieldClass} 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">{t('city')}</label>
                  <input 
                    type="text" 
                    required
                    value={addressData.localidade}
                    disabled={isAddressFieldsDisabled}
                    onChange={(e) => setAddressData({...addressData, localidade: e.target.value})}
                    className={addressFieldClass} 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">{addressLabels.regionLabel}</label>
                  <input 
                    type="text" 
                    required
                    value={addressData.uf}
                    disabled={isAddressFieldsDisabled}
                    onChange={(e) => setAddressData({...addressData, uf: e.target.value})}
                    className={addressFieldClass} 
                  />
                </div>
              </div>

              <div className="pt-4 mt-6 flex justify-end gap-4">
                <button 
                  type="button" 
                  onClick={closeAddressModal}
                  className="px-6 py-3 font-bold uppercase tracking-wider text-sm text-secondary hover:text-secondary/70 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button 
                  type="submit" 
                  disabled={isSearchingCep || !isAddressUnlocked || !hasValidatedAddressLookup}
                  className="bg-secondary text-white px-8 py-3 font-bold uppercase tracking-wider text-sm hover:bg-primary transition-colors rounded-sm disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {t('saveAddress')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Data Modal */}
      {isEditDataModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white max-w-2xl w-full rounded-sm shadow-xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setIsEditDataModalOpen(false)}
              className="absolute top-4 right-4 text-secondary/50 hover:text-secondary transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-2xl font-serif font-bold text-secondary mb-6 border-b border-neutral-200 pb-4">
              {t('editMyData')}
            </h3>
            
            <form
              onSubmit={async (e) => {
                e.preventDefault();

                if (hasInvalidBirthDate) {
                  birthDateInputRef.current?.focus();
                  return;
                }

                await updateProfile({
                  fullName: profileForm.fullName,
                  phone: profileForm.cellphone,
                  phoneCountry: ACCOUNT_COUNTRY,
                  birthDate: toBirthDateIso(profileForm.birthDate, locale),
                  gender: profileForm.gender,
                });

                setIsEditDataModalOpen(false);
              }}
              className="space-y-6"
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">{t('fullName')}</label>
                   <input
                     type="text"
                     value={profileForm.fullName}
                     onChange={(e) => setProfileForm((prev) => ({ ...prev, fullName: e.target.value }))}
                     className="w-full border border-neutral-300 px-4 py-3 bg-white focus:outline-none focus:border-primary transition-colors rounded-sm"
                   />
                </div>
                <div className="sm:col-span-2">
                   <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">{t('cellphone')}</label>
                   <StorePhoneField
                     locale={locale}
                     name="accountCellphone"
                     countryCode={ACCOUNT_COUNTRY}
                     value={profileForm.cellphone}
                     placeholder={phonePlaceholder}
                     disableCountrySelection
                     onChange={(nextValue) =>
                       setProfileForm((prev) => ({
                         ...prev,
                         phoneCountry: ACCOUNT_COUNTRY,
                         cellphone: nextValue,
                       }))
                     }
                   />
                </div>
                <div>
                   <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">{t('birthDate')}</label>
                   <input
                     ref={birthDateInputRef}
                     type="text"
                     inputMode="numeric"
                     value={formattedBirthDate}
                     onChange={(e) => setProfileForm((prev) => ({ ...prev, birthDate: formatBirthDate(e.target.value, locale) }))}
                     placeholder={birthDatePlaceholder}
                     maxLength={10}
                     aria-invalid={hasInvalidBirthDate}
                     className={`w-full border px-4 py-3 bg-white focus:outline-none transition-colors rounded-sm ${hasInvalidBirthDate ? 'border-red-400 focus:border-red-500' : 'border-neutral-300 focus:border-primary'}`}
                   />
                   {hasInvalidBirthDate ? (
                     <p className="mt-2 text-[12px] text-red-500">{t('birthDateInvalid')}</p>
                   ) : null}
                </div>
                <div>
                   <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">{t('gender')}</label>
                   <select
                     value={profileForm.gender}
                     onChange={(e) => setProfileForm((prev) => ({ ...prev, gender: e.target.value }))}
                     className="w-full border border-neutral-300 px-4 py-3 bg-white focus:outline-none focus:border-primary transition-colors rounded-sm appearance-none"
                   >
                      <option value="feminino">Feminino</option>
                      <option value="masculino">Masculino</option>
                      <option value="outro">Outro / Prefiro não informar</option>
                   </select>
                </div>
              </div>

              <div className="pt-4 mt-6 flex justify-end gap-4">
                <button 
                  type="button" 
                  onClick={() => setIsEditDataModalOpen(false)}
                  className="px-6 py-3 font-bold uppercase tracking-wider text-sm text-secondary hover:text-secondary/70 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button 
                  type="submit" 
                  className="bg-secondary text-white px-8 py-3 font-bold uppercase tracking-wider text-sm hover:bg-primary transition-colors rounded-sm"
                >
                  Salvar Edição
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white max-w-lg w-full rounded-sm shadow-xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setIsPasswordModalOpen(false)}
              className="absolute top-4 right-4 text-secondary/50 hover:text-secondary transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-2xl font-serif font-bold text-secondary mb-6 border-b border-neutral-200 pb-4">
              Alterar Senha
            </h3>
            
            <form onSubmit={(e) => { e.preventDefault(); setIsPasswordModalOpen(false); }} className="space-y-4">
              <div>
                 <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">Senha Atual</label>
                 <input type="password" placeholder="Sua senha atual" required className="w-full border border-neutral-300 px-4 py-3 bg-white focus:outline-none focus:border-primary transition-colors rounded-sm" />
              </div>
              <div>
                 <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">Nova Senha</label>
                 <input type="password" placeholder="No mínimo 8 caracteres" required minLength={8} className="w-full border border-neutral-300 px-4 py-3 bg-white focus:outline-none focus:border-primary transition-colors rounded-sm" />
              </div>
              <div>
                 <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">Confirmar Nova Senha</label>
                 <input type="password" placeholder="Repita a nova senha" required minLength={8} className="w-full border border-neutral-300 px-4 py-3 bg-white focus:outline-none focus:border-primary transition-colors rounded-sm" />
              </div>

              <div className="pt-4 mt-6 flex justify-end gap-4">
                <button 
                  type="button" 
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-6 py-3 font-bold uppercase tracking-wider text-sm text-secondary hover:text-secondary/70 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button 
                  type="submit" 
                  className="bg-secondary text-white px-8 py-3 font-bold uppercase tracking-wider text-sm hover:bg-primary transition-colors rounded-sm"
                >
                  Atualizar Senha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
