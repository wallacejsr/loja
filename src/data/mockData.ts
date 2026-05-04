export type Category = "Feminino" | "Masculino" | "Infantil" | "Acessórios";

export interface Review {
  id: string;
  autor: string;
  nota: number;
  comentario: string;
  data: string;
}

export interface Product {
  id: string;
  nome: string;
  preco: number;
  precoPromocional?: number;
  categoria: Category;
  subcategoria: string;
  imagens: string[];
  descricao: string;
  composicao: string;
  tamanhos: string[];
  cores: { nome: string; hex: string }[];
  avaliacoes: Review[];
  maisVendido?: boolean;
  lancamento?: boolean;
  estoque: number;
}

export const categorias: { nome: Category; imagem: string }[] = [
  { nome: "Feminino", imagem: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=800" },
  { nome: "Masculino", imagem: "https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&q=80&w=800" },
  { nome: "Infantil", imagem: "https://images.unsplash.com/photo-1519241047957-be31d7379a5d?auto=format&fit=crop&q=80&w=800" },
  { nome: "Acessórios", imagem: "https://images.unsplash.com/photo-1509319117193-57bab727e09d?auto=format&fit=crop&q=80&w=800" }
];

export const produtos: Product[] = [
  {
    id: "p1",
    nome: "Vestido Midi Plissado Nude",
    preco: 349.90,
    precoPromocional: 299.90,
    categoria: "Feminino",
    subcategoria: "Vestidos",
    imagens: [
      "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&q=80&w=800",
      "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?auto=format&fit=crop&q=80&w=800"
    ],
    descricao: "Vestido midi plissado de alta costura, perfeito para eventos casuais chic e ocasiões especiais. Caimento impecável e modelagem que valoriza a silhueta da mulher moderna.",
    composicao: "100% Poliéster",
    tamanhos: ["P", "M", "G"],
    cores: [{ nome: "Nude", hex: "#E3CAA5" }, { nome: "Preto", hex: "#000000" }],
    avaliacoes: [
      { id: "a1", autor: "Mariana Silva", nota: 5, comentario: "Perfeito! O caimento é incrível e o tecido de ótima qualidade.", data: "10/10/2023" },
      { id: "a2", autor: "Luiza Mendes", nota: 4, comentario: "Gostei muito, mas achei a forma um pouco grande.", data: "05/11/2023" }
    ],
    maisVendido: true,
    estoque: 15
  },
  {
    id: "p2",
    nome: "Conjunto Alfaiataria Bege",
    preco: 459.90,
    categoria: "Feminino",
    subcategoria: "Conjuntos",
    imagens: [
      "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&q=80&w=800",
      "https://images.unsplash.com/photo-1584273143981-41c073dfe8f8?auto=format&fit=crop&q=80&w=800"
    ],
    descricao: "Conjunto de alfaiataria premium, composto por blazer acinturado e calça reta. Elegância e sofisticação para o seu workwear ou eventos formais.",
    composicao: "95% Poliéster, 5% Elastano",
    tamanhos: ["P", "M", "G", "GG"],
    cores: [{ nome: "Bege", hex: "#F5F5DC" }],
    avaliacoes: [
      { id: "a3", autor: "Camila Costa", nota: 5, comentario: "Lindo! Visto M e serviu certinho. Bem elegante.", data: "12/09/2023" }
    ],
    lancamento: true,
    estoque: 8
  },
  {
    id: "p3",
    nome: "Blusa Tricot Manga Bufante",
    preco: 189.90,
    precoPromocional: 149.90,
    categoria: "Feminino",
    subcategoria: "Blusas",
    imagens: [
      "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&q=80&w=800",
      "https://images.unsplash.com/photo-1551163943-3f6a855d1153?auto=format&fit=crop&q=80&w=800"
    ],
    descricao: "Blusa de tricot leve com mangas levemente bufantes. Detalhe delicado para composições românticas e modernas.",
    composicao: "70% Viscose, 30% Poliamida",
    tamanhos: ["Tamanho Único"],
    cores: [{ nome: "Branco", hex: "#FFFFFF" }, { nome: "Rosa Bebê", hex: "#FFB6C1" }],
    avaliacoes: [],
    maisVendido: true,
    estoque: 20
  },
  {
    id: "p4",
    nome: "Calça Pantalona Linho Cru",
    preco: 279.90,
    categoria: "Feminino",
    subcategoria: "Calças",
    imagens: [
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=80&w=800"
    ],
    descricao: "Pantalona em mix de linho, cintura alta, fechamento por zíper invisível. O frescor do linho com a elegância da pantalona.",
    composicao: "55% Linho, 45% Viscose",
    tamanhos: ["36", "38", "40", "42"],
    cores: [{ nome: "Cru", hex: "#EAE0C8" }],
    avaliacoes: [
       { id: "a4", autor: "Amanda Oliveira", nota: 5, comentario: "Maravilhosa! Veste incrivelmente bem.", data: "01/12/2023" }
    ],
    estoque: 5
  },
  {
    id: "p5",
    nome: "Bolsa Couro Tiracolo Minimal",
    preco: 319.90,
    categoria: "Acessórios",
    subcategoria: "Bolsas",
    imagens: [
      "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&q=80&w=800"
    ],
    descricao: "Bolsa estruturada em couro legítimo, design minimalista. Possui alça ajustável e fechamento magnético.",
    composicao: "100% Couro Legítimo",
    tamanhos: ["Único"],
    cores: [{ nome: "Caramelo", hex: "#A67B5B" }, { nome: "Preto", hex: "#000000" }],
    avaliacoes: [],
    lancamento: true,
    estoque: 12
  },
  {
    id: "p6",
    nome: "Camisa Algodão Egípcio",
    preco: 259.90,
    categoria: "Masculino",
    subcategoria: "Camisas",
    imagens: [
      "https://images.unsplash.com/photo-1602810318383-e386cc2a3ce3?auto=format&fit=crop&q=80&w=800"
    ],
    descricao: "Camisa manga longa em puro algodão egípcio, modelagem slim. Toque extra macio e caimento perfeito.",
    composicao: "100% Algodão",
    tamanhos: ["P", "M", "G", "GG"],
    cores: [{ nome: "Branco", hex: "#FFFFFF" }, { nome: "Azul Claro", hex: "#ADD8E6" }],
    avaliacoes: [],
    maisVendido: true,
    estoque: 30
  }
];

export const instagramFeed = [
  "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&q=80&w=500",
  "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&q=80&w=500",
  "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&q=80&w=500",
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=500"
];
