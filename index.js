const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, delay } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');

async function startMaolanaBot() {
    // Session folder: maolana_session
    const { state, saveCreds } = await useMultiFileAuthState('maolana_session');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        auth: state,
        printQRInTerminal: false,
        browser: ["Maolana-Bot", "Chrome", "1.0.0"]
    });

    // Pairing Code Logic
    if (!sock.authState.creds.registered) {
        await delay(5000); // Server ko stable hone ka waqt dena
        console.log('\n--- PAIRING CODE METHOD ---');
        
        // Aapka number yahan set hai
        let phoneNumber = "923095304724"; 
        
        try {
            const code = await sock.requestPairingCode(phoneNumber);
            console.log(`\n✅ APKA PAIRING CODE YE HAI: ${code}`);
            console.log('Isay WhatsApp ke "Link with phone number" section mein dalein.\n');
        } catch (error) {
            console.log('Pairing code request fail ho gayi: ', error);
        }
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

        // Maolana Bot Commands
        if (text.toLowerCase() === '.status') {
            await sock.sendMessage(from, { text: 'Bot Active Hai ✅' });
        } 
        else if (text.toLowerCase() === '.owner') {
            await sock.sendMessage(from, { text: 'Is Bot Ke Admin *Maolana Sahib* Hain.' });
        }
        else if (text.toLowerCase() === '.menu') {
            const menuText = `*🛠 MAOLANA BOT MENU*\n\n` +
                             `1. *.status* - Bot check karne ke liye\n` +
                             `2. *.owner* - Admin details\n` +
                             `3. *.menu* - Commands list`;
            await sock.sendMessage(from, { text: menuText });
        }
    });
}

startMaolanaBot();
