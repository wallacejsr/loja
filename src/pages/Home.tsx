import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Heart, CreditCard, BadgePercent, ShieldCheck, Trophy, Gift, Calendar, Ticket } from 'lucide-react';
import { cn } from '../lib/utils';
import { useCart } from '../context/CartContext';
import { useStorefront } from '../hooks/useStorefront';
import { useStoreData } from '../hooks/useStoreData';
import { Product } from '../data/mockData';
import { HomeCard, HomeSection as HomeSectionConfig, Raffle } from '../lib/storeApi';

export function Home() {
  const { products, banners, homeSections, homeCards, categories, raffles, loading } = useStoreData();
  const { t } = useStorefront();
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = banners.length ? banners : [];
  const activeHomeSections = homeSections
    .filter((section) => section.status === 'Ativo')
    .sort((a, b) => a.position - b.position);
  const categoryHomeSections = categories
    .filter((category) => category.status === 'Ativo' && category.showOnHome)
    .sort((a, b) => a.homeSectionOrder - b.homeSectionOrder || a.nome.localeCompare(b.nome));
  const activeRaffle = raffles
    .filter((raffle) => raffle.status === 'Ativo')
    .sort((a, b) => a.position - b.position)[0];

  useEffect(() => {
    if (!slides.length) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  useEffect(() => {
    setCurrentSlide(0);
  }, [slides.length]);

  return (
    <div className="w-full">
      {loading && !slides.length ? <HeroSkeleton /> : <HeroCarousel slides={slides} currentSlide={currentSlide} onChangeSlide={setCurrentSlide} />}

      <section className="py-6 bg-white border-y border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center divide-y md:divide-y-0 md:divide-x divide-neutral-200">
            <div className="flex items-center justify-center gap-4 px-4 py-2">
              <CreditCard className="w-10 h-10 text-[#c29656] stroke-[1.5] shrink-0" />
              <div className="text-left">
                <h3 className="font-extrabold text-secondary text-base lg:text-lg">{t('parcelingTitle')}</h3>
                <p className="text-sm text-secondary/80">{t('parcelingSubtitle')}</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 px-4 py-2">
              <BadgePercent className="w-12 h-12 text-[#c29656] stroke-[1.2] shrink-0" />
              <div className="text-left">
                <h3 className="font-extrabold text-secondary text-base lg:text-lg">{t('cashPaymentTitle')}</h3>
                <p className="text-sm text-secondary/80">{t('cashPaymentSubtitle')}</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 px-4 py-2">
              <ShieldCheck className="w-10 h-10 text-[#c29656] stroke-[1.5] shrink-0" />
              <div className="text-left">
                <h3 className="font-extrabold text-secondary text-base lg:text-lg">{t('securityTitle')}</h3>
                <p className="text-sm text-secondary/80">{t('securitySubtitle')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {activeHomeSections.slice(0, 1).map((section) => (
        <React.Fragment key={section.id}>
          <HomeProductSection section={section} products={products} />
        </React.Fragment>
      ))}

      {loading && !activeHomeSections.length && <HomeSectionSkeleton />}

      <HomeCardsSection cards={homeCards.filter((card) => card.status === 'Ativo').sort((a, b) => a.position - b.position)} />

      {loading && !homeCards.length && <HomeCardsSkeleton />}

      {activeRaffle && <RaffleCallout raffle={activeRaffle} />}

      {loading && !activeRaffle && <RaffleSkeleton />}

      {activeHomeSections.slice(1).map((section) => (
        <React.Fragment key={section.id}>
          <HomeProductSection section={section} products={products} />
        </React.Fragment>
      ))}

      {categoryHomeSections.map((category) => (
        <React.Fragment key={category.id}>
          <CategoryProductSection category={category} products={products} />
        </React.Fragment>
      ))}
    </div>
  );
}

function HeroCarousel({
  slides,
  currentSlide,
  onChangeSlide,
}: {
  slides: Array<{ desktop: string; mobile: string; link: string }>;
  currentSlide: number;
  onChangeSlide: (index: number) => void;
}) {
  return (
    <section className="relative w-full overflow-hidden bg-neutral-100 aspect-[4/3] md:aspect-[21/9]">
      {slides.map((slide, idx) => (
        <div
          key={idx}
          className={cn(
            'absolute inset-0 w-full h-full transition-opacity duration-1000',
            idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none',
          )}
        >
          <img
            src={slide.desktop}
            alt={`Banner ${idx + 1}`}
            className="absolute inset-0 w-full h-full object-cover hidden md:block"
          />
          <img
            src={slide.mobile}
            alt={`Banner ${idx + 1} mobile`}
            className="absolute inset-0 w-full h-full object-cover md:hidden"
          />
          <Link to={slide.link} className="absolute inset-0 z-20" aria-label={`Ir para o banner ${idx + 1}`} />
        </div>
      ))}

      <div className="absolute bottom-4 right-4 md:bottom-6 md:right-8 z-30 flex gap-2">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => onChangeSlide(idx)}
            className={cn(
              'rounded-full transition-all shadow-sm',
              idx === currentSlide ? 'bg-white w-6 h-2 md:h-2.5' : 'bg-white/60 w-2 h-2 md:w-2.5 md:h-2.5 hover:bg-white',
            )}
            aria-label={`Ir para o slide ${idx + 1}`}
          />
        ))}
      </div>
    </section>
  );
}

