import { Router, type Request, type Response } from 'express';
import type { StoreApiConfig } from '../config';
import type { CustomerAddressInput, CustomerCartSaveInput, CustomerProfileUpdateInput, CustomerRegisterInput } from '../../src/lib/storeCustomerApi.ts';
import { hashPassword, verifyPassword } from './password';
import {
  buildExpiredSessionCookieHeader,
  buildSessionCookieHeader,
  generateSessionToken,
  hashSessionToken,
} from './session';
import type { StoreRepository } from '../store/types';

function handleAccountError(response: Response, error: unknown, statusCode = 400, code = 'ACCOUNT_API_ERROR') {
  const message = error instanceof Error ? error.message : 'Account request failed.';
  response.status(statusCode).json({
    code,
    message,
    success: false,
  });
}

function getUserAgent(request: Request) {
  const rawValue = request.headers['user-agent'];
  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  return (value || '').slice(0, 255);
}

async function resolveAuthenticatedCustomer(
  request: Request,
  response: Response,
  repository: StoreRepository,
  config: StoreApiConfig,
) {
  const token = request.cookies?.[config.session.cookieName];

  if (!token) {
    return null;
  }

  const tokenHash = hashSessionToken(token, config);
  const session = await repository.getCustomerSessionByTokenHash(tokenHash);

  if (!session) {
    response.setHeader('Set-Cookie', buildExpiredSessionCookieHeader(config));
    return null;
  }

  const isExpired = new Date(session.expiresAt).getTime() <= Date.now();
  if (session.revokedAt || isExpired) {
    await repository.revokeCustomerSession(session.id);
    response.setHeader('Set-Cookie', buildExpiredSessionCookieHeader(config));
    return null;
  }

  await repository.touchCustomerSession(session.id, request.clientIp || '', getUserAgent(request));

  const payload = await repository.getCustomerSessionPayload(session.customerId);

  if (!payload?.authenticated || !payload.customer) {
    await repository.revokeCustomerSession(session.id);
    response.setHeader('Set-Cookie', buildExpiredSessionCookieHeader(config));
    return null;
  }

  request.currentCustomerId = session.customerId;
  request.currentSessionId = session.id;

  return {
    payload,
    session,
  };
}

function requireAuthenticatedCustomer(request: Request, response: Response) {
  if (!request.currentCustomerId || !request.currentSessionId) {
    response.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'You need to sign in before continuing.',
      success: false,
    });
    return false;
  }

  return true;
}

function sanitizeRegisterInput(body: Partial<CustomerRegisterInput>): CustomerRegisterInput {
  return {
    email: String(body.email || '').trim().toLowerCase(),
    password: String(body.password || ''),
    fullName: String(body.fullName || '').trim(),
    phone: String(body.phone || '').trim(),
    phoneCountry: body.phoneCountry || 'US',
    birthDate: String(body.birthDate || '').trim(),
    gender: String(body.gender || '').trim(),
    registrationType: body.registrationType === 'J' ? 'J' : 'F',
    taxId: String(body.taxId || '').trim(),
    corporateName: String(body.corporateName || '').trim(),
    stateRegistration: String(body.stateRegistration || '').trim(),
    allowMarketing: body.allowMarketing !== false,
    address: body.address
      ? {
          label: String(body.address.label || '').trim(),
          country: body.address.country || 'US',
          postalCode: String(body.address.postalCode || '').trim(),
          street: String(body.address.street || '').trim(),
          number: String(body.address.number || '').trim(),
          complement: String(body.address.complement || '').trim(),
          neighborhood: String(body.address.neighborhood || '').trim(),
          city: String(body.address.city || '').trim(),
          region: String(body.address.region || '').trim(),
          isPrimary: body.address.isPrimary !== false,
        }
      : undefined,
  };
}

