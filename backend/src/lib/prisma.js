const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Automatically set last_updated on every organisation UPDATE.
// last_updated must never be accepted from a request body — middleware is the sole setter.
prisma.$use(async (params, next) => {
  if (params.model === 'Organisation' && params.action === 'update') {
    params.args.data.last_updated = new Date();
  }
  return next(params);
});

module.exports = prisma;
