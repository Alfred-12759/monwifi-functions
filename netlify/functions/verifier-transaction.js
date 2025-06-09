const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  const { id } = event.queryStringParameters;

  if (!id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'transaction_id manquant' })
    };
  }

  try {
    const response = await fetch(`https://sandbox-api.fedapay.com/v1/transactions/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer VOTRE_CLE_API_SANDBOX',
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    const transaction = result?.data;

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: transaction.status, // 'approved', 'declined', etc.
        amount: transaction.amount,
        customer: transaction.customer
      })
    };
  } catch (error) {
    console.error('Erreur API FedaPay :', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erreur serveur FedaPay' })
    };
  }
};
