
[]
// Simple Base64 encoder for Basic Auth
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
const btoa = (input = '') => {
  let str = input;
  let output = '';
  for (let block = 0, charCode, i = 0, map = chars;
    str.charAt(i | 0) || (map = '=', i % 1);
    output += map.charAt(63 & block >> 8 - i % 1 * 8)) {
    charCode = str.charCodeAt(i += 3 / 4);
    if (charCode > 0xFF) {
      throw new Error("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
    }
    block = block << 8 | charCode;
  }
  return output;
};

import { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } from '../config/secrets';

export const createRazorpayOrder = async (amountInINR) => {
  const keyId = RAZORPAY_KEY_ID;
  const keySecret = RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret || keyId === "YOUR_KEY_ID") {
    console.warn("Using Razorpay without Order ID. Please set Keys in .env to use Order ID.");
    return null;
  }

  const amountInPaise = amountInINR * 100;
  const auth = 'Basic ' + btoa(`${keyId}:${keySecret}`);

  try {
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': auth
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `receipt_${new Date().getTime()}`,
        payment_capture: 1
      })
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.description);
    }
    return data.id; // The order_id
  } catch (error) {
    console.error("Failed to create Razorpay order:", error);
    throw error;
  }
};
