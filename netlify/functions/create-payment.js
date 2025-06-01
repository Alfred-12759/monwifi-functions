const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    console.log('Requête reçue: Méthode =', event.httpMethod);

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ 
                error: 'Méthode non autorisée. Utilisez POST.'
            })
        };
    }

    let bodyData;
    try {
        bodyData = JSON.parse(event.body);
    } catch (err) {
        return {
            statusCode: 400,
            body: JSON.stringify({ 
                error: 'Corps de requête invalide. JSON attendu.'
            })
        };
    }

    const { amount, description, currency, callback_url } = bodyData;

    if (!amount || !description || !currency || !callback_url) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: 'Paramètres manquants. Requis : amount, description, currency, callback_url.'
            })
        };
    }

    // 🚨 SANDBOX URL
    const fedapayUrl = 'https://sandbox.fedapay.com/v1/transactions';
    const secretKey = process.env.FEDAPAY_SECRET_KEY;

    if (!secretKey) {
        console.error('Clé secrète FedaPay manquante dans les variables d’environnement.');
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Configuration serveur invalide (clé secrète manquante).'
            })
        };
    }

    console.log('Clé API utilisée:', secretKey);

    try {
        const response = await fetch(fedapayUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${secretKey}`
            },
            body: JSON.stringify({
                transaction: {
                    amount,
                    description,
                    currency: { iso: currency },
                    callback_url
                }
            })
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('Erreur HTTP:', result);
            return {
                statusCode: response.status,
                body: JSON.stringify({
                    error: 'Erreur HTTP FedaPay',
                    details: result
                })
            };
        }

        console.log('Transaction créée, ID:', result.response?.data?.id);

        if (result.response?.data?.authorization_url) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    authorization_url: result.response.data.authorization_url,
                    transaction_id: result.response.data.id,
                    status: result.response.data.status
                })
            };
        } else {
            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: 'Réponse inattendue de FedaPay',
                    details: result
                })
            };
        }
    } catch (error) {
        console.error('Erreur FedaPay:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Erreur lors de la création de la transaction',
                details: error.message
            })
        };
    }
};
