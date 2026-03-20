const axios = require('axios');

// Configuration - adjust as needed
const BASE = process.env.PAYMENT_TEST_BASE || 'http://localhost:3000';

async function run() {
  try {
    console.log('1) Initiating payment...');
    const initBody = {
      amount: 1000,
      currency: 'NGN',
      email: 'test@example.com',
      name: 'Test User',
      userId: 'user-123',
      method: 'card',
    };

    const initRes = await axios.post(`${BASE}/payment/initiate`, initBody, { timeout: 10000 });
    console.log('initiate response:', initRes.data);

    // determine tx_ref from response (different providers / wrappers may return under different paths)
    const txRef = (initRes.data && (initRes.data.data?.tx_ref || initRes.data.tx_ref || initRes.data.data?.data?.tx_ref || initRes.data.data?.reference)) || initRes.data?.tx_ref || `tx-${Date.now()}`;
    console.log('detected tx_ref:', txRef);

    console.log('2) Simulating webhook (marking transaction successful)...');
    const webhookPayload = {
      event: 'charge.completed',
      data: {
        tx_ref: txRef,
        status: 'successful',
        amount: initBody.amount,
        currency: initBody.currency,
        customer: {
          email: initBody.email,
          id: initBody.userId,
        },
        flw_ref: 'SIM-FLW-REF-0001',
      },
    };

    // Send webhook
    const webhookRes = await axios.post(`${BASE}/payment/webhook`, webhookPayload, { timeout: 10000 });
    console.log('webhook response:', webhookRes.data);

    console.log('3) Fetching payment logs...');
    const logsRes = await axios.get(`${BASE}/payment/logs`, { params: { page: 1, limit: 20, userId: initBody.userId } });
    console.log('logs response:', JSON.stringify(logsRes.data, null, 2));

    console.log('Test complete');
  } catch (err) {
    if (err.response) {
      console.error('HTTP error:', err.response.status, err.response.data);
    } else {
      console.error('Error:', err.message);
    }
    process.exitCode = 1;
  }
}

run();
