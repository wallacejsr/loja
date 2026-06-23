import React, { useEffect, useState } from 'react';
import { Save, Palette, Type } from 'lucide-react';
import { showToast } from '../../lib/adminUtils';
import { useSettings, StoreSettings } from '../../hooks/useSettings';

export function LayoutTheme() {
  const { settings, updateSettings } = useSettings();
  const [localSettings, setLocalSettings] = useState<StoreSettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocalSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    updateSettings({
      adminPanelName: localSettings.adminPanelName,
      primaryColor: localSettings.primaryColor,
      secondaryColor: localSettings.secondaryColor,
    });
    showToast('Layout do painel atualizado com sucesso!');
  };

  return (
    <div className="p-8 max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-serif font-bold text-neutral-900 mb-1">Layout & Cores</h1>
          <p className="text-sm text-neutral-500">Gerencie a paleta de cores da loja.</p>
        </div>
        <button 
          onClick={handleSave}
          className="bg-neutral-900 text-white px-6 py-3 rounded-xl text-[13px] font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          Salvar Alterações
        </button>
      </div>

      <div className="bg-white rounded-3xl p-8 border border-neutral-100 shadow-sm space-y-10">
         <section>
            <div className="flex items-center gap-3 border-b border-neutral-100/60 pb-3 mb-6">
               <Type className="w-4 h-4 text-neutral-900" />
               <h3 className="text-[11px] font-semibold uppercase tracking-widest text-neutral-900">Marca do Painel</h3>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
               <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">Nome exibido no menu lateral</label>
                  <p className="text-xs text-neutral-400 mb-4">Esse texto substitui o nome atualmente exibido como DANI Studio no painel administrativo.</p>

                  <input
                    type="text"
                    name="adminPanelName"
                    value={localSettings.adminPanelName}
                    onChange={handleChange}
                    placeholder="Ex: Minha Loja Admin"
                    className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] text-neutral-900"
                  />
               </div>

               <div className="rounded-2xl border border-neutral-100 bg-[#0A0A0A] px-6 py-5 flex items-center min-h-[120px]">
                  <div className="text-lg font-serif font-bold text-white tracking-widest uppercase">
                     {formatAdminPanelName(localSettings.adminPanelName)}
                  </div>
               </div>
            </div>
         </section>

         <section>
            <div className="flex items-center gap-3 border-b border-neutral-100/60 pb-3 mb-6">
               <Palette className="w-4 h-4 text-neutral-900" />
               <h3 className="text-[11px] font-semibold uppercase tracking-widest text-neutral-900">Paleta de Cores</h3>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-8">
               <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">Cor Principal (Destaque)</label>
                  <p className="text-xs text-neutral-400 mb-4">Usada em botões principais, links ativos e pequenos detalhes.</p>
                  
                  <div className="flex items-center gap-4">
                     <div 
                        className="w-16 h-16 rounded-full border-4 border-white shadow-md flex-shrink-0"
                        style={{ backgroundColor: localSettings.primaryColor }}
                     />
                     <div className="relative flex-1">
                        <input 
                           type="color" 
                           name="primaryColor" 
                           value={localSettings.primaryColor} 
                           onChange={handleChange}
                           className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <input 
                           type="text" 
                           value={localSettings.primaryColor}
                           name="primaryColor"
                           onChange={handleChange}
                           className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] text-neutral-900 font-mono uppercase"
                        />
                     </div>
                  </div>
               </div>

               <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">Cor Secundária (Texto/Fundo Escuro)</label>
                  <p className="text-xs text-neutral-400 mb-4">Usada em textos longos, rodapé e botões secundários.</p>
                  
                  <div className="flex items-center gap-4">
                     <div 
                        className="w-16 h-16 rounded-full border-4 border-white shadow-md flex-shrink-0"
                        style={{ backgroundColor: localSettings.secondaryColor }}
                     />
                     <div className="relative flex-1">
                        <input 
                           type="color" 
                           name="secondaryColor" 
                           value={localSettings.secondaryColor} 
                           onChange={handleChange}
                           className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <input 
                           type="text" 
                           value={localSettings.secondaryColor}
                           name="secondaryColor"
                           onChange={handleChange}
                           className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] text-neutral-900 font-mono uppercase"
                        />
                     </div>
                  </div>
               </div>
            </div>
         </section>

         <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-neutral-900 mb-6 border-b border-neutral-100/60 pb-3">Preview</h3>
            <div className="p-6 rounded-2xl border border-neutral-100 bg-neutral-50 flex items-center justify-center gap-6">
                <button style={{ backgroundColor: localSettings.primaryColor }} className="px-6 py-3 rounded-full text-white text-sm font-bold shadow-lg">Botão Principal</button>
                <button style={{ backgroundColor: localSettings.secondaryColor }} className="px-6 py-3 rounded-full text-white text-sm font-bold shadow-lg">Botão Secundário</button>
                <div style={{ color: localSettings.secondaryColor }} className="text-lg font-serif font-bold">
                    Título de Exemplo
                </div>
            </div>
         </section>
      </div>
    </div>
  );
}

function formatAdminPanelName(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return 'DANI Studio';

  const parts = trimmed.split(/\s+/);
  const primary = parts[0];
  const secondary = parts.slice(1).join(' ');

  if (!secondary) return primary;

  return (
    <>
      {primary} <span className="font-light text-white/40">{secondary}</span>
    </>
  );
}
