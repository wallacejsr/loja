import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Heart, CreditCard, BadgePercent, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';
import { useCart } from '../context/CartContext';
import { useStoreData } from '../hooks/useStoreData';
import { Product } from '../data/mockData';
import { HomeSection as HomeSectionConfig } from '../lib/storeApi';

export function Home() {
  const { products, banners, homeSections, categories } = useStoreData();
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = banners.length ? banners : [];
  const activeHomeSections = homeSections
    .filter((section) => section.status === 'Ativo')
    .sort((a, b) => a.position - b.position);
  const categoryHomeSections = categories
    .filter((category) => category.status === 'Ativo' && category.showOnHome)
    .sort((a, b) => a.homeSectionOrder - b.homeSectionOrder || a.nome.localeCompare(b.nome));

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
      {/* Hero Carousel */}
      <section className="relative w-full overflow-hidden bg-neutral-100 aspect-[4/3] md:aspect-[21/9]">
        {slides.map((slide, idx) => (
          <div 
            key={idx}
            className={cn(
              "absolute inset-0 w-full h-full transition-opacity duration-1000",
              idx === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
            )}
          >
            {/* Desktop Image */}
            <img
              src={slide.desktop}
              alt={`Banner ${idx + 1}`}
              className="absolute inset-0 w-full h-full object-cover hidden md:block"
            />
            {/* Mobile Image */}
            <img
              src={slide.mobile}
              alt={`Banner ${idx + 1} mobile`}
              className="absolute inset-0 w-full h-full object-cover md:hidden"
            />
            <Link to={slide.link} className="absolute inset-0 z-20" aria-label="Ver Coleção"></Link>
          </div>
        ))}
        
        {/* Navigation Dots */}
        <div className="absolute bottom-4 right-4 md:bottom-6 md:right-8 z-30 flex gap-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={cn(
                "rounded-full transition-all shadow-sm",
                idx === currentSlide 
                  ? "bg-white w-6 h-2 md:h-2.5" 
                  : "bg-white/60 w-2 h-2 md:w-2.5 md:h-2.5 hover:bg-white"
              )}
              aria-label={`Ir para o slide ${idx + 1}`}
            />
          ))}
        </div>
      </section>

      {/* Brand Differentials */}
      <section className="py-6 bg-white border-y border-neutral-200">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center divide-y md:divide-y-0 md:divide-x divide-neutral-200">
               <div className="flex items-center justify-center gap-4 px-4 py-2">
                  <CreditCard className="w-10 h-10 text-[#c29656] stroke-[1.5] shrink-0" />
                  <div className="text-left">
                     <h3 className="font-extrabold text-secondary text-base lg:text-lg">Parcelamento</h3>
                     <p className="text-sm text-secondary/80">Em até 12X no Cartão</p>
                  </div>
               </div>
               <div className="flex items-center justify-center gap-4 px-4 py-2">
                  <BadgePercent className="w-12 h-12 text-[#c29656] stroke-[1.2] shrink-0" />
                  <div className="text-left">
                     <h3 className="font-extrabold text-secondary text-base lg:text-lg">Pagamento À Vista</h3>
                     <p className="text-sm text-secondary/80">5% de desconto Pix/Boleto</p>
                  </div>
               </div>
               <div className="flex items-center justify-center gap-4 px-4 py-2">
                  <ShieldCheck className="w-10 h-10 text-[#c29656] stroke-[1.5] shrink-0" />
                  <div className="text-left">
                     <h3 className="font-extrabold text-secondary text-base lg:text-lg">Segurança</h3>
                     <p className="text-sm text-secondary/80">Loja com SSL de Proteção</p>
                  </div>
               </div>
            </div>
         </div>
      </section>

      {activeHomeSections.slice(0, 1)
        .map((section) => (
          <React.Fragment key={section.id}>
            <HomeProductSection section={section} products={products} />
          </React.Fragment>
        ))}

      {/* Destaques / Categories Banners */}
      <section className="py-10 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Link to="/catalog?category=Feminino&subcategory=Calças" className="block relative aspect-[4/3] overflow-hidden group">
                 <img src="https://cdn.awsli.com.br/1140x850/2751/2751677/banner/calcas-l87gy6ydk4.png" alt="Calças" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                 <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors"></div>
              </Link>
              <Link to="/catalog?category=Feminino&subcategory=Vestidos" className="block relative aspect-[4/3] overflow-hidden group">
                 <img src="https://cdn.awsli.com.br/1140x850/2751/2751677/banner/vestido-n03vsfjlk3.png" alt="Vestidos" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                 <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors"></div>
              </Link>
           </div>
        </div>
      </section>

      {activeHomeSections.slice(1)
        .map((section) => (
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

function CategoryProductSection({ category, products }: { category: { nome: string; homeSectionTitle: string; homeSectionLimit: number }, products: Product[] }) {
  const filteredProducts = products
    .filter((product) => product.categoria === category.nome)
    .slice(0, category.homeSectionLimit);

  if (!filteredProducts.length) return null;

  return (
    <section className="py-16 bg-white">
      <ProductSection
        title={category.homeSectionTitle || category.nome}
        products={filteredProducts}
        link={`/catalog?category=${encodeURIComponent(category.nome)}`}
      />
    </section>
  );
}

function HomeProductSection({ section, products }: { section: HomeSectionConfig, products: Product[] }) {
  const filteredProducts = products.filter((product) => {
    if (section.sourceType === 'category') return product.categoria === section.categoryName;
    if (section.sourceType === 'lancamentos') return Boolean(product.lancamento);
    if (section.sourceType === 'mais_vendidos') return Boolean(product.maisVendido);
    if (section.sourceType === 'promocoes') return Boolean(product.precoPromocional);
    return false;
  }).slice(0, section.limitCount);

  if (!filteredProducts.length) return null;

  return (
    <section className="py-16 bg-white">
      <ProductSection title={section.title} products={filteredProducts} link={section.link} />
    </section>
  );
}

function ProductSection({ title, products, link }: { title: string, products: Product[], link: string }) {
  const { toggleWishlist, wishlist } = useCart();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-8 border-b-2 border-primary pb-2">
        <h2 className="text-xl font-bold uppercase tracking-wider text-primary">{title}</h2>
        <Link to={link} className="text-xs font-bold uppercase tracking-wider flex items-center text-secondary hover:text-primary transition-colors">
          Ver Todos <ArrowRight className="w-4 h-4 ml-1" />
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10 sm:gap-x-6">
        {products.map((product) => (
          <div key={product.id} className="group relative flex flex-col">
            <Link to={`/product/${product.id}`} className="block relative aspect-[3/4] bg-neutral-100 overflow-hidden mb-4">
              <img
                src={product.imagens[0]}
                alt={product.nome}
                className="w-full h-full object-cover transition-opacity duration-500 group-hover:opacity-0"
              />
               {product.imagens[1] && (
                 <img
                   src={product.imagens[1]}
                   alt={`${product.nome} alternate`}
                   className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                 />
               )}
              
              {/* Badges */}
              <div className="absolute top-2 left-2 flex flex-col gap-2 z-10">
                {product.lancamento && (
                   <span className="bg-secondary text-white text-[10px] font-bold px-2 py-1 uppercase tracking-wider rounded-sm">Novo</span>
                )}
                {product.precoPromocional && (
                   <span className="bg-primary text-white text-[10px] font-bold px-2 py-1 uppercase tracking-wider rounded-sm">Sale</span>
                )}
              </div>
            </Link>
            
            <button 
              onClick={(e) => { e.preventDefault(); toggleWishlist(product.id); }}
              className="absolute top-2 right-2 p-2 bg-white/80 backdrop-blur rounded-full shadow-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:translate-y-2 sm:group-hover:translate-y-0 transition-all z-10 hover:bg-white"
            >
              <Heart className={cn("w-4 h-4", wishlist.includes(product.id) ? "fill-primary text-primary" : "text-secondary")} />
            </button>

            <Link to={`/product/${product.id}`} className="flex flex-col flex-1 text-center">
              <h3 className="text-sm font-medium text-secondary mb-2 line-clamp-2">{product.nome}</h3>
              <div className="mt-auto">
                {product.precoPromocional ? (
                  <div className="flex flex-col items-center gap-0.5">
                     <span className="text-secondary/50 line-through text-xs">R$ {product.preco.toFixed(2).replace('.', ',')}</span>
                     <span className="text-primary font-bold text-lg">R$ {product.precoPromocional.toFixed(2).replace('.', ',')}</span>
                  </div>
                ) : (
                  <span className="text-primary font-bold text-lg block">R$ {product.preco.toFixed(2).replace('.', ',')}</span>
                )}
                <span className="block text-[#1a222b] text-xs mt-1">
                  até <strong>4x</strong> de <strong>R$ {((product.precoPromocional || product.preco) / 4).toFixed(2).replace('.', ',')}</strong> sem juros
                </span>
              </div>
            </Link>
            
            <Link 
              to={`/product/${product.id}`}
              className="mt-4 w-full bg-secondary text-white font-bold text-xs uppercase tracking-wider py-3 text-center hover:bg-primary transition-colors rounded-sm sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
            >
              Ver Detalhes
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
