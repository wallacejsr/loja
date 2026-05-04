import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { CheckCircle, CreditCard, ShoppingBag, Truck } from 'lucide-react';
import { useLoyalty } from '../hooks/useLoyalty';
import { useSettings } from '../hooks/useSettings';

export function Checkout() {
  const { cart, cartTotal } = useCart();
  const navigate = useNavigate();
  const { addPoints } = useLoyalty();
  const { settings } = useSettings();
  const [step, setStep] = useState(1); // 1: Info, 2: Shipping, 3: Payment, 4: Success

  if (cart.length === 0 && step !== 4) {
    navigate('/cart');
    return null;
  }

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 3) {
       addPoints(Math.floor(cartTotal * (settings.pointsPerReal || 1)));
    }
    setStep(step + 1);
  };

  if (step === 4) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
        <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-6">
           <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
        <h2 className="text-3xl font-serif font-bold text-neutral-900 mb-4">Pedido Confirmado!</h2>
        <p className="text-neutral-600 mb-2">Obrigado por comprar na Spaçodani.</p>
        <p className="text-neutral-500 mb-8 max-w-md">O número do seu pedido é <strong>#SD{Math.floor(Math.random() * 100000)}</strong>. Enviaremos as atualizações para o seu e-mail.</p>
        <button
          onClick={() => {
             // In a real app we'd clear the cart here
             navigate('/');
          }}
          className="bg-neutral-900 text-white px-8 py-3 font-bold uppercase tracking-wider text-sm hover:bg-neutral-800 transition-colors"
        >
          Voltar para Home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
       
      {/* Checkout Steps */}
      <div className="flex items-center justify-center mb-12">
         <div className="flex items-center text-xs font-bold uppercase tracking-wider">
            <span className={`flex items-center justify-center w-8 h-8 rounded-full border-2 mr-2 ${step >= 1 ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 text-neutral-400'}`}>1</span>
            <span className={`hidden sm:inline ${step >= 1 ? 'text-neutral-900' : 'text-neutral-400'}`}>Identificação</span>
            
            <div className={`w-8 sm:w-16 h-px mx-4 ${step >= 2 ? 'bg-neutral-900' : 'bg-neutral-300'}`}></div>
            
            <span className={`flex items-center justify-center w-8 h-8 rounded-full border-2 mr-2 ${step >= 2 ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 text-neutral-400'}`}>2</span>
            <span className={`hidden sm:inline ${step >= 2 ? 'text-neutral-900' : 'text-neutral-400'}`}>Entrega</span>

            <div className={`w-8 sm:w-16 h-px mx-4 ${step >= 3 ? 'bg-neutral-900' : 'bg-neutral-300'}`}></div>
            
            <span className={`flex items-center justify-center w-8 h-8 rounded-full border-2 mr-2 ${step >= 3 ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 text-neutral-400'}`}>3</span>
            <span className={`hidden sm:inline ${step >= 3 ? 'text-neutral-900' : 'text-neutral-400'}`}>Pagamento</span>
         </div>
      </div>

      <div className="lg:grid lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-8 mb-8 lg:mb-0">
          <form onSubmit={handleNext}>
            {step === 1 && (
              <div className="bg-white border border-neutral-200 p-6 sm:p-8">
                <h2 className="text-xl font-bold text-neutral-900 mb-6 uppercase tracking-wider flex items-center border-b border-neutral-100 pb-4">
                  <span className="w-8">1.</span> Dados Pessoais
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">Nome Completo</label>
                    <input required type="text" className="w-full border border-neutral-300 px-4 py-3 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-900 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">CPF</label>
                    <input required type="text" className="w-full border border-neutral-300 px-4 py-3 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-900 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">Telefone</label>
                    <input required type="text" className="w-full border border-neutral-300 px-4 py-3 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-900 transition-colors" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">E-mail</label>
                    <input required type="email" className="w-full border border-neutral-300 px-4 py-3 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-900 transition-colors" />
                  </div>
                </div>
                <div className="mt-8 flex justify-end">
                   <button type="submit" className="bg-primary text-white px-8 py-3 font-bold uppercase tracking-wider text-sm hover:bg-primary-dark transition-colors rounded-sm">
                     Ir para Entrega
                   </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="bg-white border border-neutral-200 p-6 sm:p-8">
                <h2 className="text-xl font-bold text-neutral-900 mb-6 uppercase tracking-wider flex items-center border-b border-neutral-100 pb-4">
                  <span className="w-8">2.</span> Endereço de Entrega
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">CEP</label>
                    <input required type="text" className="w-full border border-neutral-300 px-4 py-3 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-900 transition-colors" />
                  </div>
                  <div className="hidden md:block"></div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">Rua / Avenida</label>
                    <input required type="text" className="w-full border border-neutral-300 px-4 py-3 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-900 transition-colors" />
                  </div>
                  <div>
                     <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">Número</label>
                     <input required type="text" className="w-full border border-neutral-300 px-4 py-3 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-900 transition-colors" />
                  </div>
                  <div>
                     <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">Complemento</label>
                     <input type="text" className="w-full border border-neutral-300 px-4 py-3 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-900 transition-colors" />
                  </div>
                  <div>
                     <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">Bairro</label>
                     <input required type="text" className="w-full border border-neutral-300 px-4 py-3 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-900 transition-colors" />
                  </div>
                  <div>
                     <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">Cidade</label>
                     <input required type="text" className="w-full border border-neutral-300 px-4 py-3 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-900 transition-colors" />
                  </div>
                </div>

                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900 mt-8 mb-4">Opções de Frete</h3>
                <div className="space-y-3">
                   <label className="flex items-center p-4 border border-neutral-200 cursor-pointer hover:border-neutral-400 transition-colors">
                      <input type="radio" name="shipping" className="text-neutral-900 focus:ring-neutral-900" defaultChecked />
                      <div className="ml-4 flex-1 flex justify-between">
                         <div>
                            <span className="block text-sm font-bold text-neutral-900">Correios - PAC</span>
                            <span className="block text-xs text-neutral-500 mt-1">Até 7 dias úteis</span>
                         </div>
                         <span className="text-sm font-medium">R$ 25,90</span>
                      </div>
                   </label>
                   <label className="flex items-center p-4 border border-neutral-200 cursor-pointer hover:border-neutral-400 transition-colors">
                      <input type="radio" name="shipping" className="text-neutral-900 focus:ring-neutral-900" />
                      <div className="ml-4 flex-1 flex justify-between">
                         <div>
                            <span className="block text-sm font-bold text-neutral-900">Correios - SEDEX</span>
                            <span className="block text-xs text-neutral-500 mt-1">Até 3 dias úteis</span>
                         </div>
                         <span className="text-sm font-medium">R$ 45,90</span>
                      </div>
                   </label>
                </div>

                <div className="mt-8 flex justify-between">
                   <button type="button" onClick={() => setStep(1)} className="text-secondary/70 px-6 py-3 font-bold uppercase tracking-wider text-sm hover:text-secondary transition-colors">
                     Voltar
                   </button>
                   <button type="submit" className="bg-primary text-white px-8 py-3 font-bold uppercase tracking-wider text-sm hover:bg-primary-dark transition-colors rounded-sm">
                     Ir para Pagamento
                   </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="bg-white border border-neutral-200 p-6 sm:p-8">
                <h2 className="text-xl font-bold text-neutral-900 mb-6 uppercase tracking-wider flex items-center border-b border-neutral-100 pb-4">
                  <span className="w-8">3.</span> Pagamento
                </h2>
                
                <div className="space-y-4 mb-8">
                   <label className="flex items-center p-4 border border-neutral-900 bg-neutral-50 cursor-pointer">
                      <input type="radio" name="payment" className="text-neutral-900 focus:ring-neutral-900" defaultChecked />
                      <CreditCard className="w-5 h-5 ml-4 text-neutral-900" />
                      <span className="ml-3 font-bold text-sm uppercase tracking-wider text-neutral-900">Cartão de Crédito</span>
                   </label>
                   {/* Only showing Credit Card form for mock purposes */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-8 pr-4">
                     <div className="md:col-span-2">
                       <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">Número do Cartão</label>
                       <input required type="text" className="w-full border border-neutral-300 px-4 py-3 bg-white focus:outline-none focus:border-neutral-900 transition-colors" />
                     </div>
                     <div className="md:col-span-2">
                       <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">Nome do Titular</label>
                       <input required type="text" className="w-full border border-neutral-300 px-4 py-3 bg-white focus:outline-none focus:border-neutral-900 transition-colors" />
                     </div>
                     <div>
                       <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">Validade (MM/AA)</label>
                       <input required type="text" className="w-full border border-neutral-300 px-4 py-3 bg-white focus:outline-none focus:border-neutral-900 transition-colors" />
                     </div>
                     <div>
                       <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">CVV</label>
                       <input required type="text" className="w-full border border-neutral-300 px-4 py-3 bg-white focus:outline-none focus:border-neutral-900 transition-colors" />
                     </div>
                     <div className="md:col-span-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">Parcelamento</label>
                        <select className="w-full border border-neutral-300 px-4 py-3 bg-white focus:outline-none focus:border-neutral-900 transition-colors text-sm">
                           <option>1x de R$ {(cartTotal + 25.90).toFixed(2).replace('.', ',')} sem juros</option>
                           <option>2x de R$ {((cartTotal + 25.90)/2).toFixed(2).replace('.', ',')} sem juros</option>
                           <option>3x de R$ {((cartTotal + 25.90)/3).toFixed(2).replace('.', ',')} sem juros</option>
                        </select>
                     </div>
                   </div>

                   <label className="flex items-center p-4 border border-neutral-200 cursor-pointer hover:border-neutral-400">
                      <input type="radio" name="payment" className="text-neutral-900 focus:ring-neutral-900" />
                      <div className="ml-4 font-bold text-sm uppercase tracking-wider text-neutral-500">PIX (5% de Desconto)</div>
                   </label>
                </div>

                <div className="mt-8 flex justify-between flex-col-reverse sm:flex-row gap-4">
                   <button type="button" onClick={() => setStep(2)} className="text-secondary/70 px-6 py-3 font-bold uppercase tracking-wider text-sm hover:text-secondary transition-colors text-center">
                     Voltar
                   </button>
                   <button type="submit" className="bg-primary text-white px-8 py-4 font-bold uppercase tracking-wider text-sm hover:bg-primary-dark transition-colors shadow-lg rounded-sm">
                     Finalizar Pedido
                   </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Order Summary Sdiebar */}
        <div className="lg:col-span-4">
          <div className="bg-neutral-50 p-6 border border-neutral-200">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900 mb-4 pb-4 border-b border-neutral-200">Resumo da Compra</h3>
            
            <div className="max-h-60 overflow-y-auto pr-2 mb-4 space-y-4">
               {cart.map(item => (
                  <div key={`${item.product.id}-${item.size}-${item.color}`} className="flex gap-4">
                     <img src={item.product.imagens[0]} alt="" className="w-16 h-20 object-cover bg-neutral-200" />
                     <div className="flex-1">
                        <p className="text-xs font-bold text-neutral-900 line-clamp-1">{item.product.nome}</p>
                        <p className="text-[10px] text-neutral-500 mt-1 uppercase tracking-wider">Qtd: {item.quantity} | {item.size}</p>
                        <p className="text-xs font-bold text-neutral-900 mt-2">R$ {((item.product.precoPromocional || item.product.preco) * item.quantity).toFixed(2).replace('.', ',')}</p>
                     </div>
                  </div>
               ))}
            </div>

            <dl className="space-y-3 text-sm text-neutral-600 border-t border-neutral-200 pt-4 mb-4">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd className="font-medium text-neutral-900">R$ {cartTotal.toFixed(2).replace('.', ',')}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Frete</dt>
                <dd className="font-medium text-neutral-900">
                   {step >= 2 ? 'R$ 25,90' : 'A calcular'} 
                </dd>
              </div>
            </dl>

            <div className="flex items-center justify-between font-bold text-lg text-neutral-900 border-t border-neutral-200 pt-4">
              <span>Total</span>
              <span>R$ {(cartTotal + (step >= 2 ? 25.9 : 0)).toFixed(2).replace('.', ',')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
