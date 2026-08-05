import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error('[v0] Webhook signature verification failed:', error.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        console.log('[v0] Payment succeeded:', paymentIntent.id);
        
        // TODO: Update job payment status in Firebase
        // const { jobId } = paymentIntent.metadata;
        // await updateJobPaymentStatus(jobId, 'paid', paymentIntent.id);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        console.log('[v0] Payment failed:', paymentIntent.id);
        
        // TODO: Log payment failure
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        console.log('[v0] Charge refunded:', charge.id);
        
        // TODO: Update job status to refunded
        break;
      }

      default:
        console.log(`[v0] Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('[v0] Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}
