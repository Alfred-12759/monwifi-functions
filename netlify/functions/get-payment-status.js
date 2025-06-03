const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Méthode non autorisée. Utilisez GET.' })
        };
    }

    const params = event.queryStringParameters;
    const transactionId = params?.transaction_id;

    if (!transactionId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Paramètre manquant : transaction_id' })
        };
    }

    const fedapayUrl = `https://sandbox-api.fedapay.com/v1/transactions/${transactionId}`;
    const secretKey = process.env.FEDAPAY_SECRET_KEY;

    try {
        const response = await fetch(fedapayUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${secretKey}`
            }
        });

        const rawText = await response.text();
        let result;
        try {
            result = JSON.parse(rawText);
        } catch (err) {
            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: 'Réponse FedaPay non JSON',
                    details: rawText
                })
            };
        }

        if (!response.ok) {
            return {
                statusCode: response.status,
                body: JSON.stringify({
                    error: 'Erreur HTTP FedaPay',
                    details: result
                })
            };
        }

        const transaction = result['v1/transaction'];

        return {
            statusCode: 200,
            body: JSON.stringify({
                transaction_id: transaction.id,
                status: transaction.status,
                amount: transaction.amount,
                description: transaction.description,
                created_at: transaction.created_at,
                updated_at: transaction.updated_at
            })
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Erreur interne lors de la récupération du statut',
                details: error.message
            })
        };
    }
};
