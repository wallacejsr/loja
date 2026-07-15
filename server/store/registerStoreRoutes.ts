import { Router, type Request, type Response } from 'express';
import type { StoreApiConfig } from '../config';
import { auditAdminAction, requireAdminPermission } from '../auth/adminRouteAuth';
import type { AdminPermission } from '../auth/adminPermissions';
import { parseSingleMultipartFile, persistUploadedProductImage } from './upload';
import type { StoreRepository } from './types';

function isTruthyFlag(value: unknown, defaultValue = true) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value).toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

function handleRouteError(response: Response, error: unknown) {
  const message = error instanceof Error ? error.message : 'Store API request failed.';
  response.status(400).send(message);
}

function buildProtectedHandler(
  repository: StoreRepository,
  permission: AdminPermission,
  routeHandler: (request: Request, response: Response) => Promise<void>,
  audit?: {
    action: string;
    entityId: (request: Request) => string;
    entityType: string;
  },
) {
  return async (request: Request, response: Response) => {
    try {
      await routeHandler(request, response);

      if (audit && response.statusCode < 400) {
        await auditAdminAction(repository, request, {
          action: audit.action,
          entityId: audit.entityId(request),
          entityType: audit.entityType,
        });
      }
    } catch (error) {
      handleRouteError(response, error);
    }
  };
}

