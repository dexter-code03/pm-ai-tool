import { Router } from 'express';
import Stripe from 'stripe';
import { prisma } from '../lib/prisma.js';
import { fromJson } from '../lib/json.js';

const router = Router();

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

router.get('/invoices', async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({
        error: 'Stripe is not configured',
        configured: false,
        hint: 'Set STRIPE_SECRET_KEY.'
      });
    }
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const settings = fromJson(user?.settings, {});
    const customerId = settings.stripeCustomerId;
    if (!customerId) {
      return res.json({ invoices: [], customerId: null });
    }
    const list = await stripe.invoices.list({ customer: customerId, limit: 50 });
    res.json({
      invoices: list.data.map((inv) => ({
        id: inv.id,
        status: inv.status,
        amountDue: inv.amount_due,
        currency: inv.currency,
        hostedInvoiceUrl: inv.hosted_invoice_url,
        created: inv.created
      })),
      customerId
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Billing failed' });
  }
});

export default router;
