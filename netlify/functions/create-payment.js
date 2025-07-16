const fetch = require('node-fetch');

exports.handler = async function(event) {
    console.log('🔵 Requête reçue: Méthode =', event.httpMethod);

    // 1. Vérifier la méthode
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Méthode non autorisée. Utilisez POST.' })
        };
    }

    // 2. Parse le body
    let data;
    try {
        data = JSON.parse(event.body);
    } catch (error) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Requête invalide. Le corps doit être en JSON.' })
        };
    }

    const { amount, description, currency, client_name, ticket_type, callback_url } = data;

    // 3. Valider les champs
    if (
        typeof amount !== 'number' || amount <= 0 ||
        typeof description !== 'string' || !description.trim() ||
        typeof currency !== 'string' || !currency.trim() ||
        typeof client_name !== 'string' || !client_name.trim() ||
        typeof ticket_type !== 'string' || !ticket_type.trim() ||
        typeof callback_url !== 'string' || !callback_url.trim()
    ) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: 'Champs requis manquants ou invalides. Requis : amount, description, currency, client_name, ticket_type, callback_url.'
            })
        };
    }

    // 4. Clé secrète
    const secretKey = process.env.FEDAPAY_SECRET_KEY;
    if (!secretKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Clé secrète FedaPay non définie dans l’environnement.' })
        };
    }

    // 5. Référence et callback avec infos utilisateur
    const reference = `ref-${Date.now()}`;
    const full_callback_url = `${callback_url}?client_name=${encodeURIComponent(client_name)}&ticket_type=${encodeURIComponent(ticket_type)}`;

    // 6. Préparer le payload FedaPay
    const payload = {
    description: `${description.trim()} - ${reference}`,
    amount,
    currency: { iso: currency.trim().toUpperCase() },
    callback_url,
    customer: {
        firstname: client_name
    }
};


    console.log('🟡 Payload envoyé à FedaPay:', payload);

    try {
        const response = await fetch('https://sandbox-api.fedapay.com/v1/transactions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${secretKey}`
            },
            body: JSON.stringify(payload)
        });

        const resultText = await response.text();
        let result;
        try {
            result = JSON.parse(resultText);
        } catch (e) {
            console.error('Réponse non JSON:', resultText);
            return {
                statusCode: 502,
                body: JSON.stringify({ error: 'Réponse non JSON reçue de FedaPay.', raw: resultText })
            };
        }

        // 7. Vérifier si paiement ok
        const transaction = result.transaction;
        if (transaction && transaction.payment_url) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    payment_url: transaction.payment_url,
                    transaction_id: transaction.id,
                    status: transaction.status
                })
            };
        } else {
            return {
                statusCode: 502,
                body: JSON.stringify({
                    error: 'Réponse FedaPay incomplète ou invalide.',
                    details: result
                })
            };
        }

    } catch (error) {
        console.error('❌ Erreur lors de la requête:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Erreur interne lors de la création de la transaction.',
                details: error.message
            })
        };
    }
};
