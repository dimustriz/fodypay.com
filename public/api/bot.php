<?php
/*
 * FodyPay Telegram bot webhook handler.
 *
 * Runs the same 4-question quiz as the website, then stores to the
 * shared `waitlist` table (lang = 'tg').
 *
 * After uploading with real credentials in config.php, register the webhook:
 *   curl "https://api.telegram.org/bot{TG_TOKEN}/setWebhook \
 *     ?url=https://fodypay.com/api/bot.php \
 *     &secret_token={TG_SECRET}"
 */

require_once __DIR__ . '/config.php';

// Reject requests that aren't from Telegram
if (($_SERVER['HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN'] ?? '') !== TG_SECRET) {
    http_response_code(403);
    exit;
}

$update = json_decode(file_get_contents('php://input'), true);
if (!$update) exit;

$chatId = $update['message']['chat']['id']
    ?? $update['callback_query']['message']['chat']['id']
    ?? null;
if (!$chatId) exit;

// ?? Callback (button tap) ????????????????????????????????????????????????????
if (isset($update['callback_query'])) {
    $cq   = $update['callback_query'];
    $data = $cq['data'];
    $msgId = $cq['message']['message_id'];

    tgApi('answerCallbackQuery', ['callback_query_id' => $cq['id']]);
    tgApi('deleteMessage', ['chat_id' => $chatId, 'message_id' => $msgId]);

    [$step, $value] = explode(':', $data, 2) + [1 => ''];

    if ($step === 'q1') { updateSess($chatId, ['step' => 'q2', 'a1' => $value]); sendQ2($chatId); }
    if ($step === 'q2') { updateSess($chatId, ['step' => 'q3', 'a2' => $value]); sendQ3($chatId); }
    if ($step === 'q3') {
        updateSess($chatId, ['step' => 'q4', 'a3' => $value]);
        tgSend($chatId, "\xF0\x9F\x8C\x8D Which country are you in?\n\nJust type it (e.g. Ukraine, Germany, Brazil...)");
    }
    exit;
}

// ?? Text message ?????????????????????????????????????????????????????????????
if (!isset($update['message']['text'])) exit;
$text = trim($update['message']['text']);
$sess = getSess($chatId);
$step = $sess['step'] ?? 'start';

if ($text === '/start') {
    resetSess($chatId);
    tgSend($chatId,
        "\xF0\x9F\x91\x8B Welcome to *FodyPay*!\n\n" .
        "_Just another card. For everything else._\n\n" .
        "Top up with crypto \xe2\x80\x94 spend on Spotify, ChatGPT, hotels, anywhere Visa is accepted.\n\n" .
        "Answer 4 quick questions to check if FodyPay will be available in your country \xF0\x9F\x91\x87",
        ['parse_mode' => 'Markdown']
    );
    sendQ1($chatId);
    exit;
}

if ($step === 'start') {
    tgSend($chatId, "Send /start to check card availability in your country.");
    exit;
}

if ($step === 'q4') {
    if (mb_strlen($text) < 2) { tgSend($chatId, "Please type your country name."); exit; }
    updateSess($chatId, ['step' => 'email', 'a4' => mb_substr($text, 0, 80)]);
    tgSend($chatId, "\xF0\x9F\x93\xA7 Almost done!\n\nEnter your email to lock in early access:");
    exit;
}

if ($step === 'email') {
    $email = filter_var($text, FILTER_VALIDATE_EMAIL);
    if (!$email) { tgSend($chatId, "That doesn't look valid. Please try again:"); exit; }
    $sess = getSess($chatId);
    saveWaitlist($email, $sess);
    updateSess($chatId, ['step' => 'done']);
    tgSend($chatId,
        "\xe2\x9c\x85 *You're on the list!*\n\n" .
        "FodyPay is coming to *" . htmlspecialchars($sess['a4'] ?? 'your area') . "*. " .
        "We'll notify you when early access opens.\n\n" .
        "\xF0\x9F\x8C\x90 fodypay.com",
        ['parse_mode' => 'Markdown']
    );
    exit;
}

if ($step === 'done') {
    tgSend($chatId, "You're already on the list \xe2\x80\x94 we'll reach out when FodyPay launches. \xF0\x9F\x9A\x80");
    exit;
}

// ?? Quiz senders ??????????????????????????????????????????????????????????????