function HeroSkeleton() {
  return (
    <section className="relative w-full overflow-hidden bg-neutral-100 aspect-[4/3] md:aspect-[21/9] animate-pulse">
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-100 via-neutral-200 to-neutral-100" />
      <div className="absolute bottom-4 right-4 md:bottom-6 md:right-8 z-30 flex gap-2">
        {[0, 1, 2].map((dot) => (
          <div key={dot} className={cn('rounded-full bg-white/70', dot === 0 ? 'w-6 h-2 md:h-2.5' : 'w-2 h-2 md:w-2.5 md:h-2.5')} />
        ))}
      </div>
    </section>
  );
}

function HomeCardsSection({ cards }: { cards: HomeCard[] }) {
  const { t } = useStorefront();
  if (!cards.length) return null;

  return (
    <section className="py-10 bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {cards.map((card) => (
            <Link key={card.id} to={card.link || '/catalog'} className="block relative aspect-[4/3] overflow-hidden group bg-neutral-100">
              {card.image ? (
                <img src={card.image} alt={card.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-neutral-300">
                  <ImageIconPlaceholder />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-r from-black/80 via-black/55 to-black/75 backdrop-blur-sm flex items-center justify-between px-4">
                <span className="text-white text-base font-bold truncate pr-4">{card.title}</span>
                <span className="text-white text-[12px] font-bold uppercase tracking-wider inline-flex items-center gap-2 shrink-0">
                  {card.ctaLabel || t('checkOut')}
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function HomeCardsSkeleton() {
  return (
    <section className="py-10 bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0, 1, 2].map((item) => (
            <div key={item} className="relative aspect-[4/3] overflow-hidden bg-neutral-100 animate-pulse">
              <div className="absolute inset-0 bg-gradient-to-br from-neutral-100 via-neutral-200 to-neutral-100" />
              <div className="absolute inset-x-0 bottom-0 h-12 bg-black/20 flex items-center justify-between px-4">
                <div className="h-4 w-24 rounded bg-white/40" />
                <div className="h-3 w-16 rounded bg-white/30" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ImageIconPlaceholder() {
  return <div className="w-12 h-12 border border-neutral-200" />;
}

function RaffleCallout({ raffle }: { raffle: Raffle }) {
  const { t, formatDate } = useStorefront();
  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] bg-[#fbf8f3] border border-[#eadfce] overflow-hidden">
          <Link to={raffle.ctaLink || '/sorteios'} className="relative min-h-[300px] lg:min-h-[420px] bg-neutral-100 overflow-hidden group">
            {raffle.image ? (
              <img src={raffle.image} alt={raffle.prize || raffle.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-neutral-300">
                <Trophy className="w-16 h-16" />
              </div>
            )}
            <div className="absolute left-5 top-5 bg-white/95 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-primary shadow-sm">
              {t('activeRaffle')}
            </div>
          </Link>

          <div className="p-8 sm:p-10 lg:p-14 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-primary text-[11px] font-black uppercase tracking-[0.22em] mb-5">
              <Trophy className="w-4 h-4" />
              {t('loyaltyClub')}
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-secondary leading-tight mb-5">
              {raffle.title}
            </h2>
            <p className="text-secondary/70 text-[15px] sm:text-base leading-relaxed mb-8">
              {raffle.description}
            </p>

            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-3 text-secondary">
                <Gift className="w-5 h-5 text-primary shrink-0" />
                <span className="text-sm font-semibold">{raffle.prize}</span>
              </div>
              {raffle.drawDate && (
                <div className="flex items-center gap-3 text-secondary">
                  <Calendar className="w-5 h-5 text-primary shrink-0" />
                  <span className="text-sm font-semibold">{t('raffleDrawOn', { date: formatDate(`${raffle.drawDate}T00:00:00`) })}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-secondary">
                <Ticket className="w-5 h-5 text-primary shrink-0" />
                <span className="text-sm font-semibold">{t('pointsPerTicket', { count: raffle.pointsPerTicket })}</span>
              </div>
            </div>

            <Link
              to={raffle.ctaLink || '/sorteios'}
              className="w-full sm:w-fit bg-secondary text-white px-8 py-4 text-[12px] font-black uppercase tracking-widest hover:bg-primary transition-colors inline-flex items-center justify-center gap-3"
            >
              {raffle.ctaLabel || t('participateNow')}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function RaffleSkeleton() {
  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] border border-neutral-200 overflow-hidden animate-pulse">
          <div className="min-h-[300px] lg:min-h-[420px] bg-gradient-to-br from-neutral-100 via-neutral-200 to-neutral-100" />
          <div className="p-8 sm:p-10 lg:p-14 space-y-5">
            <div className="h-3 w-28 rounded bg-neutral-200" />
            <div className="h-10 w-3/4 rounded bg-neutral-200" />
            <div className="space-y-2">
              <div className="h-4 w-full rounded bg-neutral-100" />
              <div className="h-4 w-5/6 rounded bg-neutral-100" />
            </div>
            <div className="space-y-3 pt-2">
              <div className="h-4 w-40 rounded bg-neutral-100" />
              <div className="h-4 w-48 rounded bg-neutral-100" />
              <div className="h-4 w-36 rounded bg-neutral-100" />
            </div>
            <div className="h-12 w-48 rounded bg-neutral-200" />
          </div>
        </div>
      </div>
    </section>
  );
}

function CategoryProductSection({ category, products }: { category: { nome: string; homeSectionTitle: string; homeSectionLimit: number; homeSectionFilter: string }, products: Product[] }) {
  const filteredProducts = products
    .filter((product) => product.categoria === category.nome)
    .filter((product) => {
      if (category.homeSectionFilter === 'lancamentos') return Boolean(product.lancamento);
      if (category.homeSectionFilter === 'mais_vendidos') return Boolean(product.maisVendido);
      if (category.homeSectionFilter === 'promocoes') return Boolean(product.precoPromocional);
      return true;
    })
    .slice(0, category.homeSectionLimit);

  if (!filteredProducts.length) return null;

  return (
    <section className="py-10 md:py-12 bg-white">
      <ProductSection
        title={category.homeSectionTitle || category.nome}
        products={filteredProducts}
        link={`/catalog?category=${encodeURIComponent(category.nome)}`}
      />
    </section>
  );
}

function HomeProductSection({ section, products }: { section: HomeSectionConfig; products: Product[] }) {
  const filteredProducts = products.filter((product) => {
    if (section.sourceType === 'category') return product.categoria === section.categoryName;
    if (section.sourceType === 'lancamentos') return Boolean(product.lancamento);
    if (section.sourceType === 'mais_vendidos') return Boolean(product.maisVendido);
    if (section.sourceType === 'promocoes') return Boolean(product.precoPromocional);
    return false;
  }).slice(0, section.limitCount);

  if (!filteredProducts.length) return null;

  return (
    <section className="py-10 md:py-12 bg-white">
      <ProductSection title={section.title} products={filteredProducts} link={section.link} />
    </section>
  );
}

function ProductSection({ title, products, link }: { title: string; products: Product[]; link: string }) {
  const { toggleWishlist, wishlist } = useCart();
  const { t, formatCurrency } = useStorefront();
  const productCount = products.length;
  const gridClassName = productCount === 1
    ? 'grid grid-cols-1 max-w-sm'
    : productCount === 2
      ? 'grid grid-cols-2 max-w-3xl gap-x-4 gap-y-8 sm:gap-x-6'
      : productCount === 3
        ? 'grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-8 sm:gap-x-6'
        : 'grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-6';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-5 border-b-2 border-primary pb-2">
        <h2 className="text-xl font-bold uppercase tracking-wider text-primary">{title}</h2>
        <Link to={link} className="text-xs font-bold uppercase tracking-wider flex items-center text-secondary hover:text-primary transition-colors">
          {t('viewAll')} <ArrowRight className="w-4 h-4 ml-1" />
        </Link>
      </div>
      <div className={gridClassName}>
        {products.map((product) => {
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
                    <span className="bg-primary text-white text-[10px] font-bold px-2 py-1 uppercase tracking-wider rounded-sm">Sale</span>
                  )}
                </div>
              </Link>

              <button
                onClick={(e) => {
                  e.preventDefault();
                  toggleWishlist(product.id);
                }}
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
                className="mt-4 w-full bg-secondary text-white font-bold text-xs uppercase tracking-wider py-3 text-center hover:bg-primary transition-colors rounded-sm sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              >
                {t('viewDetails')}
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HomeSectionSkeleton() {
  return (
    <section className="py-10 md:py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-5 border-b-2 border-primary pb-2">
          <div className="h-5 w-36 rounded bg-neutral-200 animate-pulse" />
          <div className="h-4 w-20 rounded bg-neutral-100 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-6">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="flex flex-col animate-pulse">
              <div className="aspect-[3/4] bg-gradient-to-br from-neutral-100 via-neutral-200 to-neutral-100 mb-4" />
              <div className="h-4 w-3/4 mx-auto rounded bg-neutral-200" />
              <div className="h-6 w-24 mx-auto rounded bg-neutral-100 mt-3" />
              <div className="h-3 w-28 mx-auto rounded bg-neutral-100 mt-2" />
              <div className="h-11 w-full rounded bg-neutral-200 mt-4" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
