import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { cn } from '../lib/utils';

export function Cart() {
  const { cart, removeFromCart, updateQuantity, cartTotal } = useCart();
  const navigate = useNavigate();
  const [cupom, setCupom] = useState('');
  const [descontoCupom, setDescontoCupom] = useState(0);
  const [cupomFeedback, setCupomFeedback] = useState('');
  const [cep, setCep] = useState('');
  const [frete, setFrete] = useState(0);

  const applyCupom = () => {
    if (cupom.toUpperCase() === 'BEMVINDA10') {
      setDescontoCupom(cartTotal * 0.10);
      setCupomFeedback('Cupom aplicado com sucesso.');
    } else {
      setCupomFeedback('Cupom inválido.');
      setDescontoCupom(0);
    }
  };

  const calcularFrete = () => {
     if (cep.length >= 8) {
        if (cartTotal > 199) {
           setFrete(0); // Frete grátis
        } else {
           setFrete(25.90); // Valor fixo mockado
        }
     }
  };

  const totalFinal = cartTotal - descontoCupom + frete;

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
        <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mb-6">
           <ShoppingBag className="w-8 h-8 text-neutral-400" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-secondary mb-4">Sua sacola está vazia</h2>
        <p className="text-neutral-500 mb-8 max-w-sm">Parece que você ainda não adicionou nenhum produto à sua sacola de compras.</p>
        <Link
          to="/catalog"
          className="bg-primary text-white px-8 py-3 font-bold uppercase tracking-wider text-sm hover:bg-primary-dark transition-colors rounded-sm"
        >
          Continuar Comprando
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
      <h1 className="text-3xl font-serif font-bold text-neutral-900 mb-10 border-b border-neutral-200 pb-4">Sua Sacola</h1>

      <div className="lg:grid lg:grid-cols-12 lg:gap-12">
        {/* Lista de Produtos */}
        <div className="lg:col-span-8">
          <div className="hidden sm:grid grid-cols-12 gap-4 text-xs font-bold uppercase tracking-wider text-neutral-500 mb-4 border-b border-neutral-200 pb-2">
             <div className="col-span-6">Produto</div>
             <div className="col-span-2 text-center">Preço</div>
             <div className="col-span-2 text-center">Qtd</div>
             <div className="col-span-2 text-right">Total</div>
          </div>
          
          <ul className="divide-y divide-neutral-200 border-b border-neutral-200 lg:border-b-0 mb-8 lg:mb-0">
            {cart.map((item) => {
               const precoUnitario = item.product.precoPromocional || item.product.preco;
               const totalItem = precoUnitario * item.quantity;
               
               return (
              <li key={`${item.product.id}-${item.size}-${item.color}`} className="py-6 flex flex-col sm:flex-row sm:items-center">
                <div className="flex items-center sm:w-1/2">
                  <img
                    src={item.product.imagens[0]}
                    alt={item.product.nome}
                    className="h-24 w-20 object-cover bg-neutral-100"
                  />
                  <div className="ml-4 flex-1">
                    <Link to={`/product/${item.product.id}`} className="text-sm font-bold text-neutral-900 hover:underline">
                       {item.product.nome}
                    </Link>
                    <p className="mt-1 text-xs text-neutral-500 uppercase tracking-wider">
                      Cor: {item.color} | Tamanho: {item.size}
                    </p>
                    {/* Preço Mobile */}
                    <div className="mt-2 sm:hidden text-sm font-bold text-neutral-900">
                       R$ {precoUnitario.toFixed(2).replace('.', ',')}
                    </div>
                  </div>
                </div>

                {/* Preço Desktop */}
                <div className="hidden sm:block sm:w-1/6 text-center text-sm font-medium text-neutral-900">
                   R$ {precoUnitario.toFixed(2).replace('.', ',')}
                </div>

                <div className="mt-4 sm:mt-0 flex items-center justify-between sm:w-2/6 sm:justify-end">
                  <div className="flex items-center border border-neutral-300 mr-4 sm:mr-8">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.size, item.color, item.quantity - 1)}
                      className="p-2 text-neutral-500 hover:text-neutral-900 transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.size, item.color, item.quantity + 1)}
                      className="p-2 text-neutral-500 hover:text-neutral-900 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  
                  <div className="flex flex-col items-end">
                     {/* Total Item */}
                     <span className="text-sm font-bold text-neutral-900 mb-2">
                        R$ {totalItem.toFixed(2).replace('.', ',')}
                     </span>
                     <button
                       onClick={() => removeFromCart(item.product.id, item.size, item.color)}
                       className="text-xs text-neutral-500 hover:text-red-500 flex items-center transition-colors uppercase tracking-wider font-medium"
                     >
                       <Trash2 className="w-3 h-3 mr-1" /> Remover
                     </button>
                  </div>
                </div>
              </li>
            )})}
          </ul>
        </div>

        {/* Resumo do Pedido */}
        <div className="lg:col-span-4">
          <div className="bg-neutral-50 p-6 sm:p-8">
            <h2 className="text-lg font-bold text-neutral-900 mb-6 uppercase tracking-wider border-b border-neutral-200 pb-4">Resumo do Pedido</h2>
            
            <dl className="space-y-4 text-sm text-neutral-600 mb-6 border-b border-neutral-200 pb-6">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd className="font-medium text-neutral-900">R$ {cartTotal.toFixed(2).replace('.', ',')}</dd>
              </div>

              {descontoCupom > 0 && (
                <div className="flex justify-between text-green-600">
                   <dt>Desconto</dt>
                   <dd className="font-medium">- R$ {descontoCupom.toFixed(2).replace('.', ',')}</dd>
                </div>
              )}

              <div className="flex justify-between">
                <dt>Frete</dt>
                <dd className="font-medium text-neutral-900">
                   {frete > 0 ? `R$ ${frete.toFixed(2).replace('.', ',')}` : frete === 0 && cep ? 'Grátis' : 'A calcular'}
                </dd>
              </div>
            </dl>

            <div className="flex items-center justify-between font-bold text-lg text-neutral-900 mb-8">
              <span>Total</span>
              <span>R$ {totalFinal.toFixed(2).replace('.', ',')}</span>
            </div>

            {/* Cep */}
            <div className="mb-6">
               <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">Simular Frete</label>
               <div className="flex text-sm border border-neutral-300 focus-within:border-primary rounded-sm overflow-hidden">
                  <input 
                     type="text" 
                     placeholder="CEP" 
                     value={cep}
                     onChange={(e) => setCep(e.target.value)}
                     className="w-full px-3 py-2 bg-white focus:outline-none"
                  />
                  <button onClick={calcularFrete} className="bg-neutral-100 text-secondary px-4 py-2 font-medium uppercase tracking-wider hover:bg-neutral-200 transition-colors">
                     Calc
                  </button>
               </div>
               {cartTotal > 199 && (
                  <p className="text-xs text-green-600 font-bold mt-2">Você atingiu o frete grátis!</p>
               )}
            </div>

            {/* Cupom */}
            <div className="mb-8 border-t border-neutral-200 pt-6">
               <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">Cupom de Desconto</label>
               <div className="flex text-sm border border-neutral-300 focus-within:border-primary rounded-sm overflow-hidden">
                  <input 
                     type="text" 
                     placeholder="Código" 
                     value={cupom}
                     onChange={(e) => setCupom(e.target.value)}
                     className="w-full px-3 py-2 bg-white focus:outline-none uppercase"
                  />
                  <button onClick={applyCupom} className="bg-neutral-100 text-secondary px-4 py-2 font-medium uppercase tracking-wider hover:bg-neutral-200 transition-colors">
                     Aplicar
                  </button>
               </div>
               {cupomFeedback && (
                 <p className={cn(
                   "mt-2 text-xs font-semibold",
                   descontoCupom > 0 ? "text-emerald-600" : "text-red-600"
                 )}>
                   {cupomFeedback}
                 </p>
               )}
            </div>

            <button
              onClick={() => navigate('/checkout')}
              className="w-full flex items-center justify-center bg-primary text-white px-8 py-4 font-bold uppercase tracking-wider text-sm hover:bg-primary-dark transition-colors shadow-lg rounded-sm"
            >
              Finalizar Compra <ArrowRight className="w-4 h-4 ml-2" />
            </button>
            <div className="mt-4 text-center">
               <Link to="/catalog" className="text-xs text-secondary/70 underline font-medium hover:text-primary transition-colors uppercase tracking-wider">
                  Ou continuar comprando
               </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
