const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, delay } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function startMaolanaBot() {
    const { state, saveCreds } = await useMultiFileAuthState('maolana_session');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        auth: state,
        printQRInTerminal: false, // QR ki zaroorat nahi ab
        browser: ["Maolana-Bot", "Chrome", "1.0.0"]
    });

    if (!sock.authState.creds.registered) {
        await delay(3000); 
        console.log('\n--- PAIRING CODE METHOD ---');
        // Number country code ke sath likhein, jaise 923...
        let phoneNumber = "923XXXXXXXXX"; 
        
        const code = await sock.requestPairingCode(phoneNumber);
        console.log(`\n✅ APKA PAIRING CODE YE HAI: ${code}`);
        console.log('Isay WhatsApp ke "Link with phone number" mein dalein.\n');
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startMaolanaBot();
        } else if (connection === 'open') {
            console.log('\n✅ BOT CONNECT HO GAYA HAI!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

        if (text.toLowerCase() === '.status') {
            await sock.sendMessage(from, { text: 'Bot Active Hai ✅' });
        }
    });
}

startMaolanaBot();
