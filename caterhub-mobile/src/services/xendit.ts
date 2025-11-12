import axios from 'axios';

const XENDIT_BASE_URL = 'https://api.xendit.co';

// Get keys from environment variables
const PUBLIC_KEY = process.env.EXPO_PUBLIC_XENDIT_PUBLIC_KEY || '';
const SECRET_KEY = process.env.XENDIT_SECRET_KEY || '';

// Validate that public key is set
if (!PUBLIC_KEY) {
  console.error('⚠️ Xendit Public Key is missing!');
  console.error('⚠️ Please set EXPO_PUBLIC_XENDIT_PUBLIC_KEY in your .env file');
  console.error('⚠️ Get your keys from: https://dashboard.xendit.co/settings/developers');
  console.error('⚠️ Example: EXPO_PUBLIC_XENDIT_PUBLIC_KEY=xnd_public_...');
}

/**
 * Helper function to create base64 encoded auth header
 * Xendit uses HTTP Basic Auth with secret key as username and empty password
 */
function createAuthHeader(key: string): string {
  if (!key) {
    throw new Error('Xendit API key is missing. Please set EXPO_PUBLIC_XENDIT_PUBLIC_KEY in your .env file');
  }
  // Xendit expects: Basic base64(secret_key:)
  return `Basic ${global.btoa(key + ':')}`;
}

/**
 * Xendit Payment Service
 * Handles payment processing for CaterHub bookings using Xendit Invoice API
 */

export interface XenditInvoiceData {
  external_id: string; // Unique identifier (use bookingId)
  amount: number; // Amount in IDR/PHP (not in cents like PayMongo)
  currency: 'PHP';
  description: string;
  invoice_duration?: number; // Invoice expiry in seconds (default: 86400 = 24 hours)
  customer?: {
    given_names?: string;
    surname?: string;
    email?: string;
    mobile_number?: string;
  };
  success_redirect_url?: string;
  failure_redirect_url?: string;
  payment_methods?: string[]; // ['GCASH', 'PAYMAYA', 'OVO', 'DANA', etc.]
  metadata?: {
    bookingId?: string;
    userId?: string;
    serviceId?: string;
    [key: string]: any;
  };
}

export interface XenditInvoice {
  id: string;
  external_id: string;
  user_id: string;
  status: 'PENDING' | 'PAID' | 'SETTLED' | 'EXPIRED';
  merchant_name: string;
  amount: number;
  currency: string;
  description: string;
  invoice_url: string; // Checkout URL for customer
  expiry_date: string;
  created: string;
  updated: string;
  payment_method?: string;
  payment_channel?: string;
  payment_destination?: string;
  metadata?: any;
}

export interface XenditEWalletData {
  reference_id: string; // Unique identifier
  currency: 'PHP';
  amount: number;
  checkout_method: 'ONE_TIME_PAYMENT';
  channel_code: 'PH_GCASH' | 'PH_PAYMAYA' | 'PH_GRABPAY';
  channel_properties: {
    success_redirect_url: string;
    failure_redirect_url: string;
  };
  customer_id?: string;
  metadata?: {
    bookingId?: string;
    userId?: string;
    [key: string]: any;
  };
}

export interface XenditEWalletCharge {
  id: string;
  reference_id: string;
  currency: string;
  amount: number;
  channel_code: string;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'VOIDED';
  charge_amount: number;
  capture_amount?: number;
  checkout_method: string;
  created: string;
  updated: string;
  metadata?: any;
  actions?: {
    desktop_web_checkout_url?: string;
    mobile_web_checkout_url?: string;
    mobile_deeplink_checkout_url?: string;
    qr_checkout_string?: string;
  };
}

/**
 * Create an Invoice (Recommended for multiple payment methods)
 * This creates a checkout page that supports multiple payment methods
 */
