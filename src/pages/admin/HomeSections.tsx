import React, { useEffect, useState } from 'react';
import { Save, Home as HomeIcon, LayoutList } from 'lucide-react';
import { showToast } from '../../lib/adminUtils';
import { useStoreData } from '../../hooks/useStoreData';
import { HomeSection, HomeSectionInput, HomeSectionSource } from '../../lib/storeApi';

const sourceLabels: Record<HomeSectionSource, string> = {
  category: 'Categoria',
  lancamentos: 'Produtos marcados como lançamento',
  mais_vendidos: 'Produtos marcados como mais vendidos',
  promocoes: 'Produtos em promoção',
};

function sectionToInput(section: HomeSection): HomeSectionInput {
  return {
    title: section.title,
    sourceType: section.sourceType,
    categoryName: section.categoryName,
    limitCount: section.limitCount,
    link: section.link,
    position: section.position,
    status: section.status,
  };
}

export function HomeSections() {
  const { homeSections, categories, editHomeSection } = useStoreData();
  const [drafts, setDrafts] = useState<Record<string, HomeSectionInput>>({});
  const [savingId, setSavingId] = useState('');

  useEffect(() => {
    setDrafts(Object.fromEntries(homeSections.map((section) => [section.id, sectionToInput(section)])));
  }, [homeSections]);

  const activeCategories = categories.filter((category) => category.status === 'Ativo');

  const updateDraft = (id: string, patch: Partial<HomeSectionInput>) => {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...current[id],
        ...patch,
      },
    }));
  };

  const handleSourceChange = (section: HomeSection, sourceType: HomeSectionSource) => {
    const categoryName = sourceType === 'category' ? (drafts[section.id]?.categoryName || activeCategories[0]?.nome || '') : '';
    const link = sourceType === 'category' && categoryName
      ? `/catalog?category=${encodeURIComponent(categoryName)}`
      : sourceType === 'lancamentos'
        ? '/catalog?sort=lancamentos'
        : sourceType === 'mais_vendidos'
          ? '/catalog?sort=mais-vendidos'
          : '/catalog?promo=true';

    updateDraft(section.id, { sourceType, categoryName, link });
  };

  const handleCategoryChange = (sectionId: string, categoryName: string) => {
    updateDraft(sectionId, {
      categoryName,
      link: `/catalog?category=${encodeURIComponent(categoryName)}`,
    });
  };

  const handleSave = async (section: HomeSection) => {
    const draft = drafts[section.id];
    if (!draft?.title || !draft.limitCount) {
      showToast('Preencha título e quantidade da seção.');
      return;
    }
    if (draft.sourceType === 'category' && !draft.categoryName) {
      showToast('Selecione uma categoria para esta seção.');
      return;
    }

    setSavingId(section.id);
    try {
      await editHomeSection(section.id, draft);
      showToast('Seção da home atualizada com sucesso!');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível salvar a seção.');
    } finally {
      setSavingId('');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-3xl font-serif text-neutral-900 tracking-tight">Vitrine da Home</h2>
        <p className="text-neutral-500 text-[13px]">Controle quais produtos aparecem nas seções da página inicial.</p>
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        {homeSections.map((section) => {
          const draft = drafts[section.id];
          if (!draft) return null;

          return (
            <div key={section.id} className="bg-white rounded-2xl border border-neutral-200/40 shadow-[0_2px_10px_rgba(0,0,0,0.03)] overflow-hidden">
              <div className="px-6 py-5 border-b border-neutral-100/60 bg-neutral-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center">
                    <HomeIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral-900">{section.title}</h3>
                    <p className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Posição {section.position}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${draft.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600' : 'bg-neutral-100 text-neutral-600'}`}>
                  {draft.status}
                </span>
              </div>

              <div className="p-6 space-y-5">
                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Título da seção</label>
                  <input
                    type="text"
                    value={draft.title}
                    onChange={(event) => updateDraft(section.id, { title: event.target.value })}
                    className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] text-neutral-900"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Origem dos produtos</label>
                  <select
                    value={draft.sourceType}
                    onChange={(event) => handleSourceChange(section, event.target.value as HomeSectionSource)}
                    className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] text-neutral-900"
                  >
                    {Object.entries(sourceLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                {draft.sourceType === 'category' && (
                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Categoria exibida</label>
                    <select
                      value={draft.categoryName}
                      onChange={(event) => handleCategoryChange(section.id, event.target.value)}
                      className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] text-neutral-900"
                    >
                      <option value="">Selecione...</option>
                      {activeCategories.map((category) => (
                        <option key={category.id} value={category.nome}>{category.nome}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Quantidade</label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={draft.limitCount}
                      onChange={(event) => updateDraft(section.id, { limitCount: Number(event.target.value) })}
                      className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] text-neutral-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Posição</label>
                    <input
                      type="number"
                      min="1"
                      value={draft.position}
                      onChange={(event) => updateDraft(section.id, { position: Number(event.target.value) })}
                      className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] text-neutral-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Status</label>
                    <select
                      value={draft.status}
                      onChange={(event) => updateDraft(section.id, { status: event.target.value as HomeSectionInput['status'] })}
                      className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] text-neutral-900"
                    >
                      <option value="Ativo">Ativo</option>
                      <option value="Inativo">Inativo</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Link do “Ver todos”</label>
                  <input
                    type="text"
                    value={draft.link}
                    onChange={(event) => updateDraft(section.id, { link: event.target.value })}
                    className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] text-neutral-900"
                  />
                </div>
              </div>

              <div className="px-6 py-5 border-t border-neutral-100/60 bg-neutral-50/50 flex justify-end">
                <button
                  onClick={() => handleSave(section)}
                  disabled={savingId === section.id}
                  className="bg-neutral-950 text-white px-6 py-3 font-semibold uppercase tracking-wider text-[11px] rounded-xl hover:bg-neutral-800 transition-all flex items-center gap-2 shadow-lg shadow-neutral-900/10 disabled:opacity-60 disabled:cursor-wait"
                >
                  {savingId === section.id ? <LayoutList className="w-4 h-4 animate-pulse" /> : <Save className="w-4 h-4" />}
                  {savingId === section.id ? 'Salvando...' : 'Salvar seção'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
