import type { Lang } from './ui';

// Chat-widget UI strings per locale. The ChatWidget component consumes these
// via `i={{ chat: chatStrings[lang] }}` (see layouts/Layout.astro). Kept in a
// dedicated module rather than inside ui.ts because the widget expects a nested
// object (not the flat dot-notation keys the rest of ui.ts uses), and its
// ChatStrings shape is defined by src/components/chat-logic.ts.

export interface FodyChatStrings {
  title: string;
  greeting: string;
  placeholder: string;
  send: string;
  closeLabel: string;
  today: string;
  yesterday: string;
  aiLabel: string;
  hostLabel: string;
  newMessages: string;
  seeOriginal: string;
  seeTranslation: string;
  openLabel: string;
  nudge: string;
}

export const chatStrings: Record<Lang, FodyChatStrings> = {
  en: {
    title: 'FodyPay support',
    greeting: 'Hi! How can I help you with FodyPay?',
    placeholder: 'Type a message...',
    send: 'Send',
    closeLabel: 'Close chat',
    today: 'Today',
    yesterday: 'Yesterday',
    aiLabel: 'FodyPay AI',
    hostLabel: 'Team',
    newMessages: 'New messages',
    seeOriginal: 'See original',
    seeTranslation: 'See translation',
    openLabel: 'Open chat',
    nudge: 'Questions about the FodyPay card, fees, or availability in your country? Just ask.',
  },
  de: {
    title: 'FodyPay-Support',
    greeting: 'Hallo! Wie kann ich Ihnen bei FodyPay helfen?',
    placeholder: 'Nachricht eingeben…',
    send: 'Senden',
    closeLabel: 'Chat schließen',
    today: 'Heute',
    yesterday: 'Gestern',
    aiLabel: 'FodyPay KI',
    hostLabel: 'Team',
    newMessages: 'Neue Nachrichten',
    seeOriginal: 'Original anzeigen',
    seeTranslation: 'Übersetzung anzeigen',
    openLabel: 'Chat öffnen',
    nudge: 'Fragen zur FodyPay-Karte, zu Gebühren oder zur Verfügbarkeit in Ihrem Land? Fragen Sie einfach.',
  },
  ru: {
    title: 'Поддержка FodyPay',
    greeting: 'Здравствуйте! Чем могу помочь с FodyPay?',
    placeholder: 'Введите сообщение…',
    send: 'Отправить',
    closeLabel: 'Закрыть чат',
    today: 'Сегодня',
    yesterday: 'Вчера',
    aiLabel: 'FodyPay AI',
    hostLabel: 'Команда',
    newMessages: 'Новые сообщения',
    seeOriginal: 'Показать оригинал',
    seeTranslation: 'Показать перевод',
    openLabel: 'Открыть чат',
    nudge: 'Вопросы о карте FodyPay, комиссиях или доступности в вашей стране? Просто спросите.',
  },
  uk: {
    title: 'Підтримка FodyPay',
    greeting: 'Вітаємо! Чим можу допомогти з FodyPay?',
    placeholder: 'Введіть повідомлення…',
    send: 'Надіслати',
    closeLabel: 'Закрити чат',
    today: 'Сьогодні',
    yesterday: 'Вчора',
    aiLabel: 'FodyPay AI',
    hostLabel: 'Команда',
    newMessages: 'Нові повідомлення',
    seeOriginal: 'Показати оригінал',
    seeTranslation: 'Показати переклад',
    openLabel: 'Відкрити чат',
    nudge: 'Питання про картку FodyPay, комісії чи доступність у вашій країні? Просто запитайте.',
  },
  es: {
    title: 'Soporte FodyPay',
    greeting: '¡Hola! ¿En qué puedo ayudarte con FodyPay?',
    placeholder: 'Escribe un mensaje…',
    send: 'Enviar',
    closeLabel: 'Cerrar chat',
    today: 'Hoy',
    yesterday: 'Ayer',
    aiLabel: 'IA de FodyPay',
    hostLabel: 'Equipo',
    newMessages: 'Mensajes nuevos',
    seeOriginal: 'Ver original',
    seeTranslation: 'Ver traducción',
    openLabel: 'Abrir chat',
    nudge: '¿Dudas sobre la tarjeta FodyPay, las comisiones o la disponibilidad en tu país? Pregunta.',
  },
  it: {
    title: 'Supporto FodyPay',
    greeting: 'Ciao! Come posso aiutarti con FodyPay?',
    placeholder: 'Scrivi un messaggio…',
    send: 'Invia',
    closeLabel: 'Chiudi chat',
    today: 'Oggi',
    yesterday: 'Ieri',
    aiLabel: 'IA FodyPay',
    hostLabel: 'Team',
    newMessages: 'Nuovi messaggi',
    seeOriginal: 'Vedi originale',
    seeTranslation: 'Vedi traduzione',
    openLabel: 'Apri chat',
    nudge: 'Domande sulla carta FodyPay, sulle commissioni o sulla disponibilità nel tuo Paese? Chiedi pure.',
  },
  fr: {
    title: 'Assistance FodyPay',
    greeting: 'Bonjour ! Comment puis-je vous aider avec FodyPay ?',
    placeholder: 'Écrivez un message…',
    send: 'Envoyer',
    closeLabel: 'Fermer le chat',
    today: "Aujourd'hui",
    yesterday: 'Hier',
    aiLabel: 'IA FodyPay',
    hostLabel: 'Équipe',
    newMessages: 'Nouveaux messages',
    seeOriginal: "Voir l'original",
    seeTranslation: 'Voir la traduction',
    openLabel: 'Ouvrir le chat',
    nudge: 'Des questions sur la carte FodyPay, les frais ou la disponibilité dans votre pays ? Demandez.',
  },
};