function sanitizeProfileInput(body: Partial<CustomerProfileUpdateInput>): CustomerProfileUpdateInput {
  return {
    allowMarketing: body.allowMarketing,
    birthDate: body.birthDate ? String(body.birthDate).trim() : undefined,
    corporateName: body.corporateName?.trim(),
    fullName: body.fullName?.trim(),
    gender: body.gender?.trim(),
    phone: body.phone?.trim(),
    phoneCountry: body.phoneCountry,
    stateRegistration: body.stateRegistration?.trim(),
    taxId: body.taxId?.trim(),
  };
}

function sanitizeAddressInput(body: Partial<CustomerAddressInput>, forcedId?: string): CustomerAddressInput {
  return {
    id: forcedId || body.id || '',
    label: String(body.label || '').trim(),
    country: body.country || 'US',
    postalCode: String(body.postalCode || '').trim(),
    street: String(body.street || '').trim(),
    number: String(body.number || '').trim(),
    complement: String(body.complement || '').trim(),
    neighborhood: String(body.neighborhood || '').trim(),
    city: String(body.city || '').trim(),
    region: String(body.region || '').trim(),
    isPrimary: body.isPrimary !== false,
  };
}

function sanitizeCartInput(body: Partial<CustomerCartSaveInput>): CustomerCartSaveInput {
  const items = Array.isArray(body.items)
    ? body.items
        .map((item) => ({
          productId: String(item?.productId || item?.product?.id || '').trim(),
          product: item?.product,
          quantity: Number(item?.quantity || 1),
          size: String(item?.size || '').trim(),
          color: String(item?.color || '').trim(),
        }))
        .filter((item) => Boolean(item.productId) && Boolean(item.product?.id))
    : [];

  return {
    appliedBenefitId: body.appliedBenefitId ? String(body.appliedBenefitId).trim() : null,
    appliedCouponId: body.appliedCouponId ? String(body.appliedCouponId).trim() : null,
    currency: body.currency ? String(body.currency).trim() : 'USD',
    discount: Number(body.discount || 0),
    items,
    shipping: Number(body.shipping || 0),
    shippingMethod: body.shippingMethod ? String(body.shippingMethod).trim() : '',
    tax: Number(body.tax || 0),
  };
}

function validateRegisterInput(input: CustomerRegisterInput) {
  if (!input.email || !input.password || !input.fullName) {
    throw new Error('Email, password and full name are required.');
  }

  if (input.address && (!input.address.postalCode || !input.address.street || !input.address.city || !input.address.region)) {
    throw new Error('The primary address is incomplete.');
  }
}

