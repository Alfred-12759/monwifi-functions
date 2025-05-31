// netlify/functions/create-payment.js

const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const publicKey = 'pk_sandbox_-vwdeEKjxyByK6ZfRiMaW3w8'; // ta clé sandbox
    const fedapayUrl = 'https://sandbox.fedapay.com/api/v1/transactions';

    const { amount, description, currency, callback_url } = JSON.parse(event.body);

    const payload = {
        transaction: {
            amount,
            description,
            currency,
            callback_url
        }
    };

    try {
        const response = await fetch(fedapayUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${publicKey}`
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.response && result.response.data && result.response.data.authorization_url) {
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
                    error: 'Erreur dans la réponse Fedapay',
                    details: result
                })
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Erreur lors de la création de la transaction',
                details: error.message
            })
        };
    }
};
