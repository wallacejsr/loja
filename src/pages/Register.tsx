import React, { useState } from 'react';
import { User, Users, List, MapPin, Mail, Lock, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStorefront } from '../hooks/useStorefront';

export function Register() {
  const [registrationType, setRegistrationType] = useState<'F' | 'J'>('F');
  const navigate = useNavigate();
  const { t } = useStorefront();

  return (
    <div className="bg-[#f7f7f7] min-h-screen py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
          <h1 className="text-2xl font-bold uppercase tracking-wider text-secondary">{t('identification')}</h1>
          <p className="text-secondary/70 text-sm">{t('identificationSubtitle')}</p>
        </div>

        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); navigate('/account'); }}>
          <section className="bg-white p-6 rounded-sm shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
            <SectionTitle icon={<User className="w-5 h-5 text-secondary" />} title={t('accessData')} />

            <div className="grid md:grid-cols-2 gap-x-8 gap-y-4 mb-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-secondary mb-1.5">
                  <Mail className="w-4 h-4" /> {t('contactEmail')}
                </label>
                <input type="email" placeholder={t('enterYourEmail')} className="w-full border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm placeholder:text-neutral-400" />
              </div>
              <div>
                <label className="block text-sm font-bold text-secondary mb-1.5 mt-0.5">{t('confirmEmail')}</label>
                <input type="email" className="w-full border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-secondary mb-1.5">
                  <Lock className="w-4 h-4" /> {t('createPassword')}
                </label>
                <input type="password" className="w-full border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm" />
              </div>
              <div>
                <label className="block text-sm font-bold text-secondary mb-1.5 mt-0.5">{t('confirmPassword')}</label>
                <input type="password" className="w-full border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm" />
              </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-sm shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
            <SectionTitle icon={<Users className="w-5 h-5 text-secondary" />} title={t('registrationType')} />
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-secondary">
                <input type="radio" name="tipo" checked={registrationType === 'F'} onChange={() => setRegistrationType('F')} className="accent-[#ba884b] w-4 h-4" />
                {t('individualPerson')}
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-secondary">
                <input type="radio" name="tipo" checked={registrationType === 'J'} onChange={() => setRegistrationType('J')} className="accent-[#ba884b] w-4 h-4" />
                {t('legalEntity')}
              </label>
            </div>
          </section>

          <div className="grid md:grid-cols-2 gap-6 items-start">
            <section className="bg-white p-6 rounded-sm shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
              <SectionTitle icon={<List className="w-5 h-5 text-secondary" />} title={t('personalData')} />

              <div className="space-y-4">
                <OptionRow label={t('fullName')}>
                  <input type="text" className="w-full border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm" />
                </OptionRow>

                {registrationType === 'F' ? (
                  <>
                    <OptionRow label={t('cpf')}><input type="text" className="w-[140px] border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm" /></OptionRow>
                    <OptionRow label={t('cellphone')}><input type="text" className="w-[120px] border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm" /></OptionRow>
                    <OptionRow label={t('landline')}><input type="text" className="w-[120px] border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm" /></OptionRow>
                    <OptionRow label={t('gender')}>
                      <select className="w-[140px] border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm bg-white">
                        <option>{t('selectOption')}</option>
                        <option>{t('female')}</option>
                        <option>{t('male')}</option>
                      </select>
                    </OptionRow>
                    <OptionRow label={t('birthDate')}><input type="text" className="w-[100px] border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm" /></OptionRow>
                  </>
                ) : (
                  <>
                    <OptionRow label="CNPJ"><input type="text" className="w-[140px] border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm" /></OptionRow>
                    <OptionRow label={t('corporateName')}><input type="text" className="w-full border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm" /></OptionRow>
                    <OptionRow label={t('stateRegistration')}><input type="text" className="w-[160px] border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm" /></OptionRow>
                    <OptionRow label={t('cellphone')}><input type="text" className="w-[120px] border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm" /></OptionRow>
                    <OptionRow label={t('landline')}><input type="text" className="w-[120px] border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm" /></OptionRow>
                  </>
                )}
              </div>
            </section>

            <section className="bg-white p-6 rounded-sm shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
              <SectionTitle icon={<MapPin className="w-5 h-5 text-secondary" />} title={t('address')} />

              <div className="space-y-4">
                <OptionRow label={t('zipcode')}>
                  <div className="flex items-center gap-3">
                    <input type="text" className="w-[100px] border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm" />
                    <a href="https://buscacepinter.correios.com.br/app/endereco/index.php" target="_blank" rel="noreferrer" className="text-secondary font-bold text-xs flex items-center hover:text-primary">
                      <HelpCircle className="w-3.5 h-3.5 mr-1" /> {t('dontKnowZipcode')}
                    </a>
                  </div>
                </OptionRow>
                <OptionRow label={t('address')}><input type="text" className="w-[180px] sm:w-[220px] border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm" /></OptionRow>
                <OptionRow label={t('number')}><input type="text" className="w-[60px] border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm" /></OptionRow>
                <OptionRow label={t('complement')}><input type="text" className="w-[180px] sm:w-[220px] border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm" /></OptionRow>
                <OptionRow label={t('reference')}><input type="text" className="w-[180px] sm:w-[220px] border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm" /></OptionRow>
                <OptionRow label={t('neighborhood')}><input type="text" className="w-[150px] border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm" /></OptionRow>
                <OptionRow label={t('city')}><input type="text" className="w-[150px] border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm" /></OptionRow>
                <OptionRow label={t('state')}>
                  <select className="w-[150px] border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm bg-white">
                    <option>{t('selectOption')}</option>
                    {['Acre', 'Alagoas', 'Amapa', 'Amazonas', 'Bahia', 'Ceara', 'Distrito Federal', 'Espirito Santo', 'Goias', 'Maranhao', 'Mato Grosso', 'Mato Grosso do Sul', 'Minas Gerais', 'Para', 'Paraiba', 'Parana', 'Pernambuco', 'Piaui', 'Rio de Janeiro', 'Rio Grande do Norte', 'Rio Grande do Sul', 'Rondonia', 'Roraima', 'Santa Catarina', 'Sao Paulo', 'Sergipe', 'Tocantins'].map((state) => (
                      <option key={state}>{state}</option>
                    ))}
                  </select>
                </OptionRow>
              </div>
            </section>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => navigate(-1)} className="bg-[#f0f0f0] text-secondary px-6 py-2.5 text-sm hover:bg-neutral-200 transition-colors rounded-sm">
              {t('cancel')}
            </button>
            <button type="submit" className="bg-[#c29656] text-white px-6 py-2.5 font-bold text-sm hover:bg-[#a67c42] transition-colors rounded-sm">
              {t('createAccount')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-6 border-b border-neutral-100 pb-3">
      {icon}
      <h2 className="font-bold uppercase tracking-wider text-secondary text-sm">{title}</h2>
    </div>
  );
}

function OptionRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
      <label className="sm:w-[130px] sm:text-right text-[13px] font-bold text-secondary shrink-0">{label}</label>
      <div className="flex-1">{children}</div>
    </div>
  );
}
