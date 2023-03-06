
export const config = {
    api: {
        externalResolver: true,
    },
}

export default function handler(req, res) {
    const https = require('https');

    const options = {
        hostname: 'api.myarcticspa.com',
        port: 443,
        path: '/v2/spa/status',
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'X-API-KEY': process.env.ARCTIC_API_KEY,
        },
    };

    https.get(options, (res1) => {
        let body = "";

        res1.on("data", (chunk) => {
            body += chunk;
        });

        res1.on("end", () => {
            try {
                let json = JSON.parse(body);
                // do something with JSON
                sendmail(json.connected, json.temperatureF);
                sendtext(json.connected, json.temperatureF);
                res.status(200).
                    send({
                        connected: json.connected,
                        temperatureF: json.temperatureF,
                        body: req.body,
                        query: req.query,
                        cookies: req.cookies,
                    });
            } catch (error) {
                console.error(error.message);
                res.status(500).send({ error: 'json content error' });
            };
        });

    }).on("error", (error) => {
        console.error(error.message);
        res.status(500).send({ error: 'GET error' });
    });
}

function sendmail(connected, temp) {
    // using Twilio SendGrid's v3 Node.js Library
    // https://github.com/sendgrid/sendgrid-nodejs
    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(process.env.SENDGRID_API_PING_SPA2)
    const msg = {
        to: 'tom.mccollough@gmail.com', // Change to your recipient
        from: 'tom@tommccollough.com', // Change to your verified sender
        subject: `Spa is connected: ${connected}, temp is ${temp} deg. F`,
        text: 'and easy to do anywhere, even with Node.js',
        html: '<strong>and easy to do anywhere, even with Node.js</strong>',
    }
    sgMail
        .send(msg)
        .then(() => {
            console.log('Email sent')
        })
        .catch((error) => {
            console.error(error);
            console.log('email did not work');
        });
        console.log('email setup done');
}

function sendtext(connected, temp) {
    // Download the helper library from https://www.twilio.com/docs/node/install
    // Find your Account SID and Auth Token at twilio.com/console
    // and set the environment variables. See http://twil.io/secure
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const client = require('twilio')(accountSid, authToken);

    client.messages.create({
            body: `Spa is connected: ${connected}, temp is ${temp}`,
            from: '+18888207345',
            to: '+18016478498'
        })
        .then(message => console.log(`sms was successful ${message.sid}`));
    console.log('SMS setup done')
}