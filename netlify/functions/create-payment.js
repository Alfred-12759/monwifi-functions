// netlify/functions/create-payment.js

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
                error: 'Méthode non autorisée. Utilisez POST.',
                debug: { method: event.httpMethod }
            })
        };
    }

    let bodyData;
    try {
        bodyData = JSON.parse(event.body);
    } catch (err) {
        console.error('Erreur JSON parse:', err.message);
        return {
            statusCode: 400,
            body: JSON.stringify({ 
                error: 'Corps de requête invalide. JSON attendu.',
                debug: { rawBody: event.body }
            })
        };
    }

    const { amount, description, currency, callback_url } = bodyData;

    if (!amount || !description || !currency || !callback_url) {
        console.warn('Champs manquants:', { amount, description, currency, callback_url });
        return {
            statusCode: 400,
            body: JSON.stringify({ 
                error: 'Champs requis manquants.',
                debug: { received: bodyData }
            })
        };
    }

    const secretKey = 'sk_sandbox_tcHeGte0r-9orONZEH822msx'; // Remplace par TA CLÉ SECRÈTE sandbox
    const fedapayUrl = 'https://sandbox.fedapay.com/api/v1/transactions';

    try {
        const response = await fetch(fedapayUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${secretKey}`
            },
            body: JSON.stringify({
                transaction: {
                    amount,
                    description,
                    currency: { iso: currency },  // Format correct attendu par l’API
                    callback_url
                }
            })
        });

        const result = await response.json();

        console.log('Réponse Fedapay:', result);

        if (result.response && result.response.data && result.response.data.authorization_url) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    authorization_url: result.response.data.authorization_url,
                    debug: { fedapayResult: result }
                })
            };
        } else {
            console.error('Erreur : Réponse inattendue de Fedapay', result);
            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: 'Erreur dans la réponse Fedapay',
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