export function registerStoreRoutes(repository: StoreRepository, config: StoreApiConfig, uploadsRoot: string) {
  const router = Router();

  const protect = (
    permission: AdminPermission,
    handler: (request: Request, response: Response) => Promise<void>,
    audit?: {
      action: string;
      entityId: (request: Request) => string;
      entityType: string;
    },
  ) => [
    requireAdminPermission(repository, config, permission),
    buildProtectedHandler(repository, permission, handler, audit),
  ] as const;

  router.get('/health', (_request, response) => {
    response.json({ ok: true, service: 'store-api' });
  });

  router.get(
    '/admin/dashboard',
    ...protect(
      'dashboard:read',
      async (_request, response) => {
        response.json(await repository.getAdminDashboardSummary());
      },
    ),
  );

  router.get('/products', async (request, response) => {
    try {
      response.json(await repository.getProducts({ onlyActive: isTruthyFlag(request.query.onlyActive, true) }));
    } catch (error) {
      handleRouteError(response, error);
    }
  });

  router.post(
    '/products',
    ...protect(
      'products:write',
      async (request, response) => {
        response.status(201).json(await repository.createProduct(request.body));
      },
      { action: 'admin.product_created', entityId: (request) => String(request.body?.id || request.body?.nome || 'new'), entityType: 'product' },
    ),
  );

  router.put(
    '/products/:id',
    ...protect(
      'products:write',
      async (request, response) => {
        response.json(await repository.updateProduct(request.params.id, request.body));
      },
      { action: 'admin.product_updated', entityId: (request) => request.params.id, entityType: 'product' },
    ),
  );

  router.delete(
    '/products/:id',
    ...protect(
      'products:write',
      async (request, response) => {
        await repository.deleteProduct(request.params.id);
        response.status(204).end();
      },
      { action: 'admin.product_deleted', entityId: (request) => request.params.id, entityType: 'product' },
    ),
  );

  router.post(
    '/uploads/product-image',
    ...protect(
      'products:write',
      async (request, response) => {
        const file = await parseSingleMultipartFile(request);
        const url = await persistUploadedProductImage(uploadsRoot, file);
        response.status(201).json({ url });
      },
      { action: 'admin.product_image_uploaded', entityId: () => 'product-image', entityType: 'upload' },
    ),
  );

  router.get('/categories', async (_request, response) => {
    try {
      response.json(await repository.getCategories());
    } catch (error) {
      handleRouteError(response, error);
    }
  });

  router.post(
    '/categories',
    ...protect(
      'categories:write',
      async (request, response) => {
        response.status(201).json(await repository.createCategory(request.body));
      },
      { action: 'admin.category_created', entityId: (request) => String(request.body?.slug || request.body?.nome || 'new'), entityType: 'category' },
    ),
  );

  router.put(
    '/categories/:id',
    ...protect(
      'categories:write',
      async (request, response) => {
        response.json(await repository.updateCategory(request.params.id, request.body));
      },
      { action: 'admin.category_updated', entityId: (request) => request.params.id, entityType: 'category' },
    ),
  );

  router.delete(
    '/categories/:id',
    ...protect(
      'categories:write',
      async (request, response) => {
        await repository.deleteCategory(request.params.id);
        response.status(204).end();
      },
      { action: 'admin.category_deleted', entityId: (request) => request.params.id, entityType: 'category' },
    ),
  );

  router.get('/banners', async (request, response) => {
    try {
      response.json(await repository.getBanners({ onlyActive: isTruthyFlag(request.query.onlyActive, true) }));
    } catch (error) {
      handleRouteError(response, error);
    }
  });

  router.post(
    '/banners',
    ...protect(
      'banners:write',
      async (request, response) => {
        response.status(201).json(await repository.createBanner(request.body));
      },
      { action: 'admin.banner_created', entityId: (request) => String(request.body?.title || 'new'), entityType: 'banner' },
    ),
  );

  router.delete(
    '/banners/:id',
    ...protect(
      'banners:write',
      async (request, response) => {
        await repository.deleteBanner(request.params.id);
        response.status(204).end();
      },
      { action: 'admin.banner_deleted', entityId: (request) => request.params.id, entityType: 'banner' },
    ),
  );

  router.put(
    '/banners/reorder',
    ...protect(
      'banners:write',
      async (request, response) => {
        await repository.updateBannerPositions(request.body?.banners || []);
        response.status(204).end();
      },
      { action: 'admin.banner_reordered', entityId: () => 'banner-list', entityType: 'banner' },
    ),
  );

  router.get('/home-sections', async (request, response) => {
    try {
      response.json(await repository.getHomeSections({ onlyActive: isTruthyFlag(request.query.onlyActive, true) }));
    } catch (error) {
      handleRouteError(response, error);
    }
  });

  router.put(
    '/home-sections/:id',
    ...protect(
      'home:write',
      async (request, response) => {
        response.json(await repository.updateHomeSection(request.params.id, request.body));
      },
      { action: 'admin.home_section_updated', entityId: (request) => request.params.id, entityType: 'home_section' },
    ),
  );

  router.get('/home-cards', async (request, response) => {
    try {
      response.json(await repository.getHomeCards({ onlyActive: isTruthyFlag(request.query.onlyActive, true) }));
    } catch (error) {
      handleRouteError(response, error);
    }
  });

  router.post(
    '/home-cards',
    ...protect(
      'home:write',
      async (request, response) => {
        response.status(201).json(await repository.createHomeCard(request.body));
      },
      { action: 'admin.home_card_created', entityId: (request) => String(request.body?.title || 'new'), entityType: 'home_card' },
    ),
  );

  router.put(
    '/home-cards/:id',
    ...protect(
      'home:write',
      async (request, response) => {
        response.json(await repository.updateHomeCard(request.params.id, request.body));
      },
      { action: 'admin.home_card_updated', entityId: (request) => request.params.id, entityType: 'home_card' },
    ),
  );

  router.delete(
    '/home-cards/:id',
    ...protect(
      'home:write',
      async (request, response) => {
        await repository.deleteHomeCard(request.params.id);
        response.status(204).end();
      },
      { action: 'admin.home_card_deleted', entityId: (request) => request.params.id, entityType: 'home_card' },
    ),
  );

  router.get('/raffles', async (request, response) => {
    try {
      response.json(await repository.getRaffles({ onlyActive: isTruthyFlag(request.query.onlyActive, true) }));
    } catch (error) {
      handleRouteError(response, error);
    }
  });

  router.post(
    '/raffles',
    ...protect(
      'raffles:write',
      async (request, response) => {
        response.status(201).json(await repository.createRaffle(request.body));
      },
      { action: 'admin.raffle_created', entityId: (request) => String(request.body?.title || 'new'), entityType: 'raffle' },
    ),
  );

  router.put(
    '/raffles/:id',
    ...protect(
      'raffles:write',
      async (request, response) => {
        response.json(await repository.updateRaffle(request.params.id, request.body));
      },
      { action: 'admin.raffle_updated', entityId: (request) => request.params.id, entityType: 'raffle' },
    ),
  );

  router.delete(
    '/raffles/:id',
    ...protect(
      'raffles:write',
      async (request, response) => {
        await repository.deleteRaffle(request.params.id);
        response.status(204).end();
      },
      { action: 'admin.raffle_deleted', entityId: (request) => request.params.id, entityType: 'raffle' },
    ),
  );

  router.get('/instagram-feed', async (_request, response) => {
    try {
      response.json(await repository.getInstagramFeed());
    } catch (error) {
      handleRouteError(response, error);
    }
  });

  router.get('/settings', async (_request, response) => {
    try {
      response.json(await repository.getStoreSettings());
    } catch (error) {
      handleRouteError(response, error);
    }
  });

  router.put(
    '/settings',
    ...protect(
      'settings:write',
      async (request, response) => {
        response.json(await repository.saveStoreSettings(request.body));
      },
      { action: 'admin.settings_updated', entityId: () => 'store-settings', entityType: 'settings' },
    ),
  );

  router.get(
    '/contact-messages',
    ...protect(
      'messages:read',
      async (_request, response) => {
        response.json(await repository.getContactMessages());
      },
    ),
  );

  router.get(
    '/newsletter-subscribers',
    ...protect(
      'newsletter:read',
      async (_request, response) => {
        response.json(await repository.getNewsletterSubscribers());
      },
    ),
  );

  router.post('/contact-messages', async (request, response) => {
    try {
      response.status(201).json(await repository.createContactMessage(request.body));
    } catch (error) {
      handleRouteError(response, error);
    }
  });

  router.post('/newsletter-subscribers', async (request, response) => {
    try {
      response.status(201).json(await repository.createNewsletterSubscriber(request.body));
    } catch (error) {
      handleRouteError(response, error);
    }
  });

  router.put(
    '/contact-messages/:id',
    ...protect(
      'messages:write',
      async (request, response) => {
        response.json(await repository.updateContactMessage(request.params.id, request.body));
      },
      { action: 'admin.contact_message_updated', entityId: (request) => request.params.id, entityType: 'contact_message' },
    ),
  );

  return router;
}
