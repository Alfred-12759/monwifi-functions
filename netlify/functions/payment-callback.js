exports.handler = async function(event, context) {
    const params = event.queryStringParameters;

    const transactionId = params?.id;
    const status = params?.status;

    if (!transactionId || !status) {
        return {
            statusCode: 400,
            body: 'Paramètres manquants dans l’URL (id ou status).'
        };
    }

    // Ici, tu pourrais enregistrer dans ta base, envoyer un mail, etc.
    console.log(`Callback reçu : Transaction ${transactionId}, Statut = ${status}`);

    // Tu peux aussi rediriger l’utilisateur vers une page personnalisée
    return {
        statusCode: 302,
        headers: {
            Location: `https://monwifi.byethost7.com/success.php?transaction_id=${transactionId}&status=${status}
`
        },
        body: ''
    };
};
