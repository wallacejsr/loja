import React, { useEffect, useState } from 'react';
import { Save, Languages, Image, Headphones } from 'lucide-react';
import { showToast } from '../../lib/adminUtils';
import { useTranslation } from 'react-i18next';
import { useSettings, StoreSettings } from '../../hooks/useSettings';

export function Settings() {
  const { t, i18n } = useTranslation();
  const { settings, updateSettings } = useSettings();
  const [localSettings, setLocalSettings] = useState<StoreSettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setLocalSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    updateSettings(localSettings);
    showToast(t('settings.save') + '!');
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    showToast(`Idioma alterado para: ${lng === 'pt' ? 'Português' : 'English'}`);
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
                  onClick={() => changeLanguage('pt')}
                  className={`flex-1 px-4 py-2.5 text-[12px] font-bold rounded-xl border transition-all ${
                    i18n.language.startsWith('pt') 
                      ? 'bg-neutral-900 text-white border-neutral-900 shadow-md' 
                      : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
                  }`}
                 >
                    PT-BR (Português)
                 </button>
                 <button 
                  onClick={() => changeLanguage('en')}
                  className={`flex-1 px-4 py-2.5 text-[12px] font-bold rounded-xl border transition-all ${
                    i18n.language.startsWith('en') 
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
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">WhatsApp / Telefone</label>
                  <input type="text" name="phone" value={localSettings.phone} onChange={handleChange} className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] text-neutral-900" />
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

         {/* Central de Atendimento */}
         <section>
            <div className="flex items-center gap-3 border-b border-neutral-100/60 pb-3 mb-6">
               <Headphones className="w-4 h-4 text-neutral-900" />
               <h3 className="text-[11px] font-semibold uppercase tracking-widest text-neutral-900">Central de Atendimento</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
               <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">WhatsApp Vendas</label>
                  <input type="text" name="supportSalesPhone" value={localSettings.supportSalesPhone} onChange={handleChange} placeholder="(64) 99202-3191" className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] text-neutral-900" />
               </div>
               <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">WhatsApp SAC</label>
                  <input type="text" name="supportSacPhone" value={localSettings.supportSacPhone} onChange={handleChange} placeholder="(64) 99209-6899" className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] text-neutral-900" />
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
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">Pontos por R$ 1,00 em compras</label>
                  <input 
                     type="number" 
                     name="pointsPerReal" 
                     value={localSettings.pointsPerReal || 1} 
                     onChange={(e) => setLocalSettings(prev => ({ ...prev, pointsPerReal: Number(e.target.value) }))} 
                     className="w-full sm:w-1/2 border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] text-neutral-900"
                     min="0.1"
                     step="0.1"
                  />
                  <p className="text-[11px] text-neutral-400 mt-2">Ex: Se definido 1, uma compra de R$ 100,00 gera 100 pontos.</p>
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