export async function createInvoice(data: XenditInvoiceData): Promise<XenditInvoice> {
  if (!PUBLIC_KEY) {
    throw new Error('Xendit Public Key is not configured. Please set EXPO_PUBLIC_XENDIT_PUBLIC_KEY in your .env file. Get your keys from: https://dashboard.xendit.co/settings/developers');
  }
  
  try {
    const response = await axios.post(
      `${XENDIT_BASE_URL}/v2/invoices`,
      {
        external_id: data.external_id,
        amount: data.amount,
        currency: data.currency,
        description: data.description,
        invoice_duration: data.invoice_duration || 86400, // 24 hours default
        customer: data.customer,
        success_redirect_url: data.success_redirect_url,
        failure_redirect_url: data.failure_redirect_url,
        payment_methods: data.payment_methods || ['GCASH', 'PAYMAYA', 'BPI', 'BDO', 'UNIONBANK'],
        metadata: data.metadata || {},
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: createAuthHeader(PUBLIC_KEY),
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Xendit createInvoice error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to create invoice');
  }
}

/**
 * Create eWallet Charge (For specific eWallet payments)
 * Use this for direct eWallet integration (GCash, PayMaya, GrabPay)
 */
export async function createEWalletCharge(data: XenditEWalletData): Promise<XenditEWalletCharge> {
  if (!PUBLIC_KEY) {
    throw new Error('Xendit Public Key is not configured. Please set EXPO_PUBLIC_XENDIT_PUBLIC_KEY in your .env file');
  }
  
  try {
    const response = await axios.post(
      `${XENDIT_BASE_URL}/ewallets/charges`,
      {
        reference_id: data.reference_id,
        currency: data.currency,
        amount: data.amount,
        checkout_method: data.checkout_method,
        channel_code: data.channel_code,
        channel_properties: data.channel_properties,
        customer_id: data.customer_id,
        metadata: data.metadata || {},
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: createAuthHeader(PUBLIC_KEY),
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Xendit createEWalletCharge error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to create eWallet charge');
  }
}

/**
 * Get Invoice by ID
 */
export async function getInvoice(invoiceId: string): Promise<XenditInvoice> {
  try {
    const response = await axios.get(
      `${XENDIT_BASE_URL}/v2/invoices/${invoiceId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: createAuthHeader(PUBLIC_KEY),
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Xendit getInvoice error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to retrieve invoice');
  }
}

/**
 * Get Invoice by External ID
 */
export async function getInvoiceByExternalId(externalId: string): Promise<XenditInvoice[]> {
  try {
    const response = await axios.get(
      `${XENDIT_BASE_URL}/v2/invoices?external_id=${externalId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: createAuthHeader(PUBLIC_KEY),
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Xendit getInvoiceByExternalId error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to retrieve invoice');
  }
}

/**
 * Get eWallet Charge by ID
 */
export async function getEWalletCharge(chargeId: string): Promise<XenditEWalletCharge> {
  try {
    const response = await axios.get(
      `${XENDIT_BASE_URL}/ewallets/charges/${chargeId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: createAuthHeader(PUBLIC_KEY),
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Xendit getEWalletCharge error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to retrieve eWallet charge');
  }
}

/**
 * Helper: Convert payment method to Xendit channel code
 */
export function getXenditChannelCode(paymentMethod: string): string {
  switch (paymentMethod.toLowerCase()) {
    case 'gcash':
      return 'PH_GCASH';
    case 'paymaya':
      return 'PH_PAYMAYA';
    case 'grabpay':
    case 'grab_pay':
      return 'PH_GRABPAY';
    default:
      throw new Error(`Unsupported payment method: ${paymentMethod}`);
  }
}

/**
 * Helper: Get supported payment methods for invoices
 */
export function getSupportedPaymentMethods(): string[] {
  return [
    'GCASH',
    'PAYMAYA', 
    'BPI',
    'BDO',
    'UNIONBANK',
    'RCBC',
    'CHINABANK',
    'DRAGONPAY',
    '7ELEVEN',
    'CEBUANA',
    'MLHUILLIER'
  ];
}

/**
 * Helper: Format amount for Xendit (no conversion needed, uses actual amount)
 */
export function toXenditAmount(phpAmount: number): number {
  return Math.round(phpAmount * 100) / 100; // Round to 2 decimal places
}

/**
 * Helper: Convert Xendit amount to display format
 */
export function fromXenditAmount(amount: number): number {
  return amount;
}
