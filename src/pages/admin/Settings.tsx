import React, { useEffect, useMemo, useState } from 'react';
import { Save, Languages, Image, Headphones, Truck, Users } from 'lucide-react';
import { showToast } from '../../lib/adminUtils';
import { StorePhoneField } from '../../components/StorePhoneField';
import { useTranslation } from 'react-i18next';
import { useSettings, StoreSettings } from '../../hooks/useSettings';
import { getAddressCountryOptions } from '../../lib/customerForm';
import { formatCurrencyValue } from '../../lib/currency';

const CURRENCY_OPTIONS = [
  { value: 'BRL', label: 'BRL - Real brasileiro' },
  { value: 'USD', label: 'USD - Dolar americano' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - Libra esterlina' },
  { value: 'CAD', label: 'CAD - Dolar canadense' },
  { value: 'AUD', label: 'AUD - Dolar australiano' },
] as const;

export function Settings() {
  const { t } = useTranslation();
  const { settings, updateSettings } = useSettings();
  const [localSettings, setLocalSettings] = useState<StoreSettings>(settings);
  const countryOptions = useMemo(() => getAddressCountryOptions('pt-BR'), []);
  const oneUnitLabel = useMemo(
    () => formatCurrencyValue(1, localSettings.storeCurrency, localSettings.siteLanguage),
    [localSettings.siteLanguage, localSettings.storeCurrency],
  );
  const hundredUnitsLabel = useMemo(
    () => formatCurrencyValue(100, localSettings.storeCurrency, localSettings.siteLanguage),
    [localSettings.siteLanguage, localSettings.storeCurrency],
  );

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setLocalSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setLocalSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    updateSettings(localSettings);
    showToast(t('settings.save') + '!');
  };

  const changeLanguage = (lng: 'pt-BR' | 'en-US') => {
    setLocalSettings((prev) => ({ ...prev, siteLanguage: lng }));
    showToast(`Idioma selecionado: ${lng === 'pt-BR' ? 'Português' : 'English'}`);
  };

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-3xl font-serif text-neutral-900 tracking-tight">{t('settings.title')}</h2>
          <p className="text-neutral-500 text-[13px]">{t('settings.subtitle')}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200/40 shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-6 md:p-10 space-y-10">
         {/* Internationalization */}
         <section>
            <div className="flex items-center gap-3 border-b border-neutral-100/60 pb-3 mb-6">
               <Languages className="w-4 h-4 text-neutral-900" />
               <h3 className="text-[11px] font-semibold uppercase tracking-widest text-neutral-900">{t('settings.language')}</h3>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-8 items-center bg-neutral-50/50 p-6 rounded-2xl border border-neutral-100">
              <div className="space-y-1">
                 <p className="text-[13px] font-semibold text-neutral-900">{t('settings.language')}</p>
                 <p className="text-[12px] text-neutral-500 leading-relaxed">{t('settings.language_desc')}</p>
              </div>
              <div className="flex gap-2">
                 <button 
                  onClick={() => changeLanguage('pt-BR')}
                  className={`flex-1 px-4 py-2.5 text-[12px] font-bold rounded-xl border transition-all ${
                    localSettings.siteLanguage === 'pt-BR'
                      ? 'bg-neutral-900 text-white border-neutral-900 shadow-md' 
                      : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
                  }`}
                 >
                    PT-BR (Português)
                 </button>
                 <button 
                  onClick={() => changeLanguage('en-US')}
                  className={`flex-1 px-4 py-2.5 text-[12px] font-bold rounded-xl border transition-all ${
                    localSettings.siteLanguage === 'en-US'
                      ? 'bg-neutral-900 text-white border-neutral-900 shadow-md' 
                      : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
                  }`}
                 >
                    EN-US (English)
                 </button>
              </div>
           </div>
         </section>

         {/* Identidade Visual */}
         <section>
            <div className="flex items-center gap-3 border-b border-neutral-100/60 pb-3 mb-6">
               <Image className="w-4 h-4 text-neutral-900" />
               <h3 className="text-[11px] font-semibold uppercase tracking-widest text-neutral-900">Identidade Visual</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
               <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">URL da Logomarca</label>
                  <input type="text" name="logoUrl" value={localSettings.logoUrl} onChange={handleChange} placeholder="https://exemplo.com/logo.png" className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] text-neutral-900" />
               </div>
            </div>
         </section>

         {/* Informações Gerais */}
         <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-neutral-900 mb-6 border-b border-neutral-100/60 pb-3">Informações Gerais</h3>
            <div className="grid sm:grid-cols-2 gap-6">
               <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">Nome da Loja</label>
                  <input type="text" name="storeName" value={localSettings.storeName} onChange={handleChange} className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] text-neutral-900" />
               </div>
               <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">Título do Site</label>
                  <input type="text" name="siteTitle" value={localSettings.siteTitle} onChange={handleChange} placeholder="Ex: Spaçodani | Moda Feminina" className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] text-neutral-900" />
                  <p className="text-[11px] text-neutral-400 mt-2">Aparece na aba do navegador e pode ser usado por buscadores.</p>
               </div>
               <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">E-mail de Contato</label>
                  <input type="email" name="email" value={localSettings.email} onChange={handleChange} className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] text-neutral-900" />
               </div>
               <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">Moeda da Loja</label>
                  <select name="storeCurrency" value={localSettings.storeCurrency} onChange={handleSelectChange} className="w-full border border-neutral-200/60 px-4 py-3 bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] text-neutral-900">
                    {CURRENCY_OPTIONS.map((currency) => (
                      <option key={currency.value} value={currency.value}>{currency.label}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-neutral-400 mt-2">Define como os precos e as cotacoes de frete serao exibidos no site.</p>
               </div>
               <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">WhatsApp / Telefone</label>
                  <StorePhoneField
                    locale="pt-BR"
                    name="settingsMainPhone"
                    countryCode={localSettings.phoneCountry}
                    value={localSettings.phone}
                    onChange={(nextValue, nextCountry) =>
                      setLocalSettings((prev) => ({
                        ...prev,
                        phoneCountry: nextCountry,
                        phone: nextValue,
                      }))
                    }
                  />
               </div>
            </div>
         </section>

         {/* Redes Sociais */}
         <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-neutral-900 mb-6 border-b border-neutral-100/60 pb-3">Redes Sociais</h3>
            <div className="grid sm:grid-cols-2 gap-6">
               <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">Instagram (URL)</label>
                  <input type="url" name="instagram" value={localSettings.instagram} onChange={handleChange} className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] text-neutral-900" />
               </div>
               <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">Facebook (URL)</label>
                  <input type="url" name="facebook" value={localSettings.facebook} onChange={handleChange} placeholder="https://facebook.com/..." className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] text-neutral-900" />
               </div>
               <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">TikTok (URL)</label>
                  <input type="url" name="tiktok" value={localSettings.tiktok} onChange={handleChange} placeholder="https://tiktok.com/@..." className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] text-neutral-900" />
               </div>
            </div>
         </section>

         <section>
            <div className="flex items-center gap-3 border-b border-neutral-100/60 pb-3 mb-6">
               <Users className="w-4 h-4 text-neutral-900" />
               <h3 className="text-[11px] font-semibold uppercase tracking-widest text-neutral-900">Cadastro de Clientes</h3>
            </div>

            <div className="rounded-2xl border border-neutral-100 bg-neutral-50/50 p-6">
               <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div className="max-w-2xl space-y-1.5">
                     <p className="text-[13px] font-semibold text-neutral-900">Permitir cadastro empresarial</p>
                     <p className="text-[12px] leading-relaxed text-neutral-500">
                        Quando desativado, a tela de cadastro aceita apenas consumidor final e a opcao &quot;Empresa&quot; fica visivel, porem bloqueada.
                     </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={localSettings.allowBusinessRegistration}
                    onClick={() =>
                      setLocalSettings((prev) => ({
                        ...prev,
                        allowBusinessRegistration: !prev.allowBusinessRegistration,
                      }))
                    }
                    className={`inline-flex min-w-[220px] items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all ${
                      localSettings.allowBusinessRegistration
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                        : 'border-neutral-200 bg-white text-neutral-700'
                    }`}
                  >
                    <div className="pr-4">
                      <p className="text-[12px] font-semibold uppercase tracking-wider">
                        {localSettings.allowBusinessRegistration ? 'Ativado' : 'Desativado'}
                      </p>
                      <p className="mt-1 text-[11px] text-neutral-500">
                        {localSettings.allowBusinessRegistration ? 'Cadastro PJ liberado na loja.' : 'Somente pessoa fisica no momento.'}
                      </p>
                    </div>
                    <span
                      className={`relative inline-flex h-7 w-12 flex-shrink-0 rounded-full transition-colors ${
                        localSettings.allowBusinessRegistration ? 'bg-emerald-500' : 'bg-neutral-300'
                      }`}
                    >
                      <span
                        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                          localSettings.allowBusinessRegistration ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </span>
                  </button>
               </div>
            </div>
         </section>

         {/* Central de Atendimento */}
         <section>
            <div className="flex items-center gap-3 border-b border-neutral-100/60 pb-3 mb-6">
               <Headphones className="w-4 h-4 text-neutral-900" />
               <h3 className="text-[11px] font-semibold uppercase tracking-widest text-neutral-900">Central de Atendimento</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
               <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">WhatsApp Vendas</label>
                  <StorePhoneField
                    locale="pt-BR"
                    name="settingsSalesPhone"
                    countryCode={localSettings.supportSalesPhoneCountry}
                    value={localSettings.supportSalesPhone}
                    onChange={(nextValue, nextCountry) =>
                      setLocalSettings((prev) => ({
                        ...prev,
                        supportSalesPhoneCountry: nextCountry,
                        supportSalesPhone: nextValue,
                      }))
                    }
                  />
               </div>
               <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">WhatsApp SAC</label>
                  <StorePhoneField
                    locale="pt-BR"
                    name="settingsSacPhone"
                    countryCode={localSettings.supportSacPhoneCountry}
                    value={localSettings.supportSacPhone}
                    onChange={(nextValue, nextCountry) =>
                      setLocalSettings((prev) => ({
                        ...prev,
                        supportSacPhoneCountry: nextCountry,
                        supportSacPhone: nextValue,
                      }))
                    }
                  />
               </div>
               <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">E-mail SAC</label>
                  <input type="email" name="supportEmail" value={localSettings.supportEmail} onChange={handleChange} placeholder="sac@sualoja.com.br" className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] text-neutral-900" />
               </div>
               <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">Horário dias úteis</label>
                  <input type="text" name="supportWeekHours" value={localSettings.supportWeekHours} onChange={handleChange} placeholder="Seg a Sex das 08h às 18h" className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] text-neutral-900" />
               </div>
               <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">Horário sábado</label>
                  <input type="text" name="supportSaturdayHours" value={localSettings.supportSaturdayHours} onChange={handleChange} placeholder="Sáb das 08h às 13h" className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] text-neutral-900" />
               </div>
            </div>
         </section>

         <section>
            <div className="flex items-center gap-3 border-b border-neutral-100/60 pb-3 mb-6">
               <Truck className="w-4 h-4 text-neutral-900" />
               <h3 className="text-[11px] font-semibold uppercase tracking-widest text-neutral-900">Frete Internacional</h3>
            </div>

            <div className="space-y-8">
               <div className="rounded-2xl border border-neutral-100 bg-neutral-50/50 p-6">
                  <div className="mb-5">
                    <p className="text-[13px] font-semibold text-neutral-900">Origem do envio</p>
                    <p className="text-[12px] text-neutral-500 mt-1">Esses dados alimentam a simulacao de frete e preparam a integracao com carriers internacionais.</p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">Pais de origem</label>
                      <select name="shippingOriginCountry" value={localSettings.shippingOriginCountry} onChange={handleSelectChange} className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] text-neutral-900">
                        {countryOptions.map((country) => (
                          <option key={country.code} value={country.code}>{country.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">Codigo postal de origem</label>
                      <input type="text" name="shippingOriginPostalCode" value={localSettings.shippingOriginPostalCode} onChange={handleChange} className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] text-neutral-900" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">Cidade de origem</label>
                      <input type="text" name="shippingOriginCity" value={localSettings.shippingOriginCity} onChange={handleChange} className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] text-neutral-900" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">Estado / Regiao de origem</label>
                      <input type="text" name="shippingOriginRegion" value={localSettings.shippingOriginRegion} onChange={handleChange} className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] text-neutral-900" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">Rua / avenida de origem</label>
                      <input type="text" name="shippingOriginStreet" value={localSettings.shippingOriginStreet} onChange={handleChange} className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] text-neutral-900" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">Numero</label>
                      <input type="text" name="shippingOriginNumber" value={localSettings.shippingOriginNumber} onChange={handleChange} className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] text-neutral-900" />
                    </div>
                  </div>
               </div>

               <div className="rounded-2xl border border-neutral-100 bg-neutral-50/50 p-6">
                  <div className="mb-5">
                    <p className="text-[13px] font-semibold text-neutral-900">Regras e pacote padrao</p>
                    <p className="text-[12px] text-neutral-500 mt-1">Enquanto o provider de frete ao vivo nao estiver configurado, a loja usa essas referencias para estimar as opcoes de envio.</p>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">Frete gratis a partir de</label>
                      <input type="number" min="0" step="0.01" value={localSettings.shippingFreeThreshold} onChange={(e) => setLocalSettings((prev) => ({ ...prev, shippingFreeThreshold: Number(e.target.value) || 0 }))} className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] text-neutral-900" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">Peso padrao por produto (g)</label>
                      <input type="number" min="50" step="10" value={localSettings.shippingDefaultProductWeightGrams} onChange={(e) => setLocalSettings((prev) => ({ ...prev, shippingDefaultProductWeightGrams: Number(e.target.value) || 500 }))} className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] text-neutral-900" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">Comprimento do pacote (cm)</label>
                      <input type="number" min="1" step="0.5" value={localSettings.shippingPackageLengthCm} onChange={(e) => setLocalSettings((prev) => ({ ...prev, shippingPackageLengthCm: Number(e.target.value) || 30 }))} className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] text-neutral-900" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">Largura do pacote (cm)</label>
                      <input type="number" min="1" step="0.5" value={localSettings.shippingPackageWidthCm} onChange={(e) => setLocalSettings((prev) => ({ ...prev, shippingPackageWidthCm: Number(e.target.value) || 24 }))} className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] text-neutral-900" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">Altura do pacote (cm)</label>
                      <input type="number" min="1" step="0.5" value={localSettings.shippingPackageHeightCm} onChange={(e) => setLocalSettings((prev) => ({ ...prev, shippingPackageHeightCm: Number(e.target.value) || 6 }))} className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] text-neutral-900" />
                    </div>
                  </div>
               </div>
            </div>
         </section>

         {/* SEO Basics */}
         <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-neutral-900 mb-6 border-b border-neutral-100/60 pb-3">SEO (Otimização para Buscas)</h3>
            <div className="space-y-6">
               <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">Descrição do Site (Meta Description)</label>
                  <textarea rows={3} name="description" value={localSettings.description} onChange={handleChange} className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl resize-none text-[13px] text-neutral-900"></textarea>
                  <p className="text-[11px] text-neutral-400 mt-2">Aparece nos resultados do Google. Máximo recomendado: 160 caracteres.</p>
               </div>
            </div>
         </section>

         {/* Clube de Lealdade */}
         <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-neutral-900 mb-6 border-b border-neutral-100/60 pb-3">Clube de Lealdade</h3>
            <div className="space-y-6">
               <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">Pontos por {oneUnitLabel} em compras</label>
                  <input 
                     type="number" 
                     name="pointsPerReal" 
                     value={localSettings.pointsPerReal || 1} 
                     onChange={(e) => setLocalSettings(prev => ({ ...prev, pointsPerReal: Number(e.target.value) }))} 
                     className="w-full sm:w-1/2 border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] text-neutral-900"
                     min="0.1"
                     step="0.1"
                  />
                  <p className="text-[11px] text-neutral-400 mt-2">Ex: Se definido 1, uma compra de {hundredUnitsLabel} gera 100 pontos.</p>
               </div>
            </div>
         </section>

         <div className="pt-8 border-t border-neutral-100/60 flex justify-end">
            <button 
              onClick={handleSave}
              className="bg-[#0A0A0A] text-white px-8 py-3.5 font-semibold uppercase tracking-wider text-[11px] rounded-xl hover:bg-neutral-800 transition-all flex items-center shadow-[0_4px_14px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)]"
            >
               <Save className="w-4 h-4 mr-3" />
               {t('settings.save')}
            </button>
         </div>
      </div>
    </div>
  );
}
