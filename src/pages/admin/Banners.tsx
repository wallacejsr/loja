import React, { useState } from 'react';
import { Plus, Edit, Trash2, MoveUp, MoveDown, Image as ImageIcon } from 'lucide-react';
import { showToast } from '../../lib/adminUtils';
import { BannerModal } from '../../components/admin/BannerModal';
import { useStoreActions, useStoreBanners } from '../../hooks/useStoreData';

export function Banners() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const banners = useStoreBanners();
  const { addBanner, removeBanner, reorderBanners } = useStoreActions();

  const handleAction = (action: string, title?: string) => {
    showToast(`${action}${title ? `: ${title}` : ''}`);
  };

  const moveBanner = (index: number, direction: 'up' | 'down') => {
    reorderBanners(index, direction);
    showToast('Ordem do banner atualizada');
  };

  const handleRemoveBanner = async (id: string) => {
    await removeBanner(id);
    showToast('Banner removido');
  };

  const handleCreateBanner = async (banner: { title: string; desktop: string; mobile: string; link: string }) => {
    await addBanner(banner);
    showToast('Banner criado com sucesso!');
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-3xl font-serif text-neutral-900 tracking-tight">Banners (Carrossel Principal)</h2>
          <p className="text-neutral-500 text-[13px]">Gerencie os destaques da página inicial.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#0A0A0A] text-white px-5 py-3 font-semibold uppercase tracking-wider text-[11px] rounded-xl hover:bg-neutral-800 transition-all flex items-center shadow-[0_4px_14px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Banner
        </button>
      </div>

      <BannerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleCreateBanner} />

      <div className="bg-white rounded-2xl border border-neutral-200/40 shadow-[0_2px_10px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-neutral-100/60 bg-neutral-50/50">
                <th className="py-3.5 px-6 w-16 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Ordem</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Imagem</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Título Interno</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Link</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Status</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100/60">
              {banners.map((banner, index) => (
                <tr key={banner.id} className="hover:bg-neutral-50/50 transition-colors group cursor-pointer">
                  <td className="py-4 px-6">
                    <div className="flex flex-col items-center gap-1.5 opacity-50 group-hover:opacity-100 transition-opacity">
                      <button
                        disabled={index === 0}
                        onClick={(e) => { e.stopPropagation(); moveBanner(index, 'up'); }}
                        className="hover:text-black disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <MoveUp className="w-4 h-4" />
                      </button>
                      <span className="text-[11px] font-semibold">{index + 1}</span>
                      <button
                        disabled={index === banners.length - 1}
                        onClick={(e) => { e.stopPropagation(); moveBanner(index, 'down'); }}
                        className="hover:text-black disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <MoveDown className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="w-32 h-16 bg-[#F5F5F7] rounded-xl overflow-hidden flex items-center justify-center border border-neutral-200/50 shadow-sm relative">
                      {banner.image ? (
                        <img src={banner.image} alt={banner.title} className="w-full h-full object-cover mix-blend-multiply" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-neutral-300" />
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="font-medium text-[13px] text-neutral-900 group-hover:text-blue-600 transition-colors">{banner.title}</div>
                  </td>
                  <td className="py-4 px-6 text-[13px] text-neutral-500 group-hover:text-blue-600 transition-colors">
                    {banner.link}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold
                      ${banner.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600' : 'bg-neutral-100 text-neutral-600'}
                    `}>
                      {banner.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAction('Editar banner', banner.title); }}
                        className="p-2 text-neutral-400 hover:text-neutral-900 transition-colors rounded-lg hover:bg-neutral-100"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemoveBanner(banner.id); }}
                        className="p-2 text-neutral-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!banners.length && (
          <div className="p-12 text-center text-neutral-500 text-[13px]">
            Nenhum banner cadastrado. Adicione um novo para exibir na página inicial.
          </div>
        )}
      </div>
    </div>
  );
}
