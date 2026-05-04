import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Star, Heart, MessageCircle, ChevronRight, Ruler, Plus, Minus, Gift } from 'lucide-react';
import { produtos, Product } from '../data/mockData';
import { cn } from '../lib/utils';
import { useCart } from '../context/CartContext';
import { useSettings } from '../hooks/useSettings';

export function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const product = produtos.find(p => p.id === id);
  const { addToCart, wishlist, toggleWishlist } = useCart();
  const { settings } = useSettings();

  const [mainImage, setMainImage] = useState(product?.imagens[0]);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <h2 className="text-2xl font-serif font-bold mb-4">Produto não encontrado</h2>
        <Link to="/catalog" className="underline text-neutral-500">Voltar para a loja</Link>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (!selectedSize) {
      setError('Por favor, selecione um tamanho.');
      return;
    }
    if (!selectedColor && product.cores.length > 0) {
      setError('Por favor, selecione uma cor.');
      return;
    }
    setError('');
    const colorToUse = selectedColor || (product.cores[0]?.nome || 'Única');
    addToCart(product, quantity, selectedSize, colorToUse);
    navigate('/cart');
  };

  const calculateAverageRating = (reviews: any[]) => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, rev) => acc + rev.nota, 0);
    return (sum / reviews.length).toFixed(1);
  };

  const whatsappMessage = encodeURIComponent(`Olá! Tenho interesse no produto ${product.nome} (ID: ${product.id}). Vocês têm disponibilidade?`);

  // Mock related products
  const related = produtos.filter(p => p.categoria === product.categoria && p.id !== product.id).slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumbs */}
      <nav className="flex items-center text-xs font-medium text-neutral-500 mb-8 uppercase tracking-wider">
        <Link to="/" className="hover:text-neutral-900 transition-colors">Home</Link>
        <ChevronRight className="w-3 h-3 mx-2" />
        <Link to={`/catalog?category=${product.categoria}`} className="hover:text-secondary transition-colors">{product.categoria}</Link>
        <ChevronRight className="w-3 h-3 mx-2" />
        <span className="text-secondary">{product.nome}</span>
      </nav>

      <div className="lg:grid lg:grid-cols-2 lg:gap-x-12 xl:gap-x-16">
        {/* Gallery */}
        <div className="flex flex-col-reverse sm:flex-row gap-4 mb-8 lg:mb-0">
          <div className="flex sm:flex-col gap-4 overflow-x-auto sm:w-20 md:w-24 shrink-0 hide-scrollbar">
            {product.imagens.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setMainImage(img)}
                className={cn(
                  "relative aspect-[3/4] w-20 sm:w-full overflow-hidden bg-neutral-100",
                  mainImage === img ? "ring-1 ring-primary" : "opacity-70 hover:opacity-100 transition-opacity"
                )}
              >
                <img src={img} alt={`Thumb ${idx}`} className="absolute inset-0 w-full h-full object-cover" />
              </button>
            ))}
          </div>
          <div className="relative aspect-[3/4] w-full bg-neutral-100 overflow-hidden group cursor-zoom-in">
             <img src={mainImage || product.imagens[0]} alt={product.nome} className="absolute inset-0 w-full h-full object-cover" />
             {/* Optional: Add basic zoom effect via CSS transform on hover */}
             <div className="absolute inset-0 bg-black/0 transition-colors duration-300"></div>
          </div>
        </div>

        {/* Product Info */}
        <div className="flex flex-col">
          <div className="mb-6">
             <h1 className="text-2xl sm:text-3xl font-serif font-bold text-secondary mb-2">{product.nome}</h1>
             
             {product.estoque <= 5 && (
                <div className="inline-block bg-red-100 text-red-700 text-xs font-bold px-2 py-1 uppercase tracking-wider mb-2">
                   Últimas {product.estoque} peças disponíveis!
                </div>
             )}
             
             {/* Price & Rating */}
             <div className="flex items-center justify-between mt-4">
                <div>
                   {product.precoPromocional ? (
                      <div className="flex items-center gap-3">
                         <span className="text-neutral-500 line-through text-lg">R$ {product.preco.toFixed(2).replace('.', ',')}</span>
                         <span className="text-2xl font-bold text-primary">R$ {product.precoPromocional.toFixed(2).replace('.', ',')}</span>
                      </div>
                   ) : (
                      <span className="text-2xl font-bold text-primary">R$ {product.preco.toFixed(2).replace('.', ',')}</span>
                   )}
                   <p className="text-sm text-neutral-500 mt-1">ou em até 6x de R$ {((product.precoPromocional || product.preco) / 6).toFixed(2).replace('.', ',')} sem juros</p>
                </div>
                
                {product.avaliacoes.length > 0 && (
                   <div className="flex flex-col items-end">
                      <div className="flex items-center">
                         <Star className="w-4 h-4 fill-primary text-primary" />
                         <span className="ml-1 text-sm font-bold text-secondary">{calculateAverageRating(product.avaliacoes)}</span>
                      </div>
                      <span className="text-xs text-neutral-500 underline mt-1 cursor-pointer">({product.avaliacoes.length} avaliações)</span>
                   </div>
                )}
             </div>
          </div>

          {/* Loyalty Points Info */}
          <div className="mb-6 p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center gap-4 group hover:bg-primary/10 transition-colors cursor-help">
             <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
                <Gift className="w-5 h-5" />
             </div>
             <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-0.5">Bônus de Fidelidade</span>
                <p className="text-secondary text-[13px] font-medium leading-tight">
                   Compre e ganhe <span className="font-bold text-primary">{Math.floor((product.precoPromocional || product.preco) * (settings.pointsPerReal || 1))} pontos</span> para o clube de sorteios.
                </p>
             </div>
          </div>

          <div className="w-full h-px bg-neutral-200 mb-6"></div>

          {/* Color Selection */}
          {product.cores.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-secondary mb-3">
                Cor: <span className="text-neutral-500 font-normal">{selectedColor || 'Selecione'}</span>
              </h3>
              <div className="flex items-center gap-3">
                {product.cores.map((cor) => (
                  <button
                    key={cor.nome}
                    onClick={() => setSelectedColor(cor.nome)}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      selectedColor === cor.nome ? "border-primary scale-110" : "border-transparent hover:scale-110 ring-1 ring-neutral-200"
                    )}
                  >
                    <div 
                      className="w-full h-full rounded-full" 
                      style={{ backgroundColor: cor.hex }} 
                      aria-label={`Cor ${cor.nome}`}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size Selection */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
               <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">Tamanho</h3>
               <button className="text-xs text-neutral-500 underline flex items-center hover:text-secondary transition-colors">
                  <Ruler className="w-3 h-3 mr-1" /> Guia de Medidas
               </button>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {product.tamanhos.map((tam) => (
                <button
                  key={tam}
                  onClick={() => setSelectedSize(tam)}
                  className={cn(
                    "border py-3 text-sm font-medium uppercase tracking-wider transition-colors text-center rounded-sm",
                    selectedSize === tam 
                      ? "border-primary bg-primary text-white" 
                      : "border-neutral-200 text-secondary hover:border-primary hover:text-primary"
                  )}
                >
                  {tam}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-500 text-sm mb-4 font-medium">{error}</p>}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
             <div className="flex items-center border border-neutral-300">
               <button 
                 onClick={() => setQuantity(Math.max(1, quantity - 1))}
                 className="p-3 text-neutral-500 hover:text-neutral-900 transition-colors"
               >
                 <Minus className="w-4 h-4" />
               </button>
               <span className="w-12 text-center text-sm font-medium">{quantity}</span>
               <button 
                 onClick={() => setQuantity(Math.min(product.estoque, quantity + 1))}
                 className="p-3 text-neutral-500 hover:text-neutral-900 transition-colors"
               >
                 <Plus className="w-4 h-4" />
               </button>
             </div>
             
             <button
               onClick={handleAddToCart}
               className="flex-1 bg-primary text-white font-bold uppercase tracking-wider text-sm py-3 px-8 hover:bg-primary-dark transition-colors"
             >
               Adicionar ao Carrinho
             </button>

             <button
                onClick={() => toggleWishlist(product.id)}
                className="flex items-center justify-center p-3 border border-neutral-300 hover:border-primary transition-colors group"
             >
                <Heart className={cn("w-5 h-5 transition-colors", wishlist.includes(product.id) ? "fill-primary text-primary" : "text-secondary group-hover:text-primary")} />
             </button>
          </div>

          {/* WhatsApp Buy */}
          <a
            href={`https://wa.me/5564992023191?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-full bg-[#25D366] text-white font-bold uppercase tracking-wider text-sm py-3 px-8 hover:bg-[#20bd5a] transition-colors mb-8"
          >
            <MessageCircle className="w-5 h-5 mr-2" /> Comprar via WhatsApp
          </a>

          {/* Description & Details */}
          <div className="prose prose-sm prose-neutral max-w-none">
            <h4 className="text-sm font-bold uppercase tracking-wider text-neutral-900 mb-2">Descrição</h4>
            <p className="text-neutral-600 font-light leading-relaxed mb-6">{product.descricao}</p>
            
            <h4 className="text-sm font-bold uppercase tracking-wider text-neutral-900 mb-2">Composição & Detalhes</h4>
            <ul className="text-neutral-600 font-light list-disc pl-5">
               <li>{product.composicao}</li>
               <li>Feito no Brasil</li>
               <li>Lavar à mão recomendado</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      {product.avaliacoes.length > 0 && (
         <section className="py-16 border-t border-neutral-200 mt-16">
            <h2 className="text-2xl font-serif font-bold text-neutral-900 mb-8">Avaliações Clientes</h2>
            <div className="grid md:grid-cols-2 gap-8">
               {product.avaliacoes.map(review => (
                  <div key={review.id} className="bg-neutral-50 p-6">
                     <div className="flex items-center mb-4">
                        <div className="flex">
                           {[...Array(5)].map((_, i) => (
                              <Star key={i} className={cn("w-4 h-4", i < review.nota ? "fill-neutral-900 text-neutral-900" : "fill-neutral-200 text-neutral-200")} />
                           ))}
                        </div>
                        <span className="text-xs text-neutral-400 ml-4 font-medium">{review.data}</span>
                     </div>
                     <p className="text-neutral-700 italic mb-4">"{review.comentario}"</p>
                     <p className="text-sm font-bold text-neutral-900 uppercase tracking-wider">- {review.autor}</p>
                  </div>
               ))}
            </div>
         </section>
      )}

      {/* Related Products */}
      {related.length > 0 && (
        <section className="py-16 border-t border-neutral-200 mt-8">
           <h2 className="text-2xl font-serif font-bold text-neutral-900 mb-8 text-center">Você também pode gostar</h2>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10 sm:gap-x-6">
              {related.map(p => (
                 <div key={p.id} className="group relative flex flex-col">
                  <Link to={`/product/${p.id}`} className="block relative aspect-[3/4] bg-neutral-100 overflow-hidden mb-4">
                    <img src={p.imagens[0]} alt={p.nome} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  </Link>
                  <Link to={`/product/${p.id}`} className="flex flex-col flex-1">
                    <h3 className="text-sm font-medium text-neutral-900 mb-1">{p.nome}</h3>
                    <span className="text-neutral-900 font-bold">R$ {(p.precoPromocional || p.preco).toFixed(2).replace('.', ',')}</span>
                  </Link>
                </div>
              ))}
           </div>
        </section>
      )}

    </div>
  );
}
