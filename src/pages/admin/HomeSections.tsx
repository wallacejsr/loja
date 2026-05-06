import React, { useEffect, useState } from 'react';
import { Save, Home as HomeIcon, LayoutList, Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import { showToast } from '../../lib/adminUtils';
import { useStoreData } from '../../hooks/useStoreData';
import { HomeCard, HomeCardInput, HomeSection, HomeSectionInput, HomeSectionSource } from '../../lib/storeApi';

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

function cardToInput(card: HomeCard): HomeCardInput {
  return {
    title: card.title,
    image: card.image,
    link: card.link,
    ctaLabel: card.ctaLabel,
    position: card.position,
    status: card.status,
  };
}

const emptyCard = (position: number): HomeCardInput => ({
  title: '',
  image: '',
  link: '/catalog',
  ctaLabel: 'Confira',
  position,
  status: 'Ativo',
});

export function HomeSections() {
  const {
    homeSections,
    homeCards,
    categories,
    editHomeSection,
    addHomeCard,
    editHomeCard,
    removeHomeCard,
  } = useStoreData();
  const [drafts, setDrafts] = useState<Record<string, HomeSectionInput>>({});
  const [cardDrafts, setCardDrafts] = useState<Record<string, HomeCardInput>>({});
  const [newCard, setNewCard] = useState<HomeCardInput>(() => emptyCard(1));
  const [savingId, setSavingId] = useState('');
  const [savingCardId, setSavingCardId] = useState('');

  useEffect(() => {
    setDrafts(Object.fromEntries(homeSections.map((section) => [section.id, sectionToInput(section)])));
  }, [homeSections]);

  useEffect(() => {
    setCardDrafts(Object.fromEntries(homeCards.map((card) => [card.id, cardToInput(card)])));
    setNewCard((current) => ({
      ...current,
      position: homeCards.length ? Math.max(...homeCards.map((card) => card.position)) + 1 : 1,
    }));
  }, [homeCards]);

  const activeCategories = categories.filter((category) => category.status === 'Ativo');

  const updateDraft = (id: string, patch: Partial<HomeSectionInput>) => {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  };

  const updateCardDraft = (id: string, patch: Partial<HomeCardInput>) => {
    setCardDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
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

  const handleSaveCard = async (card: HomeCard) => {
    const draft = cardDrafts[card.id];
    if (!draft?.title || !draft.image || !draft.link) {
      showToast('Preencha título, imagem e link do card.');
      return;
    }

    setSavingCardId(card.id);
    try {
      await editHomeCard(card.id, draft);
      showToast('Card de destaque atualizado com sucesso!');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível salvar o card.');
    } finally {
      setSavingCardId('');
    }
  };

  const handleCreateCard = async () => {
    if (!newCard.title || !newCard.image || !newCard.link) {
      showToast('Preencha título, imagem e link do novo card.');
      return;
    }

    setSavingCardId('new');
    try {
      await addHomeCard(newCard);
      showToast('Card de destaque criado com sucesso!');
      setNewCard(emptyCard(newCard.position + 1));
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível criar o card.');
    } finally {
      setSavingCardId('');
    }
  };

  const handleRemoveCard = async (card: HomeCard) => {
    setSavingCardId(card.id);
    try {
      await removeHomeCard(card.id);
      showToast('Card de destaque removido.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível remover o card.');
    } finally {
      setSavingCardId('');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-3xl font-serif text-neutral-900 tracking-tight">Vitrine da Home</h2>
        <p className="text-neutral-500 text-[13px]">Controle cards de destaque e seções de produtos da página inicial.</p>
      </div>

      <section className="space-y-5">
        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-serif font-bold text-neutral-900">Cards de Destaque</h3>
          <p className="text-neutral-500 text-[13px]">Esses cards substituem os banners fixos e aparecem em grade na Home.</p>
        </div>

        <div className="grid xl:grid-cols-3 gap-5">
          {homeCards.map((card) => {
            const draft = cardDrafts[card.id];
            if (!draft) return null;

            return (
              <div key={card.id} className="bg-white rounded-2xl border border-neutral-200/40 shadow-[0_2px_10px_rgba(0,0,0,0.03)] overflow-hidden">
                <div className="aspect-[4/3] bg-neutral-100 relative overflow-hidden">
                  {draft.image ? (
                    <img src={draft.image} alt={draft.title} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-neutral-300">
                      <ImageIcon className="w-10 h-10" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-11 bg-black/70 flex items-center justify-between px-4">
                    <span className="text-white text-sm font-bold truncate">{draft.title || 'Título do card'}</span>
                    <span className="text-white text-[11px] font-bold uppercase tracking-wider">{draft.ctaLabel || 'Confira'}</span>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <Field label="Título">
                    <input value={draft.title} onChange={(event) => updateCardDraft(card.id, { title: event.target.value })} className={inputClass} />
                  </Field>
                  <Field label="URL da imagem">
                    <input value={draft.image} onChange={(event) => updateCardDraft(card.id, { image: event.target.value })} className={inputClass} />
                  </Field>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="Link">
                      <input value={draft.link} onChange={(event) => updateCardDraft(card.id, { link: event.target.value })} className={inputClass} />
                    </Field>
                    <Field label="CTA">
                      <input value={draft.ctaLabel} onChange={(event) => updateCardDraft(card.id, { ctaLabel: event.target.value })} className={inputClass} />
                    </Field>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="Posição">
                      <input type="number" min="1" value={draft.position} onChange={(event) => updateCardDraft(card.id, { position: Number(event.target.value) })} className={inputClass} />
                    </Field>
                    <Field label="Status">
                      <select value={draft.status} onChange={(event) => updateCardDraft(card.id, { status: event.target.value as HomeCardInput['status'] })} className={inputClass}>
                        <option value="Ativo">Ativo</option>
                        <option value="Inativo">Inativo</option>
                      </select>
                    </Field>
                  </div>
                </div>

                <div className="px-5 py-4 border-t border-neutral-100/60 bg-neutral-50/50 flex justify-between gap-3">
                  <button onClick={() => handleRemoveCard(card)} disabled={savingCardId === card.id} className="px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleSaveCard(card)} disabled={savingCardId === card.id} className="bg-neutral-950 text-white px-5 py-3 font-semibold uppercase tracking-wider text-[11px] rounded-xl hover:bg-neutral-800 transition-all flex items-center gap-2 shadow-lg shadow-neutral-900/10 disabled:opacity-60 disabled:cursor-wait">
                    <Save className="w-4 h-4" />
                    {savingCardId === card.id ? 'Salvando...' : 'Salvar card'}
                  </button>
                </div>
              </div>
            );
          })}

          <div className="bg-white rounded-2xl border border-dashed border-neutral-300 shadow-[0_2px_10px_rgba(0,0,0,0.03)] overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100/60 bg-neutral-50/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-neutral-900">Novo card</h4>
                <p className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Cards de destaque</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <input placeholder="Título" value={newCard.title} onChange={(event) => setNewCard((current) => ({ ...current, title: event.target.value }))} className={inputClass} />
              <input placeholder="URL da imagem" value={newCard.image} onChange={(event) => setNewCard((current) => ({ ...current, image: event.target.value }))} className={inputClass} />
              <div className="grid sm:grid-cols-2 gap-3">
                <input placeholder="/catalog" value={newCard.link} onChange={(event) => setNewCard((current) => ({ ...current, link: event.target.value }))} className={inputClass} />
                <input placeholder="Confira" value={newCard.ctaLabel} onChange={(event) => setNewCard((current) => ({ ...current, ctaLabel: event.target.value }))} className={inputClass} />
              </div>
              <button onClick={handleCreateCard} disabled={savingCardId === 'new'} className="w-full bg-neutral-950 text-white px-5 py-3 font-semibold uppercase tracking-wider text-[11px] rounded-xl hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-neutral-900/10 disabled:opacity-60 disabled:cursor-wait">
                <Plus className="w-4 h-4" />
                {savingCardId === 'new' ? 'Criando...' : 'Criar card'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-serif font-bold text-neutral-900">Seções de Produtos</h3>
          <p className="text-neutral-500 text-[13px]">Controle quais produtos aparecem nas faixas da página inicial.</p>
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
                  <Field label="Título da seção">
                    <input value={draft.title} onChange={(event) => updateDraft(section.id, { title: event.target.value })} className={inputClass} />
                  </Field>

                  <Field label="Origem dos produtos">
                    <select value={draft.sourceType} onChange={(event) => handleSourceChange(section, event.target.value as HomeSectionSource)} className={inputClass}>
                      {Object.entries(sourceLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </Field>

                  {draft.sourceType === 'category' && (
                    <Field label="Categoria exibida">
                      <select value={draft.categoryName} onChange={(event) => handleCategoryChange(section.id, event.target.value)} className={inputClass}>
                        <option value="">Selecione...</option>
                        {activeCategories.map((category) => (
                          <option key={category.id} value={category.nome}>{category.nome}</option>
                        ))}
                      </select>
                    </Field>
                  )}

                  <div className="grid sm:grid-cols-3 gap-4">
                    <Field label="Quantidade">
                      <input type="number" min="1" max="12" value={draft.limitCount} onChange={(event) => updateDraft(section.id, { limitCount: Number(event.target.value) })} className={inputClass} />
                    </Field>
                    <Field label="Posição">
                      <input type="number" min="1" value={draft.position} onChange={(event) => updateDraft(section.id, { position: Number(event.target.value) })} className={inputClass} />
                    </Field>
                    <Field label="Status">
                      <select value={draft.status} onChange={(event) => updateDraft(section.id, { status: event.target.value as HomeSectionInput['status'] })} className={inputClass}>
                        <option value="Ativo">Ativo</option>
                        <option value="Inativo">Inativo</option>
                      </select>
                    </Field>
                  </div>

                  <Field label='Link do "Ver todos"'>
                    <input value={draft.link} onChange={(event) => updateDraft(section.id, { link: event.target.value })} className={inputClass} />
                  </Field>
                </div>

                <div className="px-6 py-5 border-t border-neutral-100/60 bg-neutral-50/50 flex justify-end">
                  <button onClick={() => handleSave(section)} disabled={savingId === section.id} className="bg-neutral-950 text-white px-6 py-3 font-semibold uppercase tracking-wider text-[11px] rounded-xl hover:bg-neutral-800 transition-all flex items-center gap-2 shadow-lg shadow-neutral-900/10 disabled:opacity-60 disabled:cursor-wait">
                    {savingId === section.id ? <LayoutList className="w-4 h-4 animate-pulse" /> : <Save className="w-4 h-4" />}
                    {savingId === section.id ? 'Salvando...' : 'Salvar seção'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{label}</label>
      {children}
    </div>
  );
}

const inputClass = 'w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] text-neutral-900';
