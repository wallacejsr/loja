insert into public.store_settings (
  id, store_name, site_title, admin_panel_name, site_language, allow_business_registration, store_currency, logo_url, email, phone, phone_country, instagram, facebook, tiktok, description, primary_color, secondary_color, points_per_real, support_sales_phone, support_sales_phone_country, support_sac_phone, support_sac_phone_country, support_email, support_week_hours, support_saturday_hours, shipping_origin_country, shipping_origin_postal_code, shipping_origin_city, shipping_origin_region, shipping_origin_street, shipping_origin_number, shipping_free_threshold, shipping_default_product_weight_grams, shipping_package_length_cm, shipping_package_width_cm, shipping_package_height_cm
) values (
  1,
  'ZENV Apparel',
  'ZENV Apparel',
  'ZENV Admin',
  'en-US',
  false,
  'USD',
  '',
  '',
  '',
  'US',
  '',
  '',
  '',
  'Premium essentials with comfort, style and everyday versatility.',
  '#ba884b',
  '#1a222b',
  1,
  '',
  'US',
  '',
  'US',
  '',
  '',
  '',
  'US',
  '73098',
  'Wynnewood',
  'OK',
  '',
  '',
  199,
  500,
  30,
  24,
  6
) on conflict (id) do update set
  store_name = excluded.store_name,
  site_title = excluded.site_title,
  admin_panel_name = excluded.admin_panel_name,
  site_language = excluded.site_language,
  allow_business_registration = excluded.allow_business_registration,
  store_currency = excluded.store_currency,
  logo_url = excluded.logo_url,
  email = excluded.email,
  phone = excluded.phone,
  phone_country = excluded.phone_country,
  instagram = excluded.instagram,
  facebook = excluded.facebook,
  tiktok = excluded.tiktok,
  description = excluded.description,
  primary_color = excluded.primary_color,
  secondary_color = excluded.secondary_color,
  points_per_real = excluded.points_per_real,
  support_sales_phone = excluded.support_sales_phone,
  support_sales_phone_country = excluded.support_sales_phone_country,
  support_sac_phone = excluded.support_sac_phone,
  support_sac_phone_country = excluded.support_sac_phone_country,
  support_email = excluded.support_email,
  support_week_hours = excluded.support_week_hours,
  support_saturday_hours = excluded.support_saturday_hours,
  shipping_origin_country = excluded.shipping_origin_country,
  shipping_origin_postal_code = excluded.shipping_origin_postal_code,
  shipping_origin_city = excluded.shipping_origin_city,
  shipping_origin_region = excluded.shipping_origin_region,
  shipping_origin_street = excluded.shipping_origin_street,
  shipping_origin_number = excluded.shipping_origin_number,
  shipping_free_threshold = excluded.shipping_free_threshold,
  shipping_default_product_weight_grams = excluded.shipping_default_product_weight_grams,
  shipping_package_length_cm = excluded.shipping_package_length_cm,
  shipping_package_width_cm = excluded.shipping_package_width_cm,
  shipping_package_height_cm = excluded.shipping_package_height_cm,
  updated_at = now();

