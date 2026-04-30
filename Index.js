const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion 
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const pino = require('pino');

async function startMaolanaBot() {
    // Session save karne ka folder
    const { state, saveCreds } = await useMultiFileAuthState('maolana_session');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true, // QR code terminal mein dikhayega
        auth: state,
        browser: ["Maolana-Bot", "Chrome", "1.0.0"]
    });

    // Connection Updates (QR aur Login check)
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log('--- SCAN THIS QR CODE WITH WHATSAPP ---');
            qrcode.generate(qr, { small: true });
        }
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startMaolanaBot();
        } else if (connection === 'open') {
            console.log('✅ BOT CONNECTED SUCCESSFULLY!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // Messages Handling
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

        // Simple Commands
        if (text.toLowerCase() === '.menu') {
            await sock.sendMessage(from, { text: '*🛠 MAOLANA BOT MENU*\n\n1. .status\n2. .owner\n3. .id' });
        }
        if (text === '.status') {
            await sock.sendMessage(from, { text: 'Bot is Active 💯' });
        }
        if (text === '.owner') {
            await sock.sendMessage(from, { text: 'Admin: Abdul Salam' });
        }
    });
}

startMaolanaBot();
