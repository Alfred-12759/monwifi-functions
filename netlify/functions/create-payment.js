const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    console.log('Requête reçue:', {
        method: event.httpMethod,
        body: event.body
    });

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

    const fedapayUrl = 'https://sandbox.fedapay.com/v1/transactions'; // vérifie la doc officielle

    const payload = {
        transaction: {
            amount,
            description,
            currency: { iso: currency },
            callback_url
        }
    };

    try {
        const response = await fetch(fedapayUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': 'sk_sandbox_tcHeGte0r-9orONZEH822msx' // <-- remplace par TA clé secrète
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erreur HTTP:', errorText);
            return {
                statusCode: response.status,
                body: JSON.stringify({
                    error: 'Erreur HTTP FedaPay',
                    details: errorText
                })
            };
        }

        const result = await response.json();

        console.log('Réponse FedaPay:', result);

        if (result?.response?.data?.authorization_url) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    authorization_url: result.response.data.authorization_url
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
        console.error('Erreur FedaPay:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Erreur lors de la création de la transaction',
                details: error.message
            })
        };
    }
};
