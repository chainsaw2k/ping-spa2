import { stat } from 'fs';

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

    let date = new Date();
    let str = date.toUTCString();
    let alertID = date.valueOf();

    console.log(`STARTING ${str} ============================================`)
    console.log('VERCEL_URL', process.env.VERCEL_URL)
    console.log('VERCEL_REGION', process.env.VERCEL_REGION)

    https.get(options, (res1) => {
        let body = "";

        res1.on("data", (chunk) => {
            body += chunk;
        });

        res1.on("end", async () => {
            try {
                let json = JSON.parse(body);
                let state = json.connected ? "ONLINE" : "OFFLINE";
                await sendmail(state, json.temperatureF, str);
                await sendtext(state, json.temperatureF, str);
                if (!json.connected) {
                    // alert grafana. maybe prolly should emit status instead, and let grafana do the alerting based upon SLO technology. but for now will do this every single time i get a failure
                    await alertGrafanaOnCall(alertID, str);
                }
                
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
    console.log('handler done')
}

async function sendmail(connected, temp, str) {
    // using Twilio SendGrid's v3 Node.js Library
    // https://github.com/sendgrid/sendgrid-nodejs
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_PING_SPA2);
    console.log('starting email')
    const msg = {
        to: 'tom.mccollough@gmail.com', // Change to your recipient
        from: 'tom@tommccollough.com', // Change to your verified sender
        subject: `Spa ${connected}, temp is ${temp} deg. F ${str}`,
        text: 'and easy to do anywhere, even with Node.js',
        html: '<strong>and easy to do anywhere, even with Node.js</strong>',
    }
    await sgMail
        .send(msg)
        .then(() => { console.log('Email sent') })
        .catch((error) => { console.error(error); console.log('email did not work'); });
    console.log('email function done');
}

async function sendtext(connected, temp, str) {
    // Download the helper library from https://www.twilio.com/docs/node/install
    // Find your Account SID and Auth Token at twilio.com/console
    // and set the environment variables. See http://twil.io/secure
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const client = require('twilio')(accountSid, authToken);
    console.log('starting sms')
    await client.messages
        .create({
            body: `Spa ${connected}, temp is ${temp}, region ${process.env.VERCEL_REGION}, ${str}`,
            from: '+18888207345',
            to: '+18016478498'
        })
        .then(message => console.log(`sms was successful, message id is ${message.sid}`));
    console.log('SMS function done');
}

async function alertGrafanaOnCall(alertID, str) {
    console.log('alerting starting')
    await fetch("https://oncall-prod-us-central-0.grafana.net/oncall/integrations/v1/webhook/7wEIEYPdpFa7pYyJ0xfGXPofx/", {
        method: "POST",
        body: JSON.stringify({
            alert_uid: alertID,
            title: "Hot tub is OFFLINE",
            checkTime: str,
            state: "alerting",
            message: "Check if the house has power. If that's good, then check the spa breaker on the back patio."
        }),
        headers: {
            'Content-Type': 'Application/json',
        }
    })
    .then((response)=> { console.log('response', response); response.json(); } )
    .then((json)=> console.log('json', json));
    console.log('alerting done')
}
