// netlify/functions/create-payment.js

const axios = require('axios');

exports.handler = async function(event, context) {
    console.log('👉 Requête reçue:', event.body);

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Méthode non autorisée. Utilisez POST.' })
        };
    }

    let data;
    try {
        data = JSON.parse(event.body);
    } catch (error) {
        console.error('❌ Erreur parsing JSON:', error);
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Format JSON invalide.' })
        };
    }

    const { amount, description, currency, callback_url } = data;

    if (!amount || !description || !currency || !callback_url) {
        console.warn('⚠️ Paramètres manquants:', { amount, description, currency, callback_url });
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Paramètres manquants. Requis : amount, description, currency, callback_url.' })
        };
    }

    const secretKey = process.env.FEDAPAY_SECRET_KEY;
    console.log('🔑 FEDAPAY_SECRET_KEY:', secretKey ? '✅ défini' : '❌ NON défini');

    if (!secretKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Clé secrète FedaPay non configurée.' })
        };
    }

    const fedapayUrl = 'https://api.fedapay.com/v1/transactions';

    const payload = {
        transaction: {
            amount,
            description,
            currency,
            callback_url
        }
    };

    console.log('📦 Données envoyées à FedaPay:', JSON.stringify(payload));

    try {
        const response = await axios.post(fedapayUrl, payload, {
            headers: {
                Authorization: `Bearer ${secretKey}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Réponse FedaPay:', response.data);

        return {
            statusCode: 200,
            body: JSON.stringify(response.data)
        };
    } catch (error) {
        console.error('❌ Erreur FedaPay:', error.response ? error.response.data : error.message);

        return {
            statusCode: error.response ? error.response.status : 500,
            body: JSON.stringify({
                error: 'Erreur lors de la création de la transaction.',
                details: error.response ? error.response.data : error.message
            })
        };
    }
};
