import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe (requires VITE_STRIPE_PUBLIC_KEY in .env)
let stripePromise = null;

export const getStripe = () => {
  if (!stripePromise) {
    const key = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
    if (!key) {
      console.warn('[v0] Stripe public key not configured. See STRIPE_SETUP.md');
      return null;
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
};

// Create a payment intent for an invoice
export const createPaymentIntent = async (amount, jobId, customerId) => {
  try {
    const response = await fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // Convert to cents
        jobId,
        customerId,
      }),
    });

    if (!response.ok) throw new Error('Failed to create payment intent');
    const { clientSecret } = await response.json();
    return clientSecret;
  } catch (error) {
    console.error('[v0] Error creating payment intent:', error);
    return null;
  }
};

// Process payment with Stripe Elements
export const processPayment = async (stripe, elements, amount, jobId) => {
  if (!stripe || !elements) return null;

  try {
    const cardElement = elements.getElement('card');
    
    // Create payment intent
    const clientSecret = await createPaymentIntent(amount, jobId);
    if (!clientSecret) return null;

    // Confirm payment
    const { paymentIntent, error } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: { name: 'Customer' },
      },
    });

    if (error) {
      console.error('[v0] Payment failed:', error.message);
      return { success: false, error: error.message };
    }

    if (paymentIntent.status === 'succeeded') {
      console.log('[v0] Payment succeeded:', paymentIntent.id);
      return { success: true, paymentId: paymentIntent.id };
    }

    return { success: false, error: 'Payment processing incomplete' };
  } catch (error) {
    console.error('[v0] Error processing payment:', error);
    return { success: false, error: error.message };
  }
};

// Record payment in job
export const recordPayment = (job, paymentId, amount) => {
  return {
    ...job,
    payments: [
      ...(job.payments || []),
      {
        id: paymentId,
        amount,
        date: new Date().toISOString(),
        status: 'completed',
      },
    ],
    lastPayment: new Date().toISOString(),
  };
};
