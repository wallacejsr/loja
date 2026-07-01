import { Router, type Request, type Response } from 'express';
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

export function registerStoreRoutes(repository: StoreRepository, uploadsRoot: string) {
  const router = Router();

  router.get('/health', (_request, response) => {
    response.json({ ok: true, service: 'store-api' });
  });

  router.get('/products', async (request, response) => {
    try {
      response.json(await repository.getProducts({ onlyActive: isTruthyFlag(request.query.onlyActive, true) }));
    } catch (error) {
      handleRouteError(response, error);
    }
  });

  router.post('/products', async (request, response) => {
    try {
      response.status(201).json(await repository.createProduct(request.body));
    } catch (error) {
      handleRouteError(response, error);
    }
  });

  router.put('/products/:id', async (request, response) => {
    try {
      response.json(await repository.updateProduct(request.params.id, request.body));
    } catch (error) {
      handleRouteError(response, error);
    }
  });

  router.delete('/products/:id', async (request, response) => {
    try {
      await repository.deleteProduct(request.params.id);
      response.status(204).end();
    } catch (error) {
      handleRouteError(response, error);
    }
  });

  router.post('/uploads/product-image', async (request: Request, response) => {
    try {
      const file = await parseSingleMultipartFile(request);
      const url = await persistUploadedProductImage(uploadsRoot, file);
      response.status(201).json({ url });
    } catch (error) {
      handleRouteError(response, error);
    }
  });

  router.get('/categories', async (_request, response) => {
    try {
      response.json(await repository.getCategories());
    } catch (error) {
      handleRouteError(response, error);
    }
  });

  router.post('/categories', async (request, response) => {
    try {
      response.status(201).json(await repository.createCategory(request.body));
    } catch (error) {
      handleRouteError(response, error);
    }
  });

  router.put('/categories/:id', async (request, response) => {
    try {
      response.json(await repository.updateCategory(request.params.id, request.body));
    } catch (error) {
      handleRouteError(response, error);
    }
  });

  router.delete('/categories/:id', async (request, response) => {
    try {
      await repository.deleteCategory(request.params.id);
      response.status(204).end();
    } catch (error) {
      handleRouteError(response, error);
    }
  });

  router.get('/banners', async (request, response) => {
    try {
      response.json(await repository.getBanners({ onlyActive: isTruthyFlag(request.query.onlyActive, true) }));
    } catch (error) {
      handleRouteError(response, error);
    }
  });

  router.post('/banners', async (request, response) => {
    try {
      response.status(201).json(await repository.createBanner(request.body));
    } catch (error) {
      handleRouteError(response, error);
    }
  });

  router.delete('/banners/:id', async (request, response) => {
    try {
      await repository.deleteBanner(request.params.id);
      response.status(204).end();
    } catch (error) {
      handleRouteError(response, error);
    }
  });

  router.put('/banners/reorder', async (request, response) => {
    try {
      await repository.updateBannerPositions(request.body?.banners || []);
      response.status(204).end();
    } catch (error) {
      handleRouteError(response, error);
    }
  });

  router.get('/home-sections', async (request, response) => {
    try {
      response.json(await repository.getHomeSections({ onlyActive: isTruthyFlag(request.query.onlyActive, true) }));
    } catch (error) {
      handleRouteError(response, error);
    }
  });

  router.put('/home-sections/:id', async (request, response) => {
    try {
      response.json(await repository.updateHomeSection(request.params.id, request.body));
    } catch (error) {
      handleRouteError(response, error);
    }
  });

  router.get('/home-cards', async (request, response) => {
    try {
      response.json(await repository.getHomeCards({ onlyActive: isTruthyFlag(request.query.onlyActive, true) }));
    } catch (error) {
      handleRouteError(response, error);
    }
  });

  router.post('/home-cards', async (request, response) => {
    try {
      response.status(201).json(await repository.createHomeCard(request.body));
    } catch (error) {
      handleRouteError(response, error);
    }
  });

  router.put('/home-cards/:id', async (request, response) => {
    try {
      response.json(await repository.updateHomeCard(request.params.id, request.body));
    } catch (error) {
      handleRouteError(response, error);
    }
  });

  router.delete('/home-cards/:id', async (request, response) => {
    try {
      await repository.deleteHomeCard(request.params.id);
      response.status(204).end();
    } catch (error) {
      handleRouteError(response, error);
    }
  });

  router.get('/raffles', async (request, response) => {
    try {
      response.json(await repository.getRaffles({ onlyActive: isTruthyFlag(request.query.onlyActive, true) }));
    } catch (error) {
      handleRouteError(response, error);
    }
  });

  router.post('/raffles', async (request, response) => {
    try {
      response.status(201).json(await repository.createRaffle(request.body));
    } catch (error) {
      handleRouteError(response, error);
    }
  });

  router.put('/raffles/:id', async (request, response) => {
    try {
      response.json(await repository.updateRaffle(request.params.id, request.body));
    } catch (error) {
      handleRouteError(response, error);
    }
  });

  router.delete('/raffles/:id', async (request, response) => {
    try {
      await repository.deleteRaffle(request.params.id);
      response.status(204).end();
    } catch (error) {
      handleRouteError(response, error);
    }
  });

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

  router.put('/settings', async (request, response) => {
    try {
      response.json(await repository.saveStoreSettings(request.body));
    } catch (error) {
      handleRouteError(response, error);
    }
  });

  router.get('/contact-messages', async (_request, response) => {
    try {
      response.json(await repository.getContactMessages());
    } catch (error) {
      handleRouteError(response, error);
    }
  });

  router.get('/newsletter-subscribers', async (_request, response) => {
    try {
      response.json(await repository.getNewsletterSubscribers());
    } catch (error) {
      handleRouteError(response, error);
    }
  });

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

  router.put('/contact-messages/:id', async (request, response) => {
    try {
      response.json(await repository.updateContactMessage(request.params.id, request.body));
    } catch (error) {
      handleRouteError(response, error);
    }
  });

  return router;
}