function sendQ1(int $chatId): void {
    tgSend($chatId, "\xe2\x9d\x93 *What will you mainly use FodyPay for?*", [
        'parse_mode'   => 'Markdown',
        'reply_markup' => kb([
            [btn('ChatGPT / AI tools',  'q1:ChatGPT / AI tools')],
            [btn('Spotify / Netflix',   'q1:Spotify / Netflix')],
            [btn('Hotels / Booking',    'q1:Hotels / Booking')],
            [btn('Meta / Google Ads',   'q1:Meta / Google Ads')],
            [btn('Something else',      'q1:Other')],
        ]),
    ]);
}

function sendQ2(int $chatId): void {
    tgSend($chatId, "\xF0\x9F\x92\xB0 *Which crypto do you use?*", [
        'parse_mode'   => 'Markdown',
        'reply_markup' => kb([
            [btn('USDT TRC20', 'q2:USDT TRC20'), btn('TON', 'q2:TON')],
            [btn('Solana / SOL', 'q2:Solana / SOL'), btn('Other', 'q2:Other')],
        ]),
    ]);
}

function sendQ3(int $chatId): void {
    tgSend($chatId, "\xF0\x9F\x92\xB3 *Monthly card spend estimate?*", [
        'parse_mode'   => 'Markdown',
        'reply_markup' => kb([
            [btn('Under $100',   'q3:Under $100')],
            [btn('$100 \xe2\x80\x93 $500', 'q3:$100-$500')],
            [btn('Over $500',    'q3:Over $500')],
        ]),
    ]);
}

function btn(string $text, string $data): array {
    return ['text' => $text, 'callback_data' => $data];
}

function kb(array $rows): array {
    return ['inline_keyboard' => $rows];
}

// ?? Telegram API ??????????????????????????????????????????????????????????????

function tgSend(int $chatId, string $text, array $extra = []): void {
    tgApi('sendMessage', array_merge(['chat_id' => $chatId, 'text' => $text], $extra));
}

function tgApi(string $method, array $params): void {
    $ch = curl_init(TG_API . '/' . $method);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($params),
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 5,
    ]);
    curl_exec($ch);
    curl_close($ch);
}

// ?? DB ????????????????????????????????????????????????????????????????????????

function pdo(): PDO {
    static $pdo;
    if (!$pdo) {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER, DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
    }
    return $pdo;
}

function getSess(int $chatId): array {
    $s = pdo()->prepare('SELECT * FROM tg_sessions WHERE chat_id = ?');
    $s->execute([$chatId]);
    return $s->fetch(PDO::FETCH_ASSOC) ?: [];
}

function updateSess(int $chatId, array $fields): void {
    // Ensure row exists
    pdo()->prepare(
        "INSERT IGNORE INTO tg_sessions (chat_id, step, a1, a2, a3, a4, updated_at)
         VALUES (?, 'start', '', '', '', '', NOW())"
    )->execute([$chatId]);

    $fields['updated_at'] = date('Y-m-d H:i:s');
    $sets = implode(', ', array_map(fn($k) => "$k = ?", array_keys($fields)));
    pdo()->prepare("UPDATE tg_sessions SET $sets WHERE chat_id = ?")
         ->execute([...array_values($fields), $chatId]);
}

function resetSess(int $chatId): void {
    pdo()->prepare(
        "INSERT INTO tg_sessions (chat_id, step, a1, a2, a3, a4, updated_at)
         VALUES (?, 'q1', '', '', '', '', NOW())
         ON DUPLICATE KEY UPDATE step='q1', a1='', a2='', a3='', a4='', updated_at=NOW()"
    )->execute([$chatId]);
}

function saveWaitlist(string $email, array $sess): void {
    pdo()->prepare(
        "INSERT INTO waitlist (email, use_case, crypto, spend, country, lang, created_at)
         VALUES (:email, :a1, :a2, :a3, :a4, 'tg', NOW())
         ON DUPLICATE KEY UPDATE
           use_case = VALUES(use_case), crypto = VALUES(crypto),
           spend = VALUES(spend), country = VALUES(country)"
    )->execute([
        ':email' => $email,
        ':a1'    => substr($sess['a1'] ?? '', 0, 160),
        ':a2'    => substr($sess['a2'] ?? '', 0, 160),
        ':a3'    => substr($sess['a3'] ?? '', 0, 160),
        ':a4'    => substr($sess['a4'] ?? '', 0, 120),
    ]);
}
