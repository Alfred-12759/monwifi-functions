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
        console.error('Erreur de parsing JSON:', err);
        return {
            statusCode: 400,
            body: JSON.stringify({ 
                error: 'Corps de requête invalide. JSON attendu.'
            })
        };
    }

    const { amount, description, currency, callback_url } = bodyData;

    if (!amount || !description || !currency || !callback_url) {
        console.error('Paramètres manquants:', { amount, description, currency, callback_url });
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: 'Paramètres manquants. Requis : amount, description, currency, callback_url.'
            })
        };
    }

    const fedapayUrl = 'https://sandbox-api.fedapay.com/v1/transactions';
    const secretKey = process.env.FEDAPAY_SECRET_KEY;

    if (!secretKey) {
        console.error('Clé secrète FedaPay manquante.');
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Configuration serveur invalide (clé secrète manquante).'
            })
        };
    }

    const payload = {
        transaction: {
            amount: {
                amount,      // on encapsule ici
                currency     // et ici
            },
            description,
            callback_url
        }
    };

    console.log('Payload envoyé à FedaPay:', JSON.stringify(payload, null, 2));

    try {
        const response = await fetch(fedapayUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${secretKey}`
            },
            body: JSON.stringify(payload)
        });

        const rawResponseText = await response.text();
        console.log('Réponse brute FedaPay:', rawResponseText);

        let result;
        try {
            result = JSON.parse(rawResponseText);
        } catch (jsonError) {
            console.error('Erreur parsing réponse JSON:', jsonError);
            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: 'Réponse non JSON reçue de FedaPay',
                    details: rawResponseText
                })
            };
        }

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
            console.error('Réponse inattendue:', result);
            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: 'Réponse inattendue de FedaPay',
                    details: result
                })
            };
        }
    } catch (error) {
        console.error('Erreur lors de la requête FedaPay:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Erreur lors de la création de la transaction',
                details: error.message
            })
        };
    }
};