insert into public.categories (nome, slug, imagem, subcategories, status, show_in_menu, menu_order, show_on_home, home_section_title, home_section_order, home_section_limit, home_section_filter) values
  ('Lancamentos', 'lancamentos', '', '[]'::jsonb, 'Ativo', true, 1, false, 'Lancamentos', 1, 4, 'all'),
  ('Ocasioes', 'ocasioes', '', '["Aniversario","Casamentos/Formaturas","Festas da Empresa","Final de Ano","Night","Trabalho","White Looks"]'::jsonb, 'Ativo', true, 2, false, 'Ocasioes', 2, 4, 'all'),
  ('Linha Essencial', 'linha-essencial', '', '["Basicos","Office","Casual Chic"]'::jsonb, 'Ativo', true, 3, false, 'Linha Essencial', 3, 4, 'all'),
  ('Jeans', 'jeans', '', '["Wide Leg","Mom","Skinny","Reta"]'::jsonb, 'Ativo', true, 4, false, 'Jeans', 4, 4, 'all'),
  ('Nav.Vestidos', 'nav-vestidos', '', '["Midi","Longo","Festa","Casual"]'::jsonb, 'Ativo', true, 5, false, 'Vestidos', 5, 4, 'all'),
  ('Calcas', 'calcas', 'https://cdn.awsli.com.br/1140x850/2751/2751677/banner/calcas-l87gy6ydk4.png', '["Alfaiataria","Wide Leg","Pantalona","Linho"]'::jsonb, 'Ativo', true, 6, false, 'Calcas', 6, 4, 'all'),
  ('Camisas', 'camisas', '', '["Social","Premium","Manga Curta"]'::jsonb, 'Ativo', true, 7, false, 'Camisas', 7, 4, 'all'),
  ('Feminino', 'feminino', 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=800', '["Vestidos","Conjuntos","Blusas","Calcas"]'::jsonb, 'Ativo', true, 8, false, 'Feminino', 8, 4, 'all'),
  ('Masculino', 'masculino', 'https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&q=80&w=800', '["Camisas","Polos","Bermudas"]'::jsonb, 'Ativo', false, 9, false, 'Masculino', 9, 4, 'all'),
  ('Infantil', 'infantil', 'https://images.unsplash.com/photo-1519241047957-be31d7379a5d?auto=format&fit=crop&q=80&w=800', '["Menina","Menino","Bebe"]'::jsonb, 'Ativo', false, 10, false, 'Infantil', 10, 4, 'all'),
  ('Acessorios', 'acessorios', 'https://images.unsplash.com/photo-1509319117193-57bab727e09d?auto=format&fit=crop&q=80&w=800', '["Bolsas","Cintos","Bijuterias","Bones"]'::jsonb, 'Ativo', false, 11, false, 'Acessorios', 11, 4, 'all')
on conflict (nome) do update set
  slug = excluded.slug,
  imagem = excluded.imagem,
  subcategories = excluded.subcategories,
  status = excluded.status,
  show_in_menu = excluded.show_in_menu,
  menu_order = excluded.menu_order,
  show_on_home = excluded.show_on_home,
  home_section_title = excluded.home_section_title,
  home_section_order = excluded.home_section_order,
  home_section_limit = excluded.home_section_limit,
  home_section_filter = excluded.home_section_filter,
  updated_at = now();

insert into public.banners (title, desktop_image, mobile_image, link, status, position) values
  ('ZENV Essentials', 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&q=80&w=1920&h=600', 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&q=80&w=800&h=1000', '/catalog', 'Ativo', 1),
  ('Lancamentos', 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=1920&h=600', 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=800&h=1000', '/catalog?sort=lancamentos', 'Ativo', 2)
on conflict do nothing;

insert into public.home_sections (id, title, source_type, category_name, limit_count, link, position, status) values
  ('lancamentos', 'Lancamentos', 'lancamentos', '', 4, '/catalog?sort=lancamentos', 1, 'Ativo'),
  ('mais-vendidos', 'Mais Vendidos', 'mais_vendidos', '', 4, '/catalog?sort=mais-vendidos', 2, 'Ativo')
on conflict (id) do update set
  title = excluded.title,
  source_type = excluded.source_type,
  category_name = excluded.category_name,
  limit_count = excluded.limit_count,
  link = excluded.link,
  position = excluded.position,
  status = excluded.status,
  updated_at = now();

insert into public.home_cards (title, image, link, cta_label, position, status) values
  ('Camisetas', 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&q=80&w=900', '/catalog?q=camiseta', 'Confira', 1, 'Ativo'),
  ('Puffer', 'https://images.unsplash.com/photo-1548624149-f9b185f6893d?auto=format&fit=crop&q=80&w=900', '/catalog?q=puffer', 'Confira', 2, 'Ativo'),
  ('Tricos', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=900', '/catalog?q=trico', 'Confira', 3, 'Ativo')
on conflict do nothing;

insert into public.raffles (
  title, prize, description, image, product_id, points_per_ticket, draw_date, cta_label, cta_link, total_participants, total_tickets, status, position
) values (
  'Concorra a um look exclusivo',
  'Conjunto Alfaiataria Bege',
  'A cada compra voce acumula pontos para participar do clube de sorteios. Garanta seus bilhetes e concorra ao premio ativo da loja.',
  'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&q=80&w=1000',
  'p2',
  100,
  '2026-12-31',
  'Participar do sorteio',
  '/sorteios',
  0,
  0,
  'Ativo',
  1
)
on conflict do nothing;

insert into public.products (
  id, nome, preco, preco_promocional, categoria, subcategoria, imagens, descricao, composicao, tamanhos, cores, avaliacoes, mais_vendido, lancamento, estoque, shipping_weight_grams, status
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
    420,
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
    760,
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
    360,
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
  shipping_weight_grams = excluded.shipping_weight_grams,
  status = excluded.status,
  updated_at = now();

insert into public.instagram_posts (image, link, status, position) values
  ('https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&q=80&w=500', null, 'Ativo', 1),
  ('https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&q=80&w=500', null, 'Ativo', 2),
  ('https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&q=80&w=500', null, 'Ativo', 3),
  ('https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=500', null, 'Ativo', 4)
on conflict do nothing;