export function registerCustomerAuthRoutes(repository: StoreRepository, config: StoreApiConfig) {
  const router = Router();

  router.get('/session', async (request, response) => {
    try {
      const resolved = await resolveAuthenticatedCustomer(request, response, repository, config);

      if (!resolved) {
        response.json({
          authenticated: false,
          availableWelcomeBenefit: null,
          customer: null,
          primaryAddress: null,
        });
        return;
      }

      response.json(resolved.payload);
    } catch (error) {
      handleAccountError(response, error, 500);
    }
  });

  router.post('/register', async (request, response) => {
    try {
      const input = sanitizeRegisterInput(request.body || {});
      validateRegisterInput(input);

      const existingAccount = await repository.findCustomerAuthByEmail(input.email);
      if (existingAccount) {
        handleAccountError(response, new Error('An account with this email already exists.'), 409, 'EMAIL_EXISTS');
        return;
      }

      const passwordHash = await hashPassword(input.password, config);
      const payload = await repository.createCustomerAccount({
        ...input,
        passwordHash,
      });

      if (!payload.customer) {
        throw new Error('The customer account could not be created.');
      }

      const sessionToken = generateSessionToken();
      const expiresAt = new Date(Date.now() + config.session.ttlSeconds * 1000);

      await repository.createCustomerSession({
        customerId: payload.customer.id,
        expiresAt: expiresAt.toISOString(),
        ipAddress: request.clientIp || '',
        sessionTokenHash: hashSessionToken(sessionToken, config),
        userAgent: getUserAgent(request),
      });

      response.setHeader('Set-Cookie', buildSessionCookieHeader(sessionToken, config, expiresAt));
      response.status(201).json(payload);
    } catch (error) {
      handleAccountError(response, error);
    }
  });

  router.post('/login', async (request, response) => {
    try {
      const email = String(request.body?.email || '').trim().toLowerCase();
      const password = String(request.body?.password || '');

      if (!email || !password) {
        handleAccountError(response, new Error('Email and password are required.'), 400, 'INVALID_CREDENTIALS');
        return;
      }

      const account = await repository.findCustomerAuthByEmail(email);
      if (!account) {
        handleAccountError(response, new Error('Invalid email or password.'), 401, 'INVALID_CREDENTIALS');
        return;
      }

      if (account.status !== 'active') {
        handleAccountError(response, new Error('This account is inactive.'), 403, 'ACCOUNT_DISABLED');
        return;
      }

      const passwordMatches = await verifyPassword(password, account.passwordHash, config);
      if (!passwordMatches) {
        handleAccountError(response, new Error('Invalid email or password.'), 401, 'INVALID_CREDENTIALS');
        return;
      }

      const payload = await repository.getCustomerSessionPayload(account.id);
      if (!payload?.customer) {
        handleAccountError(response, new Error('The customer account could not be loaded.'), 500);
        return;
      }

      const sessionToken = generateSessionToken();
      const expiresAt = new Date(Date.now() + config.session.ttlSeconds * 1000);

      await repository.createCustomerSession({
        customerId: account.id,
        expiresAt: expiresAt.toISOString(),
        ipAddress: request.clientIp || '',
        sessionTokenHash: hashSessionToken(sessionToken, config),
        userAgent: getUserAgent(request),
      });

      response.setHeader('Set-Cookie', buildSessionCookieHeader(sessionToken, config, expiresAt));
      response.json(payload);
    } catch (error) {
      handleAccountError(response, error, 500);
    }
  });

  router.post('/logout', async (request, response) => {
    try {
      const resolved = await resolveAuthenticatedCustomer(request, response, repository, config);

      if (resolved?.session.id) {
        await repository.revokeCustomerSession(resolved.session.id);
      }

      response.setHeader('Set-Cookie', buildExpiredSessionCookieHeader(config));
      response.json({ success: true });
    } catch (error) {
      response.setHeader('Set-Cookie', buildExpiredSessionCookieHeader(config));
      handleAccountError(response, error, 500);
    }
  });

  router.put('/profile', async (request, response) => {
    try {
      const resolved = await resolveAuthenticatedCustomer(request, response, repository, config);
      if (!resolved) {
        handleAccountError(response, new Error('You need to sign in before continuing.'), 401, 'UNAUTHORIZED');
        return;
      }

      if (!requireAuthenticatedCustomer(request, response)) {
        return;
      }

      const payload = await repository.updateCustomerProfile(
        request.currentCustomerId,
        sanitizeProfileInput(request.body || {}),
      );
      response.json(payload);
    } catch (error) {
      handleAccountError(response, error);
    }
  });

  router.post('/addresses', async (request, response) => {
    try {
      const resolved = await resolveAuthenticatedCustomer(request, response, repository, config);
      if (!resolved) {
        handleAccountError(response, new Error('You need to sign in before continuing.'), 401, 'UNAUTHORIZED');
        return;
      }

      if (!requireAuthenticatedCustomer(request, response)) {
        return;
      }

      const payload = await repository.saveCustomerAddress(
        request.currentCustomerId,
        sanitizeAddressInput(request.body || {}),
      );
      response.status(201).json(payload);
    } catch (error) {
      handleAccountError(response, error);
    }
  });

  router.put('/addresses/:id', async (request, response) => {
    try {
      const resolved = await resolveAuthenticatedCustomer(request, response, repository, config);
      if (!resolved) {
        handleAccountError(response, new Error('You need to sign in before continuing.'), 401, 'UNAUTHORIZED');
        return;
      }

      if (!requireAuthenticatedCustomer(request, response)) {
        return;
      }

      const payload = await repository.saveCustomerAddress(
        request.currentCustomerId,
        sanitizeAddressInput(request.body || {}, request.params.id),
      );
      response.json(payload);
    } catch (error) {
      handleAccountError(response, error);
    }
  });

  router.delete('/addresses/:id', async (request, response) => {
    try {
      const resolved = await resolveAuthenticatedCustomer(request, response, repository, config);
      if (!resolved) {
        handleAccountError(response, new Error('You need to sign in before continuing.'), 401, 'UNAUTHORIZED');
        return;
      }

      if (!requireAuthenticatedCustomer(request, response)) {
        return;
      }

      const payload = await repository.deleteCustomerAddress(request.currentCustomerId, request.params.id);
      response.json(payload);
    } catch (error) {
      handleAccountError(response, error);
    }
  });

  router.post('/benefits/newsletter/activate', async (request, response) => {
    try {
      const resolved = await resolveAuthenticatedCustomer(request, response, repository, config);
      if (!resolved) {
        handleAccountError(response, new Error('You need to sign in before continuing.'), 401, 'UNAUTHORIZED');
        return;
      }

      if (!requireAuthenticatedCustomer(request, response)) {
        return;
      }

      const payload = await repository.activateNewsletterBenefitForCustomer(request.currentCustomerId);
      response.json(payload);
    } catch (error) {
      handleAccountError(response, error);
    }
  });

  router.post('/benefits/:benefitId/consume', async (request, response) => {
    try {
      const resolved = await resolveAuthenticatedCustomer(request, response, repository, config);
      if (!resolved) {
        handleAccountError(response, new Error('You need to sign in before continuing.'), 401, 'UNAUTHORIZED');
        return;
      }

      if (!requireAuthenticatedCustomer(request, response)) {
        return;
      }

      const orderNumber = String(request.body?.orderNumber || '').trim();
      if (!orderNumber) {
        handleAccountError(response, new Error('The order number is required.'), 400, 'ORDER_NUMBER_REQUIRED');
        return;
      }

      const payload = await repository.consumeCustomerBenefit(
        request.currentCustomerId,
        request.params.benefitId,
        orderNumber,
      );
      response.json(payload);
    } catch (error) {
      handleAccountError(response, error);
    }
  });

  router.get('/cart', async (request, response) => {
    try {
      const resolved = await resolveAuthenticatedCustomer(request, response, repository, config);
      if (!resolved) {
        handleAccountError(response, new Error('You need to sign in before continuing.'), 401, 'UNAUTHORIZED');
        return;
      }

      if (!requireAuthenticatedCustomer(request, response)) {
        return;
      }

      response.json(await repository.getCustomerCart(request.currentCustomerId));
    } catch (error) {
      handleAccountError(response, error);
    }
  });

  router.put('/cart', async (request, response) => {
    try {
      const resolved = await resolveAuthenticatedCustomer(request, response, repository, config);
      if (!resolved) {
        handleAccountError(response, new Error('You need to sign in before continuing.'), 401, 'UNAUTHORIZED');
        return;
      }

      if (!requireAuthenticatedCustomer(request, response)) {
        return;
      }

      response.json(await repository.saveCustomerCart(request.currentCustomerId, sanitizeCartInput(request.body || {})));
    } catch (error) {
      handleAccountError(response, error);
    }
  });

  router.post('/cart/clear', async (request, response) => {
    try {
      const resolved = await resolveAuthenticatedCustomer(request, response, repository, config);
      if (!resolved) {
        handleAccountError(response, new Error('You need to sign in before continuing.'), 401, 'UNAUTHORIZED');
        return;
      }

      if (!requireAuthenticatedCustomer(request, response)) {
        return;
      }

      response.json(await repository.clearCustomerCart(request.currentCustomerId));
    } catch (error) {
      handleAccountError(response, error);
    }
  });

  return router;
}
