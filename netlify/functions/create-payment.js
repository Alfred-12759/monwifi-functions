const fetch = require('node-fetch');

exports.handler = async function(event) {
    console.log('Requête reçue: Méthode =', event.httpMethod);

    // 1. Vérifier méthode
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Méthode non autorisée. Utilisez POST.' })
        };
    }

    // 2. Parser le JSON
    let data;
    try {
        data = JSON.parse(event.body);
    } catch (error) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Requête invalide. Le corps doit être en JSON.' })
        };
    }

    // 3. Récupération des données
    const { amount, description, currency, client_name, ticket_type, callback_url } = data;

    // 4. Validation
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

    // 5. Clé API
    const secretKey = process.env.FEDAPAY_SECRET_KEY;
    if (!secretKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Clé secrète FedaPay non définie dans l’environnement.' })
        };
    }

    const reference = `ref-${Date.now()}`;
    const fullDescription = `${description} - ${reference}`;

    // 6. Construction du payload FedaPay
    const payload = {
        description: fullDescription,
        amount,
        currency: { iso: currency.toUpperCase() },
        callback_url,
        customer: {
            firstname: client_name,
            email: `${client_name.toLowerCase().replace(/ /g, '')}@monwifi.com`
        },
        metadata: {
            ticket_type
        }
    };

    console.log("Payload envoyé à FedaPay:", JSON.stringify(payload, null, 2));

    // 7. Requête FedaPay
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

        const result = await response.json();


        if (result.transaction && result.transaction.payment_url) {
    return {
        statusCode: 200,
        body: JSON.stringify({
            payment_url: result.transaction.payment_url,
            transaction_id: result.transaction.id,
            status: result.transaction.status
        })
    };
}


        if (!response.ok || !result.transaction || !result.transaction.payment_url) {
            console.error("Erreur FedaPay:", result);
            return {
                statusCode: response.status,
                body: JSON.stringify({
                    error: 'Réponse FedaPay incomplète ou invalide.',
                    details: result
                })
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                payment_url: result.transaction.payment_url,
                transaction_id: result.transaction.id,
                status: result.transaction.status
            })
        };
    } catch (error) {
        console.error("Erreur de communication:", error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Erreur lors de la communication avec FedaPay.', details: error.message })
        };
    }
};
