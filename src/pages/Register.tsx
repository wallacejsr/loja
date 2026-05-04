import React, { useState } from 'react';
import { User, Users, List, MapPin, Mail, Lock, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Register() {
  const [cadastroTipo, setCadastroTipo] = useState<'F'|'J'>('F');
  const navigate = useNavigate();

  return (
    <div className="bg-[#f7f7f7] min-h-screen py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="mb-6 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
          <h1 className="text-2xl font-bold uppercase tracking-wider text-secondary">Identificação</h1>
          <p className="text-secondary/70 text-sm">Faça o seu login ou crie uma conta caso ainda não possua cadastro</p>
        </div>

        <form className="space-y-6" onSubmit={e => { e.preventDefault(); navigate('/account'); }}>
          
          {/* Dados para acesso */}
          <div className="bg-white p-6 rounded-sm shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
            <div className="flex items-center gap-2 mb-6 border-b border-neutral-100 pb-3">
              <User className="w-5 h-5 text-secondary" />
              <h2 className="font-bold uppercase tracking-wider text-secondary text-sm">Dados para Acesso</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-4 mb-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-secondary mb-1.5">
                  <Mail className="w-4 h-4" /> E-mail
                </label>
                <input type="email" placeholder="Digite o seu email" className="w-full border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm placeholder:text-neutral-400" />
              </div>
              <div>
                <label className="block text-sm font-bold text-secondary mb-1.5 mt-0.5">Confirmar e-mail</label>
                <input type="email" className="w-full border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-secondary mb-1.5">
                  <Lock className="w-4 h-4" /> Crie uma senha
                </label>
                <input type="password" className="w-full border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm" />
              </div>
              <div>
                <label className="block text-sm font-bold text-secondary mb-1.5 mt-0.5">Confirmar senha</label>
                <input type="password" className="w-full border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm" />
              </div>
            </div>
          </div>

          {/* Tipo de Cadastro */}
          <div className="bg-white p-6 rounded-sm shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
            <div className="flex items-center gap-2 mb-6 border-b border-neutral-100 pb-3">
              <Users className="w-5 h-5 text-secondary" />
              <h2 className="font-bold uppercase tracking-wider text-secondary text-sm">Tipo de Cadastro</h2>
            </div>
            
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-secondary">
                <input 
                  type="radio" 
                  name="tipo" 
                  checked={cadastroTipo === 'F'} 
                  onChange={() => setCadastroTipo('F')}
                  className="accent-[#ba884b] w-4 h-4" 
                />
                Pessoa Física
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-secondary">
                <input 
                  type="radio" 
                  name="tipo" 
                  checked={cadastroTipo === 'J'} 
                  onChange={() => setCadastroTipo('J')}
                  className="accent-[#ba884b] w-4 h-4" 
                />
                Pessoa Jurídica
              </label>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 items-start">
            {/* Dados Pessoais */}
            <div className="bg-white p-6 rounded-sm shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
              <div className="flex items-center gap-2 mb-6 border-b border-neutral-100 pb-3">
                <List className="w-5 h-5 text-secondary" />
                <h2 className="font-bold uppercase tracking-wider text-secondary text-sm">Dados Pessoais</h2>
              </div>

              <div className="space-y-4">
                <OptionRow label="Nome completo">
                  <input type="text" className="w-full border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm" />
                </OptionRow>

                {cadastroTipo === 'F' ? (
                  <>
                    <OptionRow label="CPF">
                      <input type="text" className="w-[140px] border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm" />
                    </OptionRow>
                    <OptionRow label="Celular">
                      <input type="text" className="w-[120px] border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm" />
                    </OptionRow>
                    <OptionRow label="Telefone fixo">
                      <input type="text" className="w-[120px] border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm" />
                    </OptionRow>
                    <OptionRow label="Sexo">
                      <select className="w-[140px] border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm bg-white">
                        <option>- Selecione -</option>
                        <option>Feminino</option>
                        <option>Masculino</option>
                      </select>
                    </OptionRow>
                    <OptionRow label="Data de nascimento">
                      <input type="text" className="w-[100px] border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm" />
                    </OptionRow>
                  </>
                ) : (
                  <>
                    <OptionRow label="CNPJ">
                      <input type="text" className="w-[140px] border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm" />
                    </OptionRow>
                    <OptionRow label="Razão Social">
                      <input type="text" className="w-full border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm" />
                    </OptionRow>
                    <OptionRow label="Inscrição Estadual">
                      <input type="text" className="w-[160px] border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm" />
                    </OptionRow>
                    <OptionRow label="Celular">
                      <input type="text" className="w-[120px] border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm" />
                    </OptionRow>
                    <OptionRow label="Telefone fixo">
                      <input type="text" className="w-[120px] border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm" />
                    </OptionRow>
                  </>
                )}
              </div>
            </div>

            {/* Endereço */}
            <div className="bg-white p-6 rounded-sm shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
              <div className="flex items-center gap-2 mb-6 border-b border-neutral-100 pb-3">
                <MapPin className="w-5 h-5 text-secondary" />
                <h2 className="font-bold uppercase tracking-wider text-secondary text-sm">Endereço</h2>
              </div>

              <div className="space-y-4">
                <OptionRow label="CEP">
                  <div className="flex items-center gap-3">
                    <input type="text" className="w-[100px] border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm" />
                    <a href="https://buscacepinter.correios.com.br/app/endereco/index.php" target="_blank" rel="noreferrer" className="text-secondary font-bold text-xs flex items-center hover:text-primary">
                      <HelpCircle className="w-3.5 h-3.5 mr-1" /> Não sei meu cep
                    </a>
                  </div>
                </OptionRow>

                <OptionRow label="Endereço">
                  <input type="text" className="w-[180px] sm:w-[220px] border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm" />
                </OptionRow>

                <OptionRow label="Número">
                  <input type="text" className="w-[60px] border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm" />
                </OptionRow>

                <OptionRow label="Complemento">
                  <input type="text" className="w-[180px] sm:w-[220px] border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm" />
                </OptionRow>

                <OptionRow label="Referência">
                  <input type="text" className="w-[180px] sm:w-[220px] border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm" />
                </OptionRow>

                <OptionRow label="Bairro">
                  <input type="text" className="w-[150px] border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm" />
                </OptionRow>

                <OptionRow label="Cidade">
                  <input type="text" className="w-[150px] border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm" />
                </OptionRow>

                <OptionRow label="Estado">
                  <select className="w-[150px] border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm bg-white">
                    <option>Selecione</option>
                    <option value="AC">Acre</option>
                    <option value="AL">Alagoas</option>
                    <option value="AP">Amapá</option>
                    <option value="AM">Amazonas</option>
                    <option value="BA">Bahia</option>
                    <option value="CE">Ceará</option>
                    <option value="DF">Distrito Federal</option>
                    <option value="ES">Espírito Santo</option>
                    <option value="GO">Goiás</option>
                    <option value="MA">Maranhão</option>
                    <option value="MT">Mato Grosso</option>
                    <option value="MS">Mato Grosso do Sul</option>
                    <option value="MG">Minas Gerais</option>
                    <option value="PA">Pará</option>
                    <option value="PB">Paraíba</option>
                    <option value="PR">Paraná</option>
                    <option value="PE">Pernambuco</option>
                    <option value="PI">Piauí</option>
                    <option value="RJ">Rio de Janeiro</option>
                    <option value="RN">Rio Grande do Norte</option>
                    <option value="RS">Rio Grande do Sul</option>
                    <option value="RO">Rondônia</option>
                    <option value="RR">Roraima</option>
                    <option value="SC">Santa Catarina</option>
                    <option value="SP">São Paulo</option>
                    <option value="SE">Sergipe</option>
                    <option value="TO">Tocantins</option>
                  </select>
                </OptionRow>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => navigate(-1)} className="bg-[#f0f0f0] text-secondary px-6 py-2.5 text-sm hover:bg-neutral-200 transition-colors rounded-sm">
              Cancelar
            </button>
            <button type="submit" className="bg-[#c29656] text-white px-6 py-2.5 font-bold text-sm hover:bg-[#a67c42] transition-colors rounded-sm">
              Criar Conta
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

function OptionRow({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
      <label className="sm:w-[130px] sm:text-right text-[13px] font-bold text-secondary shrink-0">
        {label}
      </label>
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
