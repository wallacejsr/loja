import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  pt: {
    translation: {
      "settings": {
        "title": "Configurações da Loja",
        "subtitle": "Ajuste os dados gerais e aparência da loja.",
        "language": "Idioma do Site",
        "language_desc": "Selecione o idioma principal exibido para seus clientes.",
        "save": "Salvar Configurações"
      },
      "nav": {
        "catalog": "Catálogo",
        "about": "Sobre",
        "contact": "Contato",
        "new_arrivals": "Lançamentos",
        "occasions": "Ocasiões",
        "essential": "Linha Essencial",
        "jeans": "Jeans",
        "dresses": "Vestidos",
        "pants": "Calças",
        "shirts": "Camisas",
        "welcome": "Bem-vindo(a)",
        "login_register": "Entrar ou Cadastrar",
        "all_categories": "Todas as Categorias",
        "search_placeholder": "O que você está procurando?"
      },
      "footer": {
        "newsletter_title": "Cadastre-se e ganhe 10% de desconto",
        "newsletter_subtitle": "Cadastre seu e-mail e ganhe 10% de desconto para primeira compra.",
        "subscribe": "Assinar",
        "about_title": "Sobre a loja",
        "content_title": "Conteúdo",
        "contact_title": "Contato",
        "social_title": "Social"
      },
      "hero": {
        "title": "Essenciais do Cotidiano",
        "subtitle": "Qualidade e minimalismo para sua rotina.",
        "shop_now": "Comprar Agora"
      }
    }
  },
  en: {
    translation: {
      "settings": {
        "title": "Store Settings",
        "subtitle": "Adjust general store data and appearance.",
        "language": "Site Language",
        "language_desc": "Select the primary language displayed to your customers.",
        "save": "Save Settings"
      },
      "nav": {
        "catalog": "Catalog",
        "about": "About",
        "contact": "Contact",
        "new_arrivals": "New Arrivals",
        "occasions": "Occasions",
        "essential": "Essential Line",
        "jeans": "Jeans",
        "dresses": "Dresses",
        "pants": "Pants",
        "shirts": "Shirts",
        "welcome": "Welcome",
        "login_register": "Login or Register",
        "all_categories": "All Categories",
        "search_placeholder": "What are you looking for?"
      },
      "footer": {
        "newsletter_title": "Sign up and get 10% off",
        "newsletter_subtitle": "Register your email and get 10% off on your first purchase.",
        "subscribe": "Subscribe",
        "about_title": "About the store",
        "content_title": "Content",
        "contact_title": "Contact",
        "social_title": "Social"
      },
      "hero": {
        "title": "Daily Essentials",
        "subtitle": "Quality and minimalism for your routine.",
        "shop_now": "Shop Now"
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'pt',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
