import React, { useState } from 'react';
import { User, Package, MapPin, LogOut, X, Loader2, Star, Trophy } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useLoyalty } from '../hooks/useLoyalty';
import { Link } from 'react-router-dom';

export function Account() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'addresses' | 'data'>('orders');
  const { points } = useLoyalty();
  
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isEditDataModalOpen, setIsEditDataModalOpen] = useState(false);
  const [cep, setCep] = useState('');
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [addressData, setAddressData] = useState({
    nome: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    localidade: '',
    uf: '',
  });

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    
    // Format to XXXXX-XXX
    const formattedCep = value.replace(/^(\d{5})(\d)/, '$1-$2');
    setCep(formattedCep);

    if (value.length === 8) {
      setIsSearchingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${value}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
          setAddressData(prev => ({
            ...prev,
            logradouro: data.logradouro || '',
            bairro: data.bairro || '',
            localidade: data.localidade || '',
            uf: data.uf || ''
          }));
        }
      } catch (error) {
        console.error("Erro ao buscar CEP", error);
      } finally {
        setIsSearchingCep(false);
      }
    }
  };

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would save the address
    setIsAddressModalOpen(false);
    // Reset form
    setCep('');
    setAddressData({ nome: '', logradouro: '', numero: '', complemento: '', bairro: '', localidade: '', uf: '' });
  };

  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto px-4 py-20">
        <h1 className="text-3xl font-serif font-bold text-secondary mb-8 text-center uppercase tracking-wider border-b-2 border-primary pb-4">Minha Conta</h1>
        
        <div className="bg-neutral-50 p-8 border border-neutral-200">
           <h2 className="text-lg font-bold text-secondary mb-6 uppercase tracking-wider">Já sou cliente</h2>
           <form onSubmit={(e) => { e.preventDefault(); setIsLoggedIn(true); }} className="space-y-4">
              <div>
                 <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">E-mail</label>
                 <input required type="email" defaultValue="cliente@exemplo.com" className="w-full border border-neutral-300 px-4 py-3 bg-white focus:outline-none focus:border-primary transition-colors rounded-sm" />
              </div>
              <div>
                 <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">Senha</label>
                 <input required type="password" defaultValue="123456" className="w-full border border-neutral-300 px-4 py-3 bg-white focus:outline-none focus:border-primary transition-colors rounded-sm" />
              </div>
              <div className="flex justify-between items-center text-sm pt-2">
                 <a href="#" className="text-secondary/70 hover:text-primary transition-colors">Esqueceu a senha?</a>
              </div>
              <button type="submit" className="w-full bg-primary text-white px-8 py-3 font-bold uppercase tracking-wider text-sm hover:bg-primary-dark transition-colors rounded-sm mt-4">
                 Entrar
              </button>
           </form>

           <div className="my-8 text-center border-t border-neutral-200 relative">
              <span className="bg-neutral-50 px-4 text-xs font-bold uppercase text-secondary/50 absolute -top-2 left-1/2 -translate-x-1/2">ou</span>
           </div>

           <h2 className="text-lg font-bold text-secondary mb-4 uppercase tracking-wider">Ainda não tem conta?</h2>
           <p className="text-sm text-secondary/70 mb-6">Cadastre-se para comprar mais rápido, acompanhar seus pedidos e criar sua lista de desejos.</p>
           <Link to="/register" className="block text-center w-full bg-secondary text-white px-8 py-3 font-bold uppercase tracking-wider text-sm hover:bg-primary transition-colors rounded-sm">
              Criar Conta
           </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
      <div className="flex flex-col md:flex-row items-start gap-8">
        
        {/* Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0 bg-neutral-50 border border-neutral-200">
           <div className="p-6 border-b border-neutral-200">
              <p className="text-sm text-secondary/70">Olá,</p>
              <h2 className="text-xl font-serif font-bold text-secondary truncate">Cliente Teste</h2>
           </div>
           <nav className="p-4 space-y-2">
              <button 
                onClick={() => setActiveTab('orders')}
                className={`w-full flex items-center px-4 py-3 text-sm font-bold uppercase tracking-wider transition-colors rounded-sm ${activeTab === 'orders' ? 'bg-primary text-white' : 'text-secondary hover:bg-neutral-200'}`}
              >
                <Package className="w-4 h-4 mr-3" /> Meus Pedidos
              </button>
              <button 
                onClick={() => setActiveTab('addresses')}
                className={`w-full flex items-center px-4 py-3 text-sm font-bold uppercase tracking-wider transition-colors rounded-sm ${activeTab === 'addresses' ? 'bg-primary text-white' : 'text-secondary hover:bg-neutral-200'}`}
              >
                <MapPin className="w-4 h-4 mr-3" /> Meus Endereços
              </button>
              <button 
                onClick={() => setActiveTab('data')}
                className={`w-full flex items-center px-4 py-3 text-sm font-bold uppercase tracking-wider transition-colors rounded-sm ${activeTab === 'data' ? 'bg-primary text-white' : 'text-secondary hover:bg-neutral-200'}`}
              >
                <User className="w-4 h-4 mr-3" /> Meus Dados
              </button>
              <button 
                onClick={() => setIsLoggedIn(false)}
                className="w-full flex items-center px-4 py-3 text-sm font-bold uppercase tracking-wider text-red-500 hover:bg-red-50 transition-colors rounded-sm mt-4 border border-transparent hover:border-red-100"
              >
                <LogOut className="w-4 h-4 mr-3" /> Sair
              </button>
           </nav>
        </div>

        {/* Content */}
        <div className="flex-1 w-full space-y-8">
           {/* Loyalty Summary Card */}
           <div className="bg-gradient-to-r from-secondary to-neutral-800 rounded-3xl p-8 text-white flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl shadow-secondary/5">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/10">
                  <Star className="w-8 h-8 text-primary fill-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-serif font-bold">Clube de Lealdade</h3>
                  <p className="text-white/60 text-sm">Você tem <span className="text-white font-bold">{points}</span> pontos acumulados.</p>
                </div>
              </div>
              <Link 
                to="/sorteios" 
                className="bg-primary text-white px-8 py-3 rounded-full text-[11px] font-bold uppercase tracking-widest hover:bg-primary-dark transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
              >
                <Trophy className="w-4 h-4" />
                Ver Sorteios
              </Link>
           </div>

           {activeTab === 'orders' && (
             <div>
                <h3 className="text-2xl font-serif font-bold text-secondary mb-6 border-b border-neutral-200 pb-4">Meus Pedidos</h3>
                <div className="bg-white border border-neutral-200 p-6 rounded-sm text-center py-16">
                   <Package className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                   <h4 className="text-lg font-bold text-secondary mb-2">Você ainda não tem pedidos</h4>
                   <p className="text-secondary/70 mb-6">Que tal conhecer nossas novidades?</p>
                   <Link to="/catalog" className="inline-block bg-primary text-white px-8 py-3 font-bold uppercase tracking-wider text-sm hover:bg-primary-dark transition-colors rounded-sm">
                     Ver Produtos
                   </Link>
                </div>
             </div>
           )}

           {activeTab === 'addresses' && (
             <div>
                <h3 className="text-2xl font-serif font-bold text-secondary mb-6 border-b border-neutral-200 pb-4">Meus Endereços</h3>
                <div className="grid sm:grid-cols-2 gap-6">
                   <div className="bg-neutral-50 border border-neutral-200 p-6 rounded-sm relative">
                      <span className="absolute top-4 right-4 bg-primary text-white text-[10px] font-bold px-2 py-1 uppercase tracking-wider rounded-sm">Principal</span>
                      <h4 className="font-bold text-secondary uppercase tracking-wider mb-2">Casa</h4>
                      <p className="text-sm text-secondary/70 mb-1">Rua Exemplo, 123 - Apto 4</p>
                      <p className="text-sm text-secondary/70 mb-1">Bairro Central - São Paulo, SP</p>
                      <p className="text-sm text-secondary/70 mb-4">CEP: 01234-567</p>
                      <div className="flex gap-4">
                         <button className="text-xs font-bold uppercase text-primary hover:text-primary-dark">Editar</button>
                         <button className="text-xs font-bold uppercase text-red-500 hover:text-red-700">Remover</button>
                      </div>
                   </div>
                   <button
                      onClick={() => setIsAddressModalOpen(true)}
                      className="border-2 border-dashed border-neutral-300 flex flex-col items-center justify-center p-6 rounded-sm text-secondary hover:border-primary hover:text-primary transition-colors min-h-[200px]"
                   >
                      <span className="text-4xl font-light mb-2">+</span>
                      <span className="font-bold uppercase tracking-wider text-sm">Adicionar Endereço</span>
                   </button>
                </div>
             </div>
           )}

           {activeTab === 'data' && (
             <div className="space-y-8">
                <div>
                   <h3 className="text-2xl font-serif font-bold text-secondary mb-6 border-b border-neutral-200 pb-4">Meus Dados</h3>
                   <form className="bg-white border border-neutral-200 p-6 md:p-8 rounded-sm space-y-6">
                      <div className="grid sm:grid-cols-2 gap-6">
                        <div>
                           <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">Nome Completo</label>
                           <input type="text" defaultValue="Cliente Teste" className="w-full border border-neutral-300 px-4 py-3 bg-neutral-100 focus:outline-none rounded-sm text-secondary/70" readOnly />
                        </div>
                        <div>
                           <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">CPF</label>
                           <input type="text" defaultValue="123.456.789-00" className="w-full border border-neutral-300 px-4 py-3 bg-neutral-100 focus:outline-none rounded-sm text-secondary/70" readOnly title="O CPF não pode ser alterado" />
                        </div>
                        <div>
                           <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">E-mail</label>
                           <input type="email" defaultValue="cliente@exemplo.com" className="w-full border border-neutral-300 px-4 py-3 bg-neutral-100 focus:outline-none rounded-sm text-secondary/70" readOnly title="Para alterar o e-mail, entre em contato com o suporte" />
                        </div>
                        <div>
                           <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">Celular</label>
                           <input type="text" defaultValue="(11) 99999-9999" className="w-full border border-neutral-300 px-4 py-3 bg-neutral-100 focus:outline-none rounded-sm text-secondary/70" readOnly />
                        </div>
                        <div>
                           <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">Data de Nascimento</label>
                           <input type="date" defaultValue="1990-01-01" className="w-full border border-neutral-300 px-4 py-3 bg-neutral-100 focus:outline-none rounded-sm text-secondary/70" readOnly />
                        </div>
                        <div>
                           <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">Gênero</label>
                           <select defaultValue="feminino" disabled className="w-full border border-neutral-300 px-4 py-3 bg-neutral-100 focus:outline-none rounded-sm text-secondary/70 appearance-none pointer-events-none cursor-not-allowed">
                              <option value="feminino">Feminino</option>
                              <option value="masculino">Masculino</option>
                              <option value="outro">Outro / Prefiro não informar</option>
                           </select>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-neutral-100 mt-6 flex justify-between items-center">
                         <button 
                            type="button" 
                            onClick={() => setIsPasswordModalOpen(true)}
                            className="text-secondary font-bold uppercase tracking-wider text-sm hover:text-primary transition-colors"
                         >
                            Alterar Senha
                         </button>
                         <div className="flex gap-4">
                            <button 
                               type="button" 
                               onClick={() => setIsEditDataModalOpen(true)}
                               className="border border-secondary text-secondary hover:bg-neutral-100 px-8 py-3 font-bold uppercase tracking-wider text-sm transition-colors rounded-sm"
                            >
                               Editar
                            </button>
                            <button type="button" className="bg-secondary text-white px-8 py-3 font-bold uppercase tracking-wider text-sm hover:bg-primary transition-colors rounded-sm">
                               Salvar Dados
                            </button>
                         </div>
                      </div>
                   </form>
                </div>
             </div>
           )}
        </div>
      </div>

      {/* Address Modal */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white max-w-2xl w-full rounded-sm shadow-xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setIsAddressModalOpen(false)}
              className="absolute top-4 right-4 text-secondary/50 hover:text-secondary transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-2xl font-serif font-bold text-secondary mb-6 border-b border-neutral-200 pb-4">
              Adicionar Endereço
            </h3>
            
            <form onSubmit={handleAddressSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">Nome do Endereço (ex: Casa, Trabalho)</label>
                <input 
                  type="text" 
                  required
                  value={addressData.nome}
                  onChange={(e) => setAddressData({...addressData, nome: e.target.value})}
                  className="w-full border border-neutral-300 px-4 py-3 bg-white focus:outline-none focus:border-primary transition-colors rounded-sm" 
                  placeholder="Ex: Casa"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">CEP</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      required
                      value={cep}
                      onChange={handleCepChange}
                      className="w-full border border-neutral-300 px-4 py-3 bg-white focus:outline-none focus:border-primary transition-colors rounded-sm" 
                      placeholder="00000-000"
                      maxLength={9}
                    />
                    {isSearchingCep && (
                      <Loader2 className="absolute right-3 top-3.5 w-5 h-5 animate-spin text-primary" />
                    )}
                  </div>
                </div>
                <div className="col-span-2 sm:col-span-1"></div>
                
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">Logradouro</label>
                  <input 
                    type="text" 
                    required
                    value={addressData.logradouro}
                    readOnly
                    className="w-full border border-neutral-300 px-4 py-3 bg-neutral-100 focus:outline-none rounded-sm text-secondary cursor-not-allowed" 
                    placeholder="Rua, Avenida, etc."
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">Número</label>
                  <input 
                    type="text" 
                    required
                    disabled={!cep}
                    value={addressData.numero}
                    onChange={(e) => setAddressData({...addressData, numero: e.target.value})}
                    className="w-full border border-neutral-300 px-4 py-3 bg-white focus:outline-none focus:border-primary transition-colors rounded-sm disabled:bg-neutral-100 disabled:cursor-not-allowed" 
                    placeholder="Ex: 123"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">Complemento</label>
                  <input 
                    type="text" 
                    disabled={!cep}
                    value={addressData.complemento}
                    onChange={(e) => setAddressData({...addressData, complemento: e.target.value})}
                    className="w-full border border-neutral-300 px-4 py-3 bg-white focus:outline-none focus:border-primary transition-colors rounded-sm disabled:bg-neutral-100 disabled:cursor-not-allowed" 
                    placeholder="Ex: Apto 4"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">Bairro</label>
                  <input 
                    type="text" 
                    required
                    value={addressData.bairro}
                    readOnly
                    className="w-full border border-neutral-300 px-4 py-3 bg-neutral-100 focus:outline-none rounded-sm text-secondary cursor-not-allowed" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">Cidade</label>
                  <input 
                    type="text" 
                    required
                    value={addressData.localidade}
                    readOnly
                    className="w-full border border-neutral-300 px-4 py-3 bg-neutral-100 focus:outline-none rounded-sm text-secondary cursor-not-allowed" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">Estado</label>
                  <input 
                    type="text" 
                    required
                    value={addressData.uf}
                    readOnly
                    className="w-full border border-neutral-300 px-4 py-3 bg-neutral-100 focus:outline-none rounded-sm text-secondary cursor-not-allowed" 
                  />
                </div>
              </div>

              <div className="pt-4 mt-6 flex justify-end gap-4">
                <button 
                  type="button" 
                  onClick={() => setIsAddressModalOpen(false)}
                  className="px-6 py-3 font-bold uppercase tracking-wider text-sm text-secondary hover:text-secondary/70 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="bg-secondary text-white px-8 py-3 font-bold uppercase tracking-wider text-sm hover:bg-primary transition-colors rounded-sm"
                >
                  Salvar Endereço
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Data Modal */}
      {isEditDataModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white max-w-2xl w-full rounded-sm shadow-xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setIsEditDataModalOpen(false)}
              className="absolute top-4 right-4 text-secondary/50 hover:text-secondary transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-2xl font-serif font-bold text-secondary mb-6 border-b border-neutral-200 pb-4">
              Editar Meus Dados
            </h3>
            
            <form onSubmit={(e) => { e.preventDefault(); setIsEditDataModalOpen(false); }} className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">Nome Completo</label>
                   <input type="text" defaultValue="Cliente Teste" className="w-full border border-neutral-300 px-4 py-3 bg-white focus:outline-none focus:border-primary transition-colors rounded-sm" />
                </div>
                <div>
                   <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">Celular</label>
                   <input type="text" defaultValue="(11) 99999-9999" className="w-full border border-neutral-300 px-4 py-3 bg-white focus:outline-none focus:border-primary transition-colors rounded-sm" />
                </div>
                <div>
                   <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">Data de Nascimento</label>
                   <input type="date" defaultValue="1990-01-01" className="w-full border border-neutral-300 px-4 py-3 bg-white focus:outline-none focus:border-primary transition-colors rounded-sm" />
                </div>
                <div>
                   <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">Gênero</label>
                   <select defaultValue="feminino" className="w-full border border-neutral-300 px-4 py-3 bg-white focus:outline-none focus:border-primary transition-colors rounded-sm appearance-none">
                      <option value="feminino">Feminino</option>
                      <option value="masculino">Masculino</option>
                      <option value="outro">Outro / Prefiro não informar</option>
                   </select>
                </div>
              </div>

              <div className="pt-4 mt-6 flex justify-end gap-4">
                <button 
                  type="button" 
                  onClick={() => setIsEditDataModalOpen(false)}
                  className="px-6 py-3 font-bold uppercase tracking-wider text-sm text-secondary hover:text-secondary/70 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="bg-secondary text-white px-8 py-3 font-bold uppercase tracking-wider text-sm hover:bg-primary transition-colors rounded-sm"
                >
                  Salvar Edição
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white max-w-lg w-full rounded-sm shadow-xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setIsPasswordModalOpen(false)}
              className="absolute top-4 right-4 text-secondary/50 hover:text-secondary transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-2xl font-serif font-bold text-secondary mb-6 border-b border-neutral-200 pb-4">
              Alterar Senha
            </h3>
            
            <form onSubmit={(e) => { e.preventDefault(); setIsPasswordModalOpen(false); }} className="space-y-4">
              <div>
                 <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">Senha Atual</label>
                 <input type="password" placeholder="Sua senha atual" required className="w-full border border-neutral-300 px-4 py-3 bg-white focus:outline-none focus:border-primary transition-colors rounded-sm" />
              </div>
              <div>
                 <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">Nova Senha</label>
                 <input type="password" placeholder="No mínimo 8 caracteres" required minLength={8} className="w-full border border-neutral-300 px-4 py-3 bg-white focus:outline-none focus:border-primary transition-colors rounded-sm" />
              </div>
              <div>
                 <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">Confirmar Nova Senha</label>
                 <input type="password" placeholder="Repita a nova senha" required minLength={8} className="w-full border border-neutral-300 px-4 py-3 bg-white focus:outline-none focus:border-primary transition-colors rounded-sm" />
              </div>

              <div className="pt-4 mt-6 flex justify-end gap-4">
                <button 
                  type="button" 
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-6 py-3 font-bold uppercase tracking-wider text-sm text-secondary hover:text-secondary/70 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="bg-secondary text-white px-8 py-3 font-bold uppercase tracking-wider text-sm hover:bg-primary transition-colors rounded-sm"
                >
                  Atualizar Senha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
