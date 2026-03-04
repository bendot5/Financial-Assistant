import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
  type WASocket,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import qrcode from 'qrcode-terminal';

// Suppress Baileys' verbose internal logging
const logger = pino({ level: 'silent' });

// Auth files are written here; excluded from git via .gitignore
const AUTH_DIR = './auth_info_baileys';

let socket: WASocket | null = null;

export type MessageHandler = (phone: string, text: string) => Promise<void>;

/**
 * Starts the Baileys WhatsApp connection and registers the message handler.
 * On first run, renders a QR code in the terminal via qrcode-terminal — scan with WhatsApp to link.
 * Auto-reconnects on disconnection unless the user explicitly logged out.
 */
export async function startBot(onMessage: MessageHandler): Promise<WASocket> {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version, isLatest } = await fetchLatestBaileysVersion();

  console.log(`[Baileys] Using WhatsApp Web v${version.join('.')}, isLatest: ${isLatest}`);

  socket = makeWASocket({
    version,
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    browser: ['FinancialAssistant', 'Chrome', '124.0.0'],
    // Required for message history decryption in multi-device
    getMessage: async () => undefined,
  });

  // Persist updated credentials (session tokens) whenever they change
  socket.ev.on('creds.update', saveCreds);

  socket.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('\n[Baileys] Scan the QR code below with WhatsApp (Linked Devices → Link a Device):\n');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'connecting') {
      console.log('[Baileys] Connecting to WhatsApp...');
    } else if (connection === 'open') {
      console.log('[Baileys] ✅ Connected to WhatsApp!');
    } else if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`[Baileys] Connection closed (code ${statusCode}). Reconnecting: ${shouldReconnect}`);
      if (shouldReconnect) {
        startBot(onMessage);
      } else {
        console.log('[Baileys] Logged out. Delete ./auth_info_baileys and restart to re-link.');
        process.exit(0);
      }
    }
  });

  socket.ev.on('messages.upsert', async ({ messages, type }) => {
    // 'notify' means these are new incoming messages (not history sync)
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (msg.key.fromMe) continue; // Ignore messages sent by the bot itself

      const jid = msg.key.remoteJid;
      // Only handle 1-on-1 chats — skip groups (@g.us) and broadcast lists
      if (!jid || jid.endsWith('@g.us') || jid === 'status@broadcast') continue;

      const text =
        msg.message?.conversation ??
        msg.message?.extendedTextMessage?.text ??
        '';

      if (!text.trim()) continue;

      const phone = jid.replace('@s.whatsapp.net', '');

      try {
        await onMessage(phone, text.trim());
      } catch (err) {
        console.error(`[Bot] Unhandled error for message from ${phone}:`, err);
      }
    }
  });

  return socket;
}

/**
 * Sends a WhatsApp text message to a phone number.
 * @param phone - E.164 number without '+', e.g. "15551234567"
 */
export async function sendWhatsAppMessage(phone: string, text: string): Promise<void> {
  if (!socket) throw new Error('[Bot] Socket not initialised — call startBot() first');
  const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;
  await socket.sendMessage(jid, { text });
}
