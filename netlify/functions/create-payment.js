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

    if (typeof currency !== 'string' || currency.trim() === '') {
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: 'Paramètre "currency" invalide. Une chaîne comme "XOF" est attendue.'
            })
        };
    }

    const fedapayUrl = 'https://sandbox-api.fedapay.com/v1/transactions';
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
                    amount: amount,
                    description: description,
                    currency_iso: currency,  // CHANGEMENT IMPORTANT ICI
                    callback_url: callback_url
                }
            })
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('Erreur HTTP FedaPay:', result);
            return {
                statusCode: response.status,
                body: JSON.stringify({
                    error: 'Erreur HTTP FedaPay',
                    details: result
                })
            };
        }

        const transactionData = result?.data;

        if (transactionData && transactionData.authorization_url) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    authorization_url: transactionData.authorization_url,
                    transaction_id: transactionData.id,
                    status: transactionData.status
                })
            };
        } else {
            console.error('Réponse inattendue de FedaPay:', result);
            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: 'Réponse inattendue de FedaPay',
                    details: result
                })
            };
        }
    } catch (error) {
        console.error('Erreur FedaPay (exception):', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Erreur lors de la création de la transaction',
                details: error.message
            })
        };
    }
};
