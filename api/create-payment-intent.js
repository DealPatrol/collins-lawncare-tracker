import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { amount, jobId, customerId } = req.body;

  // Validate input
  if (!amount || amount < 0.50) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  try {
    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        jobId: jobId || 'unknown',
        customerId: customerId || 'unknown',
      },
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('[v0] Stripe error:', error.message);
    res.status(500).json({ error: error.message });
  }
}
