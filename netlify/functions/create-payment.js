const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    console.log('Requête reçue: Méthode =', event.httpMethod);

    // Autoriser uniquement POST
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

    // Vérifier que les champs obligatoires sont bien présents
    if (
        typeof amount !== 'number' || amount <= 0 ||
        typeof description !== 'string' || !description.trim() ||
        typeof currency !== 'string' || !currency.trim() ||
        typeof callback_url !== 'string' || !callback_url.trim()
    ) {
        console.error('Paramètres manquants ou invalides:', { amount, description, currency, callback_url });
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: 'Paramètres manquants ou invalides. Requis : amount (number > 0), description, currency, callback_url.'
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
        description: description.trim(),
        amount,
        currency: { iso: currency.trim().toUpperCase() },
        callback_url: callback_url.trim()
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

        if (transactionData?.payment_url) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    payment_url: transactionData.payment_url,
                    transaction_id: transactionData.id,
                    status: transactionData.status
                })
            };
        } else {
            console.error('Réponse FedaPay sans payment_url:', result);
            return {
                statusCode: 502,
                body: JSON.stringify({
                    error: 'Réponse FedaPay invalide ou incomplète.',
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
