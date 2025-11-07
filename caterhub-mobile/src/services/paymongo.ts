import axios from 'axios';

const PAYMONGO_BASE_URL = 'https://api.paymongo.com/v1';

// Get keys from environment variables
const PUBLIC_KEY = process.env.EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY || '';
const SECRET_KEY = process.env.PAYMONGO_SECRET_KEY || '';

/**
 * Helper function to create base64 encoded auth header
 * React Native compatible (uses global btoa)
 * PayMongo requires the key to be encoded with a trailing colon
 */
function createAuthHeader(key: string): string {
  // PayMongo expects: Basic base64(key:)
  // The colon at the end is required by PayMongo's API
  return `Basic ${global.btoa(key + ':')}`;
}

/**
 * PayMongo Payment Service
 * Handles payment processing for CaterHub bookings
 */

export interface PaymentIntentData {
  amount: number; // Amount in centavos (e.g., 10000 = ₱100.00)
  currency: 'PHP';
  description: string;
  statement_descriptor?: string;
  metadata?: {
    bookingId?: string;
    userId?: string;
    serviceId?: string;
    [key: string]: any;
  };
}

export interface PaymentMethodData {
  type: 'gcash' | 'grab_pay' | 'paymaya' | 'card';
  details?: {
    card_number?: string;
    exp_month?: number;
    exp_year?: number;
    cvc?: string;
  };
  billing?: {
    name: string;
    email: string;
    phone: string;
  };
}

export interface PayMongoPaymentIntent {
  id: string;
  type: 'payment_intent';
  attributes: {
    amount: number;
    currency: string;
    description: string;
    statement_descriptor: string;
    status: 'awaiting_payment_method' | 'awaiting_next_action' | 'processing' | 'succeeded' | 'failed';
    client_key: string;
    next_action?: {
      type: string;
      redirect?: {
        url: string;
        return_url: string;
      };
    };
    payment_method_allowed: string[];
    payments: any[];
    metadata: any;
    created_at: number;
    updated_at: number;
  };
}

export interface PayMongoPaymentMethod {
  id: string;
  type: 'payment_method';
  attributes: {
    type: string;
    billing: any;
    details?: any;
  };
}

/**
 * Create a Payment Intent
 * This is the first step in the payment flow
 */
export async function createPaymentIntent(data: PaymentIntentData): Promise<PayMongoPaymentIntent> {
  try {
    const response = await axios.post(
      `${PAYMONGO_BASE_URL}/payment_intents`,
      {
        data: {
          attributes: {
            amount: data.amount,
            currency: data.currency,
            description: data.description,
            statement_descriptor: data.statement_descriptor || 'CaterHub Booking',
            payment_method_allowed: ['gcash', 'grab_pay', 'paymaya', 'card'],
            metadata: data.metadata || {},
          },
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: createAuthHeader(PUBLIC_KEY),
        },
      }
    );

    return response.data.data;
  } catch (error: any) {
    console.error('PayMongo createPaymentIntent error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.errors?.[0]?.detail || 'Failed to create payment intent');
  }
}

/**
 * Create a Payment Method (for GCash, GrabPay, Maya)
 */
export async function createPaymentMethod(data: PaymentMethodData): Promise<PayMongoPaymentMethod> {
  try {
    const response = await axios.post(
      `${PAYMONGO_BASE_URL}/payment_methods`,
      {
        data: {
          attributes: {
            type: data.type,
            details: data.details,
            billing: data.billing,
          },
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: createAuthHeader(PUBLIC_KEY),
        },
      }
    );

    return response.data.data;
  } catch (error: any) {
    console.error('PayMongo createPaymentMethod error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.errors?.[0]?.detail || 'Failed to create payment method');
  }
}

/**
 * Attach Payment Method to Payment Intent
 */
export async function attachPaymentIntent(
  paymentIntentId: string,
  paymentMethodId: string,
  returnUrl?: string
): Promise<PayMongoPaymentIntent> {
  try {
    const response = await axios.post(
      `${PAYMONGO_BASE_URL}/payment_intents/${paymentIntentId}/attach`,
      {
        data: {
          attributes: {
            payment_method: paymentMethodId,
            return_url: returnUrl || 'https://your-app.com/payment/success',
          },
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: createAuthHeader(PUBLIC_KEY),
        },
      }
    );

    return response.data.data;
  } catch (error: any) {
    console.error('PayMongo attachPaymentIntent error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.errors?.[0]?.detail || 'Failed to attach payment method');
  }
}

/**
 * Retrieve Payment Intent status
 */
export async function getPaymentIntent(paymentIntentId: string): Promise<PayMongoPaymentIntent> {
  try {
    const response = await axios.get(
      `${PAYMONGO_BASE_URL}/payment_intents/${paymentIntentId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: createAuthHeader(PUBLIC_KEY),
        },
      }
    );

    return response.data.data;
  } catch (error: any) {
    console.error('PayMongo getPaymentIntent error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.errors?.[0]?.detail || 'Failed to retrieve payment intent');
  }
}

/**
 * Create a Payment Source (for GCash, GrabPay, PayMaya)
 * Alternative to Payment Intent flow
 */
export async function createSource(
  amount: number,
  type: 'gcash' | 'grab_pay' | 'paymaya',
  description: string,
  redirectUrl: { success: string; failed: string },
  metadata?: any
) {
  try {
    const response = await axios.post(
      `${PAYMONGO_BASE_URL}/sources`,
      {
        data: {
          attributes: {
            amount,
            redirect: redirectUrl,
            type,
            currency: 'PHP',
            description,
            statement_descriptor: 'CaterHub',
            metadata: metadata || {},
          },
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: createAuthHeader(PUBLIC_KEY),
        },
      }
    );

    return response.data.data;
  } catch (error: any) {
    console.error('PayMongo createSource error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.errors?.[0]?.detail || 'Failed to create payment source');
  }
}

/**
 * Helper: Convert PHP amount to centavos
 */
export function toPayMongoAmount(phpAmount: number): number {
  return Math.round(phpAmount * 100);
}

/**
 * Helper: Convert centavos to PHP amount
 */
export function fromPayMongoAmount(centavos: number): number {
  return centavos / 100;
}

/**
 * Retrieve Payment Source status
 */
export async function getSource(sourceId: string) {
  try {
    const response = await axios.get(
      `${PAYMONGO_BASE_URL}/sources/${sourceId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: createAuthHeader(PUBLIC_KEY),
        },
      }
    );

    return response.data.data;
  } catch (error: any) {
    console.error('PayMongo getSource error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.errors?.[0]?.detail || 'Failed to retrieve payment source');
  }
}
