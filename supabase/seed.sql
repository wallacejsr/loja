insert into public.store_settings (
  id, store_name, logo_url, email, phone, instagram, facebook, tiktok, description, primary_color, secondary_color, points_per_real
) values (
  1,
  'Spacodani',
  'https://cdn.awsli.com.br/400x300/2751/2751677/logo/logo-dani-morais-ky8ceccgy5.png',
  'contato@danibrand.com.br',
  '(11) 99999-9999',
  'https://instagram.com/danibrand',
  'https://facebook.com/',
  'https://tiktok.com/@',
  'Loja oficial DANI Brand. Roupas minimalistas e exclusivas, feitas com algodao premium.',
  '#ba884b',
  '#1a222b',
  1
) on conflict (id) do update set
  store_name = excluded.store_name,
  logo_url = excluded.logo_url,
  email = excluded.email,
  phone = excluded.phone,
  instagram = excluded.instagram,
  facebook = excluded.facebook,
  tiktok = excluded.tiktok,
  description = excluded.description,
  primary_color = excluded.primary_color,
  secondary_color = excluded.secondary_color,
  points_per_real = excluded.points_per_real,
  updated_at = now();

insert into public.categories (nome, slug, imagem, status) values
  ('Feminino', 'feminino', 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=800', 'Ativo'),
  ('Masculino', 'masculino', 'https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&q=80&w=800', 'Ativo'),
  ('Infantil', 'infantil', 'https://images.unsplash.com/photo-1519241047957-be31d7379a5d?auto=format&fit=crop&q=80&w=800', 'Ativo'),
  ('Acessorios', 'acessorios', 'https://images.unsplash.com/photo-1509319117193-57bab727e09d?auto=format&fit=crop&q=80&w=800', 'Ativo')
on conflict (nome) do update set
  slug = excluded.slug,
  imagem = excluded.imagem,
  status = excluded.status,
  updated_at = now();

insert into public.banners (title, desktop_image, mobile_image, link, status, position) values
  ('Colecao Principal', 'https://cdn.awsli.com.br/1920x1920/2751/2751677/banner/18-0grlts3ju4.png', 'https://cdn.awsli.com.br/1920x1920/2751/2751677/banner/2-iwz6y4331u.png', '/catalog', 'Ativo', 1),
  ('Lancamentos', 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=1920&h=600', 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=800&h=1000', '/catalog?sort=lancamentos', 'Ativo', 2)
on conflict do nothing;

insert into public.products (
  id, nome, preco, preco_promocional, categoria, subcategoria, imagens, descricao, composicao, tamanhos, cores, avaliacoes, mais_vendido, lancamento, estoque, status
) values
  (
    'p1',
    'Vestido Midi Plissado Nude',
    349.90,
    299.90,
    'Feminino',
    'Vestidos',
    '["https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&q=80&w=800","https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?auto=format&fit=crop&q=80&w=800"]'::jsonb,
    'Vestido midi plissado de alta costura, perfeito para eventos casuais chic e ocasioes especiais.',
    '100% Poliester',
    '["P","M","G"]'::jsonb,
    '[{"nome":"Nude","hex":"#E3CAA5"},{"nome":"Preto","hex":"#000000"}]'::jsonb,
    '[{"id":"a1","autor":"Mariana Silva","nota":5,"comentario":"Perfeito! O caimento e incrivel e o tecido de otima qualidade.","data":"10/10/2023"}]'::jsonb,
    true,
    false,
    15,
    'Ativo'
  ),
  (
    'p2',
    'Conjunto Alfaiataria Bege',
    459.90,
    null,
    'Feminino',
    'Conjuntos',
    '["https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&q=80&w=800","https://images.unsplash.com/photo-1584273143981-41c073dfe8f8?auto=format&fit=crop&q=80&w=800"]'::jsonb,
    'Conjunto de alfaiataria premium, composto por blazer acinturado e calca reta.',
    '95% Poliester, 5% Elastano',
    '["P","M","G","GG"]'::jsonb,
    '[{"nome":"Bege","hex":"#F5F5DC"}]'::jsonb,
    '[]'::jsonb,
    false,
    true,
    8,
    'Ativo'
  ),
  (
    'p3',
    'Blusa Tricot Manga Bufante',
    189.90,
    149.90,
    'Feminino',
    'Blusas',
    '["https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&q=80&w=800","https://images.unsplash.com/photo-1551163943-3f6a855d1153?auto=format&fit=crop&q=80&w=800"]'::jsonb,
    'Blusa de tricot leve com mangas levemente bufantes.',
    '70% Viscose, 30% Poliamida',
    '["Tamanho Unico"]'::jsonb,
    '[{"nome":"Branco","hex":"#FFFFFF"},{"nome":"Rosa Bebe","hex":"#FFB6C1"}]'::jsonb,
    '[]'::jsonb,
    true,
    false,
    20,
    'Ativo'
  )
on conflict (id) do update set
  nome = excluded.nome,
  preco = excluded.preco,
  preco_promocional = excluded.preco_promocional,
  categoria = excluded.categoria,
  subcategoria = excluded.subcategoria,
  imagens = excluded.imagens,
  descricao = excluded.descricao,
  composicao = excluded.composicao,
  tamanhos = excluded.tamanhos,
  cores = excluded.cores,
  avaliacoes = excluded.avaliacoes,
  mais_vendido = excluded.mais_vendido,
  lancamento = excluded.lancamento,
  estoque = excluded.estoque,
  status = excluded.status,
  updated_at = now();

insert into public.instagram_posts (image, link, status, position) values
  ('https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&q=80&w=500', null, 'Ativo', 1),
  ('https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&q=80&w=500', null, 'Ativo', 2),
  ('https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&q=80&w=500', null, 'Ativo', 3),
  ('https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=500', null, 'Ativo', 4)
on conflict do nothing;
