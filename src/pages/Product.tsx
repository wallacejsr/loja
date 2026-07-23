import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Star, Heart, MessageCircle, ChevronRight, Ruler, Plus, Minus, Gift } from 'lucide-react';
import { cn } from '../lib/utils';
import { useCart } from '../context/CartContext';
import { useSettings } from '../hooks/useSettings';
import { useStorefront } from '../hooks/useStorefront';
import { useStoreProducts } from '../hooks/useStoreData';
import { getWhatsAppUrl } from '../lib/customerForm';
import { StoreImage } from '../components/StoreImage';

export function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const products = useStoreProducts();
  const product = products.find((p) => p.id === id);
  const { addToCart, wishlist, toggleWishlist } = useCart();
  const { settings } = useSettings();
  const { t, formatCurrency, formatDate } = useStorefront();
  const [mainImage, setMainImage] = useState(product?.imagens[0]);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    setMainImage(product?.imagens[0]);
  }, [product?.id]);

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <h2 className="text-2xl font-serif font-bold mb-4">{t('productNotFound')}</h2>
        <Link to="/catalog" className="underline text-neutral-500">{t('backToStore')}</Link>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (!selectedSize) {
      setError(t('selectSizeError'));
      return;
    }
    if (!selectedColor && product.cores.length > 0) {
      setError(t('selectColorError'));
      return;
    }
    setError('');
    const colorToUse = selectedColor || (product.cores[0]?.nome || 'Unica');
    addToCart(product, quantity, selectedSize, colorToUse);
    navigate('/cart');
  };

  const calculateAverageRating = (reviews: any[]) => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.nota, 0);
    return (sum / reviews.length).toFixed(1);
  };

  const whatsappUrl = getWhatsAppUrl(
    settings.supportSalesPhone || settings.phone,
    settings.supportSalesPhoneCountry || settings.phoneCountry,
    `Hello! I am interested in ${product.nome} (ID: ${product.id}). Is it available?`,
  );
  const related = products.filter((p) => p.categoria === product.categoria && p.id !== product.id).slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <nav className="flex items-center text-xs font-medium text-neutral-500 mb-8 uppercase tracking-wider">
        <Link to="/" className="hover:text-neutral-900 transition-colors">{t('home')}</Link>
        <ChevronRight className="w-3 h-3 mx-2" />
        <Link to={`/catalog?category=${product.categoria}`} className="hover:text-secondary transition-colors">{product.categoria}</Link>
        {product.subcategoria && (
          <>
            <ChevronRight className="w-3 h-3 mx-2" />
            <Link
              to={`/catalog?category=${encodeURIComponent(product.categoria)}&subcategory=${encodeURIComponent(product.subcategoria)}`}
              className="hover:text-secondary transition-colors"
            >
              {product.subcategoria}
            </Link>
          </>
        )}
        <ChevronRight className="w-3 h-3 mx-2" />
        <span className="text-secondary">{product.nome}</span>
      </nav>

      <div className="lg:grid lg:grid-cols-2 lg:gap-x-12 xl:gap-x-16">
        <div className="flex flex-col-reverse sm:flex-row gap-4 mb-8 lg:mb-0">
          <div className="flex sm:flex-col gap-4 overflow-x-auto sm:w-20 md:w-24 shrink-0 hide-scrollbar">
            {product.imagens.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setMainImage(img)}
                className={cn('relative aspect-[3/4] w-20 sm:w-full overflow-hidden bg-neutral-100', mainImage === img ? 'ring-1 ring-primary' : 'opacity-70 hover:opacity-100 transition-opacity')}
              >
                <StoreImage src={img} alt={`Thumb ${idx}`} className="absolute inset-0 h-full w-full bg-white object-contain p-1" sizes="96px" />
              </button>
            ))}
          </div>
          <div className="relative aspect-[3/4] w-full bg-neutral-100 overflow-hidden group cursor-zoom-in">
            <StoreImage
              src={mainImage || product.imagens[0]}
              alt={product.nome}
              className="absolute inset-0 h-full w-full bg-white object-contain"
              sizes="(min-width: 1024px) 50vw, 100vw"
              loading="eager"
              fetchPriority="high"
            />
            <div className="absolute inset-0 bg-black/0 transition-colors duration-300" />
          </div>
        </div>

        <div className="flex flex-col">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-secondary mb-2">{product.nome}</h1>

            {product.estoque <= 5 && (
              <div className="inline-block bg-red-100 text-red-700 text-xs font-bold px-2 py-1 uppercase tracking-wider mb-2">
                {t('lastUnits', { count: product.estoque })}
              </div>
            )}

            <div className="flex items-center justify-between mt-4">
              <div>
                {product.precoPromocional ? (
                  <div className="flex items-center gap-3">
                    <span className="text-neutral-500 line-through text-lg">{formatCurrency(product.preco)}</span>
                    <span className="text-2xl font-bold text-primary">{formatCurrency(product.precoPromocional)}</span>
                  </div>
                ) : (
                  <span className="text-2xl font-bold text-primary">{formatCurrency(product.preco)}</span>
                )}
                <p className="text-sm text-neutral-500 mt-1">{t('installments6', { value: formatCurrency((product.precoPromocional || product.preco) / 6) })}</p>
              </div>

              {product.avaliacoes.length > 0 && (
                <div className="flex flex-col items-end">
                  <div className="flex items-center">
                    <Star className="w-4 h-4 fill-primary text-primary" />
                    <span className="ml-1 text-sm font-bold text-secondary">{calculateAverageRating(product.avaliacoes)}</span>
                  </div>
                  <span className="text-xs text-neutral-500 underline mt-1 cursor-pointer">{t('reviewsCount', { count: product.avaliacoes.length })}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mb-6 p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center gap-4 group hover:bg-primary/10 transition-colors cursor-help">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
              <Gift className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-0.5">{t('loyaltyBonus')}</span>
              <p className="text-secondary text-[13px] font-medium leading-tight">
                {t('loyaltyProductCopy', { points: Math.floor((product.precoPromocional || product.preco) * (settings.pointsPerReal || 1)) })}
              </p>
            </div>
          </div>

          <div className="w-full h-px bg-neutral-200 mb-6" />

          {product.cores.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-secondary mb-3">
                {t('color')}: <span className="text-neutral-500 font-normal">{selectedColor || t('select')}</span>
              </h3>
              <div className="flex items-center gap-3">
                {product.cores.map((cor) => (
                  <button
                    key={cor.nome}
                    onClick={() => setSelectedColor(cor.nome)}
                    className={cn('w-8 h-8 rounded-full border-2 transition-all', selectedColor === cor.nome ? 'border-primary scale-110' : 'border-transparent hover:scale-110 ring-1 ring-neutral-200')}
                  >
                    <div className="w-full h-full rounded-full" style={{ backgroundColor: cor.hex }} aria-label={`${t('color')} ${cor.nome}`} />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">{t('size')}</h3>
              <button className="text-xs text-neutral-500 underline flex items-center hover:text-secondary transition-colors">
                <Ruler className="w-3 h-3 mr-1" /> {t('sizeGuide')}
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {product.tamanhos.map((tam) => (
                <button
                  key={tam}
                  onClick={() => setSelectedSize(tam)}
                  className={cn('border py-3 text-sm font-medium uppercase tracking-wider transition-colors text-center rounded-sm', selectedSize === tam ? 'border-primary bg-primary text-white' : 'border-neutral-200 text-secondary hover:border-primary hover:text-primary')}
                >
                  {tam}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-500 text-sm mb-4 font-medium">{error}</p>}

          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="flex items-center border border-neutral-300">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-3 text-neutral-500 hover:text-neutral-900 transition-colors">
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-12 text-center text-sm font-medium">{quantity}</span>
              <button onClick={() => setQuantity(Math.min(product.estoque, quantity + 1))} className="p-3 text-neutral-500 hover:text-neutral-900 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleAddToCart}
              className="flex-1 bg-primary text-white font-bold uppercase tracking-wider text-sm py-3 px-8 hover:bg-primary-dark transition-colors"
            >
              {t('addToCart')}
            </button>

            <button onClick={() => toggleWishlist(product.id)} className="flex items-center justify-center p-3 border border-neutral-300 hover:border-primary transition-colors group">
              <Heart className={cn('w-5 h-5 transition-colors', wishlist.includes(product.id) ? 'fill-primary text-primary' : 'text-secondary group-hover:text-primary')} />
            </button>
          </div>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-full bg-[#25D366] text-white font-bold uppercase tracking-wider text-sm py-3 px-8 hover:bg-[#20bd5a] transition-colors mb-8"
          >
            <MessageCircle className="w-5 h-5 mr-2" /> {t('buyViaWhatsapp')}
          </a>

          <div className="prose prose-sm prose-neutral max-w-none">
            <h4 className="text-sm font-bold uppercase tracking-wider text-neutral-900 mb-2">{t('description')}</h4>
            <p className="text-neutral-600 font-light leading-relaxed mb-6">{product.descricao}</p>

            <h4 className="text-sm font-bold uppercase tracking-wider text-neutral-900 mb-2">{t('compositionAndDetails')}</h4>
            <ul className="text-neutral-600 font-light list-disc pl-5">
              <li>{product.composicao}</li>
              <li>{t('madeInBrazil')}</li>
              <li>{t('handWashRecommended')}</li>
            </ul>
          </div>
        </div>
      </div>

      {product.avaliacoes.length > 0 && (
        <section className="py-16 border-t border-neutral-200 mt-16">
          <h2 className="text-2xl font-serif font-bold text-neutral-900 mb-8">{t('customerReviews')}</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {product.avaliacoes.map((review) => (
              <div key={review.id} className="bg-neutral-50 p-6">
                <div className="flex items-center mb-4">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={cn('w-4 h-4', i < review.nota ? 'fill-neutral-900 text-neutral-900' : 'fill-neutral-200 text-neutral-200')} />
                    ))}
                  </div>
                  <span className="text-xs text-neutral-400 ml-4 font-medium">{formatDate(review.data)}</span>
                </div>
                <p className="text-neutral-700 italic mb-4">"{review.comentario}"</p>
                <p className="text-sm font-bold text-neutral-900 uppercase tracking-wider">- {review.autor}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="py-16 border-t border-neutral-200 mt-8">
          <h2 className="text-2xl font-serif font-bold text-neutral-900 mb-8 text-center">{t('youMayAlsoLike')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10 sm:gap-x-6">
            {related.map((relatedProduct) => (
              <div key={relatedProduct.id} className="group relative flex flex-col">
                <Link to={`/product/${relatedProduct.id}`} className="block relative aspect-[3/4] bg-neutral-100 overflow-hidden mb-4">
                  <StoreImage
                    src={relatedProduct.imagens[0]}
                    alt={relatedProduct.nome}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(min-width: 1280px) 23vw, (min-width: 768px) 25vw, 50vw"
                  />
                </Link>
                <Link to={`/product/${relatedProduct.id}`} className="flex flex-col flex-1">
                  <h3 className="text-sm font-medium text-neutral-900 mb-1">{relatedProduct.nome}</h3>
                  <span className="text-neutral-900 font-bold">{formatCurrency(relatedProduct.precoPromocional || relatedProduct.preco)}</span>
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
