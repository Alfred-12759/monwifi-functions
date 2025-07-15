const fetch = require('node-fetch');

exports.handler = async function(event) {
    console.log('Requête reçue: Méthode =', event.httpMethod);

    // Vérifier que la méthode est POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({
                error: 'Méthode non autorisée. Utilisez POST.'
            })
        };
    }

    // Parser le corps de la requête
    let data;
    try {
        data = JSON.parse(event.body);
    } catch (error) {
        console.error('Erreur de parsing JSON:', error);
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: 'Requête invalide. Le corps doit être en JSON.'
            })
        };
    }

    const { amount, description, currency, client_name, ticket_type } = data;

    // Vérification des champs requis
    if (
        typeof amount !== 'number' || amount <= 0 ||
        typeof description !== 'string' || !description.trim() ||
        typeof currency !== 'string' || !currency.trim() ||
        typeof client_name !== 'string' || !client_name.trim() ||
        typeof ticket_type !== 'string' || !ticket_type.trim()
    ) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: 'Champs requis manquants ou invalides. Requis : amount, description, currency, client_name, ticket_type.'
            })
        };
    }

    // Clé secrète FedaPay
    const secretKey = process.env.FEDAPAY_SECRET_KEY;
    if (!secretKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Clé secrète FedaPay non définie dans l’environnement.'
            })
        };
    }

    // Générer une référence unique
    const reference = `ref-${Date.now()}`;

    // Encoder les infos dans l'URL de callback
    const encodedClient = encodeURIComponent(client_name);
    const encodedType = encodeURIComponent(ticket_type);
    const callback_url = `https://palagames.online/success.php?client_name=${encodedClient}&ticket_type=${encodedType}`;

    // Préparer le payload
    const payload = {
        description: `${description.trim()} - ${reference}`,
        amount,
        currency: { iso: currency.trim().toUpperCase() },
        callback_url
    };

    console.log('Payload envoyé à FedaPay:', payload);

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

        const responseText = await response.text();
        let result;

        try {
            result = JSON.parse(responseText);
        } catch (error) {
            console.error('Réponse non JSON de FedaPay:', responseText);
            return {
                statusCode: 502,
                body: JSON.stringify({
                    error: 'Réponse non JSON reçue de FedaPay.',
                    details: responseText
                })
            };
        }

        if (!response.ok) {
            console.error('Erreur HTTP FedaPay:', result);
            return {
                statusCode: response.status,
                body: JSON.stringify({
                    error: 'Erreur lors de la création de la transaction.',
                    details: result
                })
            };
        }

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
        console.error('Erreur de communication avec FedaPay:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Erreur lors de la création de la transaction.',
                details: error.message
            })
        };
    }
};
