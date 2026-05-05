import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { cn } from '../lib/utils';
import { useStoreData } from '../hooks/useStoreData';

export function Wishlist() {
  const { wishlist, toggleWishlist } = useCart();
  const { products } = useStoreData();
  
  const wishlistProducts = products.filter(p => wishlist.includes(p.id));

  if (wishlistProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
        <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mb-6">
           <Heart className="w-8 h-8 text-neutral-400" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-secondary mb-4">Sua lista de desejos está vazia</h2>
        <p className="text-secondary/70 mb-8 max-w-sm">
          Salve seus itens favoritos para comprá-los mais tarde. Clique no coração em qualquer produto para adicioná-lo.
        </p>
        <Link
          to="/catalog"
          className="bg-primary text-white px-8 py-3 font-bold uppercase tracking-wider text-sm hover:bg-primary-dark transition-colors rounded-sm"
        >
          Explorar Produtos
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
      <div className="flex items-center justify-between mb-10 border-b-2 border-primary pb-4">
        <h1 className="text-3xl font-serif font-bold text-secondary uppercase tracking-wider">Meus Favoritos</h1>
        <span className="text-secondary/70 font-medium">{wishlistProducts.length} itens</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-10 sm:gap-x-6 xl:gap-x-8">
        {wishlistProducts.map((product) => (
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
            </Link>
            
            <button 
              onClick={(e) => { e.preventDefault(); toggleWishlist(product.id); }}
              className="absolute top-2 right-2 p-2 bg-white/80 backdrop-blur rounded-full shadow-sm transition-all z-10 hover:bg-white"
              aria-label="Remover dos favoritos"
            >
              <Heart className="w-4 h-4 fill-primary text-primary" />
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
              </div>
            </Link>
            <Link 
              to={`/product/${product.id}`}
              className="mt-4 w-full bg-secondary text-white font-bold text-xs uppercase tracking-wider py-3 text-center hover:bg-primary transition-colors rounded-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
            >
              Ver Detalhes
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
