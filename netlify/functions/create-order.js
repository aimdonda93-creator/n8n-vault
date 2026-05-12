const RZP_KEY_ID = 'rzp_test_SoKtamX35bBzmX';
const RZP_KEY_SECRET = 'zOZJiT3ud3GjFNYAt10fY72t';
const AMOUNT_PAISE = 39900; // ₹399 (displayed as ₹499 on site)

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const credentials = Buffer.from(`${RZP_KEY_ID}:${RZP_KEY_SECRET}`).toString('base64');

  try {
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: AMOUNT_PAISE,
        currency: 'INR',
        receipt: `n8nv_${Date.now()}`,
        notes: { product: 'N8N Vault - 10000+ Workflow Templates' },
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return {
        statusCode: 502,
        body: JSON.stringify({ error: 'Failed to create order', details: err }),
      };
    }

    const order = await response.json();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: RZP_KEY_ID,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error', message: err.message }),
    };
  }
};
