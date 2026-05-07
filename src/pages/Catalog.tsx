import React, { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Filter, ChevronDown, Heart } from 'lucide-react';
import { cn } from '../lib/utils';
import { useCart } from '../context/CartContext';
import { useStorefront } from '../hooks/useStorefront';
import { useStoreData } from '../hooks/useStoreData';

export function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  const sortParam = searchParams.get('sort');
  const promoParam = searchParams.get('promo');
  const queryParam = searchParams.get('q');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const { toggleWishlist, wishlist } = useCart();
  const { products, categories } = useStoreData();
  const { t, formatCurrency } = useStorefront();

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (queryParam) {
      const lowerQuery = queryParam.toLowerCase();
      result = result.filter((p) => p.nome.toLowerCase().includes(lowerQuery) || p.descricao.toLowerCase().includes(lowerQuery));
    }

    if (categoryParam) {
      result = result.filter((p) => p.categoria === categoryParam);
    }

    if (promoParam === 'true') {
      result = result.filter((p) => p.precoPromocional);
    }

    if (sortParam === 'lancamentos') {
      result = result.filter((p) => p.lancamento);
    } else if (sortParam === 'mais-vendidos') {
      result = result.filter((p) => p.maisVendido);
    }

    if (sortParam === 'menor-preco') {
      result.sort((a, b) => (a.precoPromocional || a.preco) - (b.precoPromocional || b.preco));
    } else if (sortParam === 'maior-preco') {
      result.sort((a, b) => (b.precoPromocional || b.preco) - (a.precoPromocional || a.preco));
    } else if (sortParam === 'lancamentos') {
      result.sort((a, b) => (b.lancamento ? 1 : 0) - (a.lancamento ? 1 : 0));
    } else if (sortParam === 'mais-vendidos') {
      result.sort((a, b) => (b.maisVendido ? 1 : 0) - (a.maisVendido ? 1 : 0));
    }

    return result;
  }, [products, categoryParam, sortParam, promoParam, queryParam]);

  const handleSort = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value) {
      searchParams.set('sort', value);
    } else {
      searchParams.delete('sort');
    }
    setSearchParams(searchParams);
  };

  const currentTitle = queryParam
    ? t('searchResultsFor', { query: queryParam })
    : sortParam === 'lancamentos'
      ? t('launches')
      : sortParam === 'mais-vendidos'
        ? t('bestSellers')
        : promoParam
          ? t('promotions')
          : categoryParam || t('allProducts');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-neutral-900 capitalize">{currentTitle}</h1>
        <p className="text-sm text-neutral-500 mt-2">{t('productsFound', { count: filteredProducts.length })}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:hidden flex items-center justify-between border-y border-neutral-200 py-3 mb-6">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center text-sm font-medium text-neutral-700 uppercase tracking-wider"
          >
            <Filter className="w-4 h-4 mr-2" /> {t('filters')}
          </button>

          <div className="relative">
            <select
              className="appearance-none bg-transparent text-sm font-medium uppercase tracking-wider pr-6 focus:outline-none"
              value={sortParam || ''}
              onChange={handleSort}
            >
              <option value="">{t('sortBy')}</option>
              <option value="mais-vendidos">{t('bestSellers')}</option>
              <option value="lancamentos">{t('launches')}</option>
              <option value="menor-preco">{t('lowestPrice')}</option>
              <option value="maior-preco">{t('highestPrice')}</option>
            </select>
            <ChevronDown className="w-4 h-4 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500" />
          </div>
        </div>

        <div className={cn('lg:w-64 flex-shrink-0 transition-all duration-300 lg:block', isFilterOpen ? 'block' : 'hidden')}>
          <div className="space-y-8 sticky top-24">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider mb-4 pb-2 border-b border-neutral-200">{t('categories')}</h3>
              <ul className="space-y-3">
                <li>
                  <Link
                    to="/catalog"
                    className={cn('text-sm transition-colors', !categoryParam && !promoParam && !sortParam ? 'text-neutral-900 font-medium' : 'text-neutral-500 hover:text-neutral-900')}
                  >
                    {t('all')}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/catalog?sort=lancamentos"
                    className={cn('text-sm transition-colors', sortParam === 'lancamentos' ? 'text-neutral-900 font-medium' : 'text-neutral-500 hover:text-neutral-900')}
                  >
                    {t('launches')}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/catalog?sort=mais-vendidos"
                    className={cn('text-sm transition-colors', sortParam === 'mais-vendidos' ? 'text-neutral-900 font-medium' : 'text-neutral-500 hover:text-neutral-900')}
                  >
                    {t('bestSellers')}
                  </Link>
                </li>
                {categories.map((cat) => (
                  <li key={cat.nome}>
                    <Link
                      to={`/catalog?category=${cat.nome}`}
                      className={cn('text-sm transition-colors', categoryParam === cat.nome ? 'text-neutral-900 font-medium' : 'text-neutral-500 hover:text-neutral-900')}
                    >
                      {cat.nome}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    to="/catalog?promo=true"
                    className={cn('text-sm transition-colors', promoParam ? 'text-red-600 font-medium' : 'text-red-500 hover:text-red-700')}
                  >
                    {t('promotions')}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex-1">
          <div className="hidden lg:flex justify-end mb-6">
            <div className="relative">
              <select
                className="appearance-none bg-transparent text-sm font-medium uppercase tracking-wider pr-8 py-2 border border-neutral-200 rounded-sm focus:outline-none focus:border-neutral-900"
                value={sortParam || ''}
                onChange={handleSort}
              >
                <option value="">{t('sortDefault')}</option>
                <option value="mais-vendidos">{t('bestSellers')}</option>
                <option value="lancamentos">{t('launches')}</option>
                <option value="menor-preco">{t('lowestPrice')}</option>
                <option value="maior-preco">{t('highestPrice')}</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-secondary" />
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-secondary/70 text-lg">{t('noProductsFound')}</p>
              <Link to="/catalog" className="mt-4 inline-block text-secondary font-medium underline underline-offset-4">{t('clearFilters')}</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-10 sm:gap-x-6 xl:gap-x-8">
              {filteredProducts.map((product) => {
                const hoverImage = product.imagens[1]?.trim();
                const hasHoverImage = Boolean(hoverImage && hoverImage !== product.imagens[0]);

                return (
                  <div key={product.id} className="group relative flex flex-col">
                    <Link to={`/product/${product.id}`} className="block relative aspect-[3/4] bg-neutral-100 overflow-hidden mb-4">
                      <img
                        src={product.imagens[0]}
                        alt={product.nome}
                        className={cn('w-full h-full object-cover transition-opacity duration-500', hasHoverImage && 'group-hover:opacity-0')}
                      />
                      {hasHoverImage && (
                        <img
                          src={hoverImage}
                          alt={`${product.nome} alternate`}
                          className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                        />
                      )}

                      <div className="absolute top-2 left-2 flex flex-col gap-2 z-10">
                        {product.lancamento && (
                          <span className="bg-secondary text-white text-[10px] font-bold px-2 py-1 uppercase tracking-wider rounded-sm">{t('productNew')}</span>
                        )}
                        {product.precoPromocional && (
                          <span className="bg-primary text-white text-[10px] font-bold px-2 py-1 uppercase tracking-wider rounded-sm">{t('productSale')}</span>
                        )}
                      </div>
                    </Link>

                    <button
                      onClick={(e) => { e.preventDefault(); toggleWishlist(product.id); }}
                      className="absolute top-2 right-2 p-2 bg-white/80 backdrop-blur rounded-full shadow-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:translate-y-2 sm:group-hover:translate-y-0 transition-all z-10 hover:bg-white"
                    >
                      <Heart className={cn('w-4 h-4', wishlist.includes(product.id) ? 'fill-primary text-primary' : 'text-secondary')} />
                    </button>

                    <Link to={`/product/${product.id}`} className="flex flex-col flex-1 text-center">
                      <h3 className="text-sm font-medium text-secondary mb-2 line-clamp-2">{product.nome}</h3>
                      <div className="mt-auto">
                        {product.precoPromocional ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-secondary/50 line-through text-xs">{formatCurrency(product.preco)}</span>
                            <span className="text-primary font-bold text-lg">{formatCurrency(product.precoPromocional)}</span>
                          </div>
                        ) : (
                          <span className="text-primary font-bold text-lg block">{formatCurrency(product.preco)}</span>
                        )}
                        <span className="block text-[#1a222b] text-xs mt-1">
                          {t('installments4', { value: formatCurrency((product.precoPromocional || product.preco) / 4) })}
                        </span>
                      </div>
                    </Link>
                    <Link
                      to={`/product/${product.id}`}
                      className="mt-4 w-full bg-secondary text-white font-bold text-xs uppercase tracking-wider py-3 text-center hover:bg-primary transition-colors rounded-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    >
                      {t('viewDetails')}
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
