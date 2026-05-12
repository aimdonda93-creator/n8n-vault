const crypto = require('crypto');

const RZP_KEY_SECRET = 'zOZJiT3ud3GjFNYAt10fY72t';
const DRIVE_LINK = 'https://drive.google.com/file/d/1F4T9ud2QEDhppKNivsJ8DLQ3lX2ngz-I/view?usp=sharing';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing payment parameters' }) };
  }

  const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSig = crypto
    .createHmac('sha256', RZP_KEY_SECRET)
    .update(payload)
    .digest('hex');

  if (expectedSig !== razorpay_signature) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Payment verification failed. Invalid signature.' }),
    };
  }

  // Generate a time-bound access token (valid 72 hours)
  const expiresAt = Date.now() + 72 * 60 * 60 * 1000;
  const tokenPayload = `${razorpay_payment_id}:${expiresAt}`;
  const tokenSig = crypto
    .createHmac('sha256', RZP_KEY_SECRET)
    .update(tokenPayload)
    .digest('hex');
  const token = Buffer.from(`${tokenPayload}:${tokenSig}`).toString('base64url');

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      success: true,
      token,
      driveLink: Buffer.from(DRIVE_LINK).toString('base64'),
      paymentId: razorpay_payment_id,
    }),
  };
};
