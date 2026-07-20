export interface StoreReview {
  id: string;
  autor: string;
  nota: number;
  comentario: string;
  data: string;
}

export interface StoreProductColor {
  nome: string;
  hex: string;
}

export interface StoreProduct {
  id: string;
  nome: string;
  preco: number;
  precoPromocional?: number;
  categoria: string;
  subcategoria: string;
  imagens: string[];
  descricao: string;
  composicao: string;
  tamanhos: string[];
  cores: StoreProductColor[];
  avaliacoes: StoreReview[];
  maisVendido?: boolean;
  lancamento?: boolean;
  estoque: number;
  shippingWeightGrams?: number;
}
