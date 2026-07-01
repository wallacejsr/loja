import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type OrderRule = {
  ascending?: boolean;
  column: string;
};

type SourceRow = Record<string, unknown>;
type TargetRow = Record<string, unknown>;
type MariaDbPoolConnection = any;

type MigrationTableConfig = {
  columns: string[];
  defaultIncluded: boolean;
  fetchMode?: 'many' | 'single';
  key: string;
  mapRows: (rows: SourceRow[]) => TargetRow[];
  orderBy?: OrderRule[];
  sourceTable: string;
  targetTable: string;
};

type CliOptions = {
  execute: boolean;
  includeCredentials: boolean;
  replaceTarget: boolean;
  selectedTables: string[] | null;
};

const BATCH_SIZE = 500;
const NOW_ISO = new Date().toISOString();

function loadEnvFiles() {
  const envFiles = ['.env', '.env.local'];

  for (const fileName of envFiles) {
    const filePath = path.resolve(process.cwd(), fileName);

    if (existsSync(filePath)) {
      dotenv.config({ path: filePath, override: true });
    }
  }
}

function parseArgs(argv: string[]): CliOptions {
  let execute = false;
  let includeCredentials = false;
  let replaceTarget = false;
  let selectedTables: string[] | null = null;

  for (const arg of argv) {
    if (arg === '--execute') {
      execute = true;
      continue;
    }

    if (arg === '--include-credentials') {
      includeCredentials = true;
      continue;
    }

    if (arg === '--replace-target') {
      replaceTarget = true;
      continue;
    }

    if (arg.startsWith('--tables=')) {
      const rawValue = arg.slice('--tables='.length).trim();
      selectedTables = rawValue
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    }
  }

  return {
    execute,
    includeCredentials,
    replaceTarget,
    selectedTables,
  };
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Variavel obrigatoria ausente: ${name}`);
  }

  return value;
}

function hasValue(value: unknown) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

function toBooleanNumber(value: unknown) {
  return value === true || value === 1 || value === '1' ? 1 : 0;
}

function toInteger(value: unknown, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toStringValue(value: unknown, fallback = '') {
  if (!hasValue(value)) {
    return fallback;
  }

  return String(value);
}

function toNullableString(value: unknown) {
  if (!hasValue(value)) {
    return null;
  }

  return String(value);
}

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

function toSqlDateTime(value: unknown, fallback: string | null = null) {
  if (!hasValue(value)) {
    return fallback;
  }

  const date = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return [
    date.getUTCFullYear(),
    padDatePart(date.getUTCMonth() + 1),
    padDatePart(date.getUTCDate()),
  ].join('-')
    + ` ${padDatePart(date.getUTCHours())}:${padDatePart(date.getUTCMinutes())}:${padDatePart(date.getUTCSeconds())}`;
}

function serializeJson(value: unknown, fallback: unknown) {
  return JSON.stringify(value ?? fallback);
}

function buildInsertSql(tableName: string, columns: string[]) {
  const placeholders = columns.map(() => '?').join(', ');
  const updateClause = columns
    .filter((column) => column !== 'id')
    .map((column) => `${column} = VALUES(${column})`)
    .join(', ');

  return `
    INSERT INTO ${tableName} (${columns.join(', ')})
    VALUES (${placeholders})
    ${updateClause ? `ON DUPLICATE KEY UPDATE ${updateClause}` : ''}
  `;
}

async function fetchSourceRows(
  client: SupabaseClient,
  config: MigrationTableConfig,
) {
  if (config.fetchMode === 'single') {
    let query = client.from(config.sourceTable).select('*').limit(1);

    for (const rule of config.orderBy || []) {
      query = query.order(rule.column, { ascending: rule.ascending ?? true });
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Falha ao ler ${config.sourceTable} no Supabase: ${error.message}`);
    }

    return Array.isArray(data) ? data : [];
  }

  const rows: SourceRow[] = [];
  let from = 0;

  while (true) {
    let query = client
      .from(config.sourceTable)
      .select('*')
      .range(from, from + BATCH_SIZE - 1);

    for (const rule of config.orderBy || []) {
      query = query.order(rule.column, { ascending: rule.ascending ?? true });
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Falha ao ler ${config.sourceTable} no Supabase: ${error.message}`);
    }

    const batch = Array.isArray(data) ? data : [];

    rows.push(...batch);

    if (batch.length < BATCH_SIZE) {
      break;
    }

    from += BATCH_SIZE;
  }

  return rows;
}

async function clearTargetTables(
  connection: MariaDbPoolConnection,
  tables: MigrationTableConfig[],
) {
  for (const table of [...tables].reverse()) {
    await connection.query(`DELETE FROM ${table.targetTable}`);
  }
}

async function loadMysqlModule() {
  const moduleName = 'mysql2/promise';

  try {
    return await import(moduleName);
  } catch (error) {
    throw new Error(
      'O driver mysql2 nao esta instalado neste ambiente. Rode "npm install" antes da migracao.',
      { cause: error },
    );
  }
}

function pickSelectedTables(
  allTables: MigrationTableConfig[],
  options: CliOptions,
) {
  const availableKeys = new Set(allTables.map((table) => table.key));

  if (options.selectedTables) {
    const invalid = options.selectedTables.filter((table) => !availableKeys.has(table));

    if (invalid.length > 0) {
      throw new Error(`Tabelas invalidas em --tables: ${invalid.join(', ')}`);
    }
  }

  return allTables.filter((table) => {
    if (table.key === 'payment_gateway_credentials' && !options.includeCredentials) {
      return false;
    }

    if (!table.defaultIncluded && !options.selectedTables) {
      return false;
    }

    if (!options.selectedTables) {
      return true;
    }

    return options.selectedTables.includes(table.key);
  });
}

function createMigrationTableConfigs(): MigrationTableConfig[] {
  return [
    {
      key: 'store_settings',
      sourceTable: 'store_settings',
      targetTable: 'store_settings',
      fetchMode: 'single',
      defaultIncluded: true,
      orderBy: [{ column: 'id', ascending: true }],
      columns: [
        'id',
        'store_name',
        'site_title',
        'admin_panel_name',
        'site_language',
        'allow_business_registration',
        'store_currency',
        'logo_url',
        'email',
        'phone',
        'phone_country',
        'instagram',
        'facebook',
        'tiktok',
        'description',
        'primary_color',
        'secondary_color',
        'points_per_real',
        'support_sales_phone',
        'support_sales_phone_country',
        'support_sac_phone',
        'support_sac_phone_country',
        'support_email',
        'support_week_hours',
        'support_saturday_hours',
        'shipping_origin_country',
        'shipping_origin_postal_code',
        'shipping_origin_city',
        'shipping_origin_region',
        'shipping_origin_street',
        'shipping_origin_number',
        'shipping_free_threshold',
        'shipping_default_product_weight_grams',
        'shipping_package_length_cm',
        'shipping_package_width_cm',
        'shipping_package_height_cm',
        'stripe_enabled',
        'stripe_mode',
        'stripe_currency',
        'stripe_allow_card',
        'stripe_allow_apple_pay',
        'stripe_allow_google_pay',
        'stripe_success_url',
        'stripe_cancel_url',
        'updated_at',
      ],
      mapRows: (rows) => {
        const row = rows[0];

        if (!row) {
          return [];
        }

        return [{
          id: 1,
          store_name: toStringValue(row.store_name, ''),
          site_title: toStringValue(row.site_title, toStringValue(row.store_name, '')),
          admin_panel_name: toStringValue(
            row.admin_panel_name,
            `${toStringValue(row.store_name, 'Store').trim() || 'Store'} Admin`,
          ),
          site_language: toStringValue(row.site_language, 'pt-BR'),
          allow_business_registration: toBooleanNumber(row.allow_business_registration),
          store_currency: toStringValue(row.store_currency, 'USD'),
          logo_url: toStringValue(row.logo_url, ''),
          email: toStringValue(row.email, ''),
          phone: toStringValue(row.phone, ''),
          phone_country: toStringValue(row.phone_country, 'US'),
          instagram: toStringValue(row.instagram, ''),
          facebook: toStringValue(row.facebook, ''),
          tiktok: toStringValue(row.tiktok, ''),
          description: toStringValue(row.description, ''),
          primary_color: toStringValue(row.primary_color, '#ba884b'),
          secondary_color: toStringValue(row.secondary_color, '#1a222b'),
          points_per_real: toNumber(row.points_per_real, 1),
          support_sales_phone: toStringValue(row.support_sales_phone, ''),
          support_sales_phone_country: toStringValue(row.support_sales_phone_country, 'US'),
          support_sac_phone: toStringValue(row.support_sac_phone, ''),
          support_sac_phone_country: toStringValue(row.support_sac_phone_country, 'US'),
          support_email: toStringValue(row.support_email, ''),
          support_week_hours: toStringValue(row.support_week_hours, ''),
          support_saturday_hours: toStringValue(row.support_saturday_hours, ''),
          shipping_origin_country: toStringValue(row.shipping_origin_country, 'US'),
          shipping_origin_postal_code: toStringValue(row.shipping_origin_postal_code, ''),
          shipping_origin_city: toStringValue(row.shipping_origin_city, ''),
          shipping_origin_region: toStringValue(row.shipping_origin_region, ''),
          shipping_origin_street: toStringValue(row.shipping_origin_street, ''),
          shipping_origin_number: toStringValue(row.shipping_origin_number, ''),
          shipping_free_threshold: toNumber(row.shipping_free_threshold, 0),
          shipping_default_product_weight_grams: toInteger(row.shipping_default_product_weight_grams, 500),
          shipping_package_length_cm: toNumber(row.shipping_package_length_cm, 30),
          shipping_package_width_cm: toNumber(row.shipping_package_width_cm, 24),
          shipping_package_height_cm: toNumber(row.shipping_package_height_cm, 6),
          stripe_enabled: toBooleanNumber(row.stripe_enabled),
          stripe_mode: toStringValue(row.stripe_mode, 'test'),
          stripe_currency: toStringValue(row.stripe_currency, 'USD'),
          stripe_allow_card: toBooleanNumber(row.stripe_allow_card),
          stripe_allow_apple_pay: toBooleanNumber(row.stripe_allow_apple_pay),
          stripe_allow_google_pay: toBooleanNumber(row.stripe_allow_google_pay),
          stripe_success_url: toStringValue(row.stripe_success_url, '/checkout/success?session_id={CHECKOUT_SESSION_ID}'),
          stripe_cancel_url: toStringValue(row.stripe_cancel_url, '/cart'),
          updated_at: toSqlDateTime(row.updated_at, toSqlDateTime(NOW_ISO)),
        }];
      },
    },
    {
      key: 'categories',
      sourceTable: 'categories',
      targetTable: 'categories',
      defaultIncluded: true,
      orderBy: [{ column: 'created_at', ascending: true }, { column: 'slug', ascending: true }],
      columns: [
        'id',
        'nome',
        'slug',
        'imagem',
        'subcategories',
        'status',
        'show_in_menu',
        'menu_order',
        'show_on_home',
        'home_section_title',
        'home_section_order',
        'home_section_limit',
        'home_section_filter',
        'created_at',
        'updated_at',
      ],
      mapRows: (rows) => rows.map((row) => ({
        id: toStringValue(row.id),
        nome: toStringValue(row.nome),
        slug: toStringValue(row.slug),
        imagem: toStringValue(row.imagem, ''),
        subcategories: serializeJson(row.subcategories, []),
        status: toStringValue(row.status, 'Ativo'),
        show_in_menu: toBooleanNumber(row.show_in_menu),
        menu_order: toInteger(row.menu_order, 100),
        show_on_home: toBooleanNumber(row.show_on_home),
        home_section_title: toStringValue(row.home_section_title, toStringValue(row.nome)),
        home_section_order: toInteger(row.home_section_order, 100),
        home_section_limit: toInteger(row.home_section_limit, 4),
        home_section_filter: toStringValue(row.home_section_filter, 'all'),
        created_at: toSqlDateTime(row.created_at, toSqlDateTime(NOW_ISO)),
        updated_at: toSqlDateTime(row.updated_at, toSqlDateTime(NOW_ISO)),
      })),
    },
    {
      key: 'products',
      sourceTable: 'products',
      targetTable: 'products',
      defaultIncluded: true,
      orderBy: [{ column: 'created_at', ascending: true }, { column: 'id', ascending: true }],
      columns: [
        'id',
        'nome',
        'preco',
        'preco_promocional',
        'categoria',
        'subcategoria',
        'imagens',
        'descricao',
        'composicao',
        'tamanhos',
        'cores',
        'avaliacoes',
        'mais_vendido',
        'lancamento',
        'estoque',
        'shipping_weight_grams',
        'status',
        'created_at',
        'updated_at',
      ],
      mapRows: (rows) => rows.map((row) => ({
        id: toStringValue(row.id),
        nome: toStringValue(row.nome),
        preco: toNumber(row.preco, 0),
        preco_promocional: hasValue(row.preco_promocional) ? toNumber(row.preco_promocional, 0) : null,
        categoria: toStringValue(row.categoria),
        subcategoria: toStringValue(row.subcategoria, ''),
        imagens: serializeJson(row.imagens, []),
        descricao: toStringValue(row.descricao, ''),
        composicao: toStringValue(row.composicao, ''),
        tamanhos: serializeJson(row.tamanhos, []),
        cores: serializeJson(row.cores, []),
        avaliacoes: serializeJson(row.avaliacoes, []),
        mais_vendido: toBooleanNumber(row.mais_vendido),
        lancamento: toBooleanNumber(row.lancamento),
        estoque: toInteger(row.estoque, 0),
        shipping_weight_grams: toInteger(row.shipping_weight_grams, 500),
        status: toStringValue(row.status, 'Ativo'),
        created_at: toSqlDateTime(row.created_at, toSqlDateTime(NOW_ISO)),
        updated_at: toSqlDateTime(row.updated_at, toSqlDateTime(NOW_ISO)),
      })),
    },
    {
      key: 'banners',
      sourceTable: 'banners',
      targetTable: 'banners',
      defaultIncluded: true,
      orderBy: [{ column: 'position', ascending: true }, { column: 'created_at', ascending: true }],
      columns: [
        'id',
        'title',
        'desktop_image',
        'mobile_image',
        'link',
        'status',
        'position',
        'created_at',
        'updated_at',
      ],
      mapRows: (rows) => rows.map((row) => ({
        id: toStringValue(row.id),
        title: toStringValue(row.title),
        desktop_image: toStringValue(row.desktop_image),
        mobile_image: toStringValue(row.mobile_image, toStringValue(row.desktop_image)),
        link: toStringValue(row.link, '/catalog'),
        status: toStringValue(row.status, 'Ativo'),
        position: toInteger(row.position, 100),
        created_at: toSqlDateTime(row.created_at, toSqlDateTime(NOW_ISO)),
        updated_at: toSqlDateTime(row.updated_at, toSqlDateTime(NOW_ISO)),
      })),
    },
    {
      key: 'instagram_posts',
      sourceTable: 'instagram_posts',
      targetTable: 'instagram_posts',
      defaultIncluded: true,
      orderBy: [{ column: 'position', ascending: true }, { column: 'created_at', ascending: true }],
      columns: [
        'id',
        'image',
        'link',
        'position',
        'status',
        'created_at',
        'updated_at',
      ],
      mapRows: (rows) => rows.map((row) => ({
        id: toStringValue(row.id),
        image: toStringValue(row.image),
        link: toStringValue(row.link, ''),
        position: toInteger(row.position, 100),
        status: toStringValue(row.status, 'Ativo'),
        created_at: toSqlDateTime(row.created_at, toSqlDateTime(NOW_ISO)),
        updated_at: toSqlDateTime(row.updated_at, toSqlDateTime(NOW_ISO)),
      })),
    },
    {
      key: 'home_sections',
      sourceTable: 'home_sections',
      targetTable: 'home_sections',
      defaultIncluded: true,
      orderBy: [{ column: 'position', ascending: true }, { column: 'id', ascending: true }],
      columns: [
        'id',
        'title',
        'source_type',
        'category_name',
        'limit_count',
        'link',
        'position',
        'status',
        'updated_at',
      ],
      mapRows: (rows) => rows.map((row) => ({
        id: toStringValue(row.id),
        title: toStringValue(row.title),
        source_type: toStringValue(row.source_type, 'category'),
        category_name: toStringValue(row.category_name, ''),
        limit_count: toInteger(row.limit_count, 4),
        link: toStringValue(row.link, '/catalog'),
        position: toInteger(row.position, 100),
        status: toStringValue(row.status, 'Ativo'),
        updated_at: toSqlDateTime(row.updated_at, toSqlDateTime(NOW_ISO)),
      })),
    },
    {
      key: 'home_cards',
      sourceTable: 'home_cards',
      targetTable: 'home_cards',
      defaultIncluded: true,
      orderBy: [{ column: 'position', ascending: true }, { column: 'created_at', ascending: true }],
      columns: [
        'id',
        'title',
        'image',
        'link',
        'cta_label',
        'position',
        'status',
        'created_at',
        'updated_at',
      ],
      mapRows: (rows) => rows.map((row) => ({
        id: toStringValue(row.id),
        title: toStringValue(row.title),
        image: toStringValue(row.image),
        link: toStringValue(row.link, '/catalog'),
        cta_label: toStringValue(row.cta_label, 'Confira'),
        position: toInteger(row.position, 100),
        status: toStringValue(row.status, 'Ativo'),
        created_at: toSqlDateTime(row.created_at, toSqlDateTime(NOW_ISO)),
        updated_at: toSqlDateTime(row.updated_at, toSqlDateTime(NOW_ISO)),
      })),
    },
    {
      key: 'raffles',
      sourceTable: 'raffles',
      targetTable: 'raffles',
      defaultIncluded: true,
      orderBy: [{ column: 'position', ascending: true }, { column: 'created_at', ascending: true }],
      columns: [
        'id',
        'title',
        'prize',
        'description',
        'image',
        'product_id',
        'points_per_ticket',
        'draw_date',
        'cta_label',
        'cta_link',
        'total_participants',
        'total_tickets',
        'status',
        'position',
        'created_at',
        'updated_at',
      ],
      mapRows: (rows) => rows.map((row) => ({
        id: toStringValue(row.id),
        title: toStringValue(row.title),
        prize: toStringValue(row.prize),
        description: toStringValue(row.description, ''),
        image: toStringValue(row.image, ''),
        product_id: toNullableString(row.product_id),
        points_per_ticket: toInteger(row.points_per_ticket, 0),
        draw_date: toNullableString(row.draw_date),
        cta_label: toStringValue(row.cta_label, 'Participar agora'),
        cta_link: toStringValue(row.cta_link, '/sorteios'),
        total_participants: toInteger(row.total_participants, 0),
        total_tickets: toInteger(row.total_tickets, 0),
        status: toStringValue(row.status, 'Ativo'),
        position: toInteger(row.position, 100),
        created_at: toSqlDateTime(row.created_at, toSqlDateTime(NOW_ISO)),
        updated_at: toSqlDateTime(row.updated_at, toSqlDateTime(NOW_ISO)),
      })),
    },
    {
      key: 'contact_messages',
      sourceTable: 'contact_messages',
      targetTable: 'contact_messages',
      defaultIncluded: true,
      orderBy: [{ column: 'created_at', ascending: true }, { column: 'id', ascending: true }],
      columns: [
        'id',
        'name',
        'email',
        'phone',
        'order_number',
        'message',
        'status',
        'source',
        'admin_notes',
        'created_at',
        'updated_at',
        'replied_at',
      ],
      mapRows: (rows) => rows.map((row) => ({
        id: toStringValue(row.id),
        name: toStringValue(row.name),
        email: toStringValue(row.email, ''),
        phone: toStringValue(row.phone, ''),
        order_number: toStringValue(row.order_number, ''),
        message: toStringValue(row.message),
        status: toStringValue(row.status, 'Novo'),
        source: toStringValue(row.source, 'site-contact'),
        admin_notes: toStringValue(row.admin_notes, ''),
        created_at: toSqlDateTime(row.created_at, toSqlDateTime(NOW_ISO)),
        updated_at: toSqlDateTime(row.updated_at, toSqlDateTime(NOW_ISO)),
        replied_at: toSqlDateTime(row.replied_at, null),
      })),
    },
    {
      key: 'newsletter_subscribers',
      sourceTable: 'newsletter_subscribers',
      targetTable: 'newsletter_subscribers',
      defaultIncluded: true,
      orderBy: [{ column: 'created_at', ascending: true }, { column: 'email', ascending: true }],
      columns: [
        'id',
        'email',
        'status',
        'source',
        'coupon_code',
        'created_at',
        'updated_at',
      ],
      mapRows: (rows) => rows.map((row) => ({
        id: toStringValue(row.id),
        email: toStringValue(row.email),
        status: toStringValue(row.status, 'Ativo'),
        source: toStringValue(row.source, 'footer-newsletter'),
        coupon_code: toStringValue(row.coupon_code, 'BEMVINDA10'),
        created_at: toSqlDateTime(row.created_at, toSqlDateTime(NOW_ISO)),
        updated_at: toSqlDateTime(row.updated_at, toSqlDateTime(NOW_ISO)),
      })),
    },
    {
      key: 'payment_gateway_credentials',
      sourceTable: 'payment_gateway_credentials',
      targetTable: 'payment_gateway_credentials',
      defaultIncluded: false,
      orderBy: [{ column: 'provider', ascending: true }, { column: 'mode', ascending: true }],
      columns: [
        'provider',
        'mode',
        'publishable_key_encrypted',
        'secret_key_encrypted',
        'webhook_secret_encrypted',
        'updated_at',
      ],
      mapRows: (rows) => rows.map((row) => ({
        provider: toStringValue(row.provider),
        mode: toStringValue(row.mode),
        publishable_key_encrypted: toStringValue(row.publishable_key_encrypted, ''),
        secret_key_encrypted: toStringValue(row.secret_key_encrypted, ''),
        webhook_secret_encrypted: toStringValue(row.webhook_secret_encrypted, ''),
        updated_at: toSqlDateTime(row.updated_at, toSqlDateTime(NOW_ISO)),
      })),
    },
    {
      key: 'stripe_checkout_orders',
      sourceTable: 'stripe_checkout_orders',
      targetTable: 'stripe_checkout_orders',
      defaultIncluded: true,
      orderBy: [{ column: 'created_at', ascending: true }, { column: 'order_number', ascending: true }],
      columns: [
        'order_number',
        'stripe_session_id',
        'stripe_payment_intent_id',
        'provider',
        'mode',
        'session_status',
        'payment_status',
        'order_status',
        'currency',
        'subtotal',
        'shipping',
        'discount',
        'total',
        'shipping_method',
        'payment_method',
        'customer',
        'shipping_address',
        'items',
        'source',
        'metadata',
        'created_at',
        'updated_at',
        'paid_at',
        'shipped_at',
        'delivered_at',
        'last_event_id',
        'last_event_type',
        'logs',
      ],
      mapRows: (rows) => rows.map((row) => ({
        order_number: toStringValue(row.order_number),
        stripe_session_id: toNullableString(row.stripe_session_id),
        stripe_payment_intent_id: toStringValue(row.stripe_payment_intent_id, ''),
        provider: toStringValue(row.provider, 'stripe'),
        mode: toStringValue(row.mode, 'test'),
        session_status: toStringValue(row.session_status, 'open'),
        payment_status: toStringValue(row.payment_status, 'unpaid'),
        order_status: toStringValue(row.order_status, 'Aguardando Pagamento'),
        currency: toStringValue(row.currency, 'USD'),
        subtotal: toNumber(row.subtotal, 0),
        shipping: toNumber(row.shipping, 0),
        discount: toNumber(row.discount, 0),
        total: toNumber(row.total, 0),
        shipping_method: toStringValue(row.shipping_method, ''),
        payment_method: toStringValue(row.payment_method, 'Stripe Checkout'),
        customer: serializeJson(row.customer, {}),
        shipping_address: serializeJson(row.shipping_address, {}),
        items: serializeJson(row.items, []),
        source: toStringValue(row.source, 'stripe_checkout'),
        metadata: serializeJson(row.metadata, {}),
        created_at: toSqlDateTime(row.created_at, toSqlDateTime(NOW_ISO)),
        updated_at: toSqlDateTime(row.updated_at, toSqlDateTime(NOW_ISO)),
        paid_at: toSqlDateTime(row.paid_at, null),
        shipped_at: toSqlDateTime(row.shipped_at, null),
        delivered_at: toSqlDateTime(row.delivered_at, null),
        last_event_id: toStringValue(row.last_event_id, ''),
        last_event_type: toStringValue(row.last_event_type, ''),
        logs: serializeJson(row.logs, []),
      })),
    },
    {
      key: 'stripe_webhook_logs',
      sourceTable: 'stripe_webhook_logs',
      targetTable: 'stripe_webhook_logs',
      defaultIncluded: true,
      orderBy: [{ column: 'processed_at', ascending: true }, { column: 'event_id', ascending: true }],
      columns: [
        'event_id',
        'event_type',
        'order_number',
        'stripe_session_id',
        'livemode',
        'status',
        'message',
        'payload',
        'processed_at',
      ],
      mapRows: (rows) => rows.map((row) => ({
        event_id: toStringValue(row.event_id),
        event_type: toStringValue(row.event_type),
        order_number: toStringValue(row.order_number, ''),
        stripe_session_id: toStringValue(row.stripe_session_id, ''),
        livemode: toBooleanNumber(row.livemode),
        status: toStringValue(row.status, 'received'),
        message: toStringValue(row.message, ''),
        payload: serializeJson(row.payload, {}),
        processed_at: toSqlDateTime(row.processed_at, toSqlDateTime(NOW_ISO)),
      })),
    },
  ];
}

async function main() {
  loadEnvFiles();

  const options = parseArgs(process.argv.slice(2));

  const supabaseUrl = process.env.SUPABASE_URL?.trim()
    || process.env.VITE_SUPABASE_URL?.trim();
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      'Configure SUPABASE_URL (ou VITE_SUPABASE_URL) e SUPABASE_SERVICE_ROLE_KEY antes de rodar a migracao.',
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const mysql = await loadMysqlModule();
  const pool = mysql.createPool({
    host: requireEnv('MARIADB_HOST'),
    port: Number(process.env.MARIADB_PORT || 3306),
    user: requireEnv('MARIADB_USER'),
    password: requireEnv('MARIADB_PASSWORD'),
    database: requireEnv('MARIADB_DATABASE'),
    connectionLimit: Number(process.env.MARIADB_CONNECTION_LIMIT || 10),
    charset: 'utf8mb4',
    namedPlaceholders: false,
    multipleStatements: false,
  });

  const allTables = createMigrationTableConfigs();
  const selectedTables = pickSelectedTables(allTables, options);

  if (selectedTables.length === 0) {
    throw new Error('Nenhuma tabela selecionada para migracao.');
  }

  console.log(`\nMigracao Supabase -> MariaDB`);
  console.log(`Modo: ${options.execute ? 'EXECUCAO REAL' : 'DRY-RUN'}`);
  console.log(`Tabelas: ${selectedTables.map((table) => table.key).join(', ')}`);
  console.log(`Substituir destino: ${options.replaceTarget ? 'sim' : 'nao'}`);
  console.log(`Incluir credenciais Stripe salvas: ${options.includeCredentials ? 'sim' : 'nao'}\n`);

  const sourceData = new Map<string, TargetRow[]>();

  for (const table of selectedTables) {
    const sourceRows = await fetchSourceRows(supabase, table);
    const mappedRows = table.mapRows(sourceRows);
    sourceData.set(table.key, mappedRows);
    console.log(`[source] ${table.key}: ${mappedRows.length} registro(s)`);
  }

  if (!options.execute) {
    console.log('\nDry-run concluido. Nenhum dado foi gravado no MariaDB.');
    await pool.end();
    return;
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    if (options.replaceTarget) {
      await clearTargetTables(connection, selectedTables);
    }

    for (const table of selectedTables) {
      const rows = sourceData.get(table.key) || [];

      if (rows.length === 0) {
        continue;
      }

      const sql = buildInsertSql(table.targetTable, table.columns);

      for (const row of rows) {
        const values = table.columns.map((column) => row[column] ?? null);
        await connection.query(sql, values);
      }

      console.log(`[target] ${table.key}: ${rows.length} registro(s) importado(s)`);
    }

    await connection.commit();
    console.log('\nMigracao concluida com sucesso.');
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('\nFalha na migracao Supabase -> MariaDB');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
