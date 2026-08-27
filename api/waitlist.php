<?php
/*
 * FodyPay waitlist endpoint — stores quiz submissions in MySQL.
 * DB credentials live in config.php (fill in on Hostinger File Manager).
 */

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid request']);
    exit;
}

$email = filter_var(trim($body['email'] ?? ''), FILTER_VALIDATE_EMAIL);
if (!$email) {
    http_response_code(422);
    echo json_encode(['error' => 'Invalid email']);
    exit;
}

try {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER,
        DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    $stmt = $pdo->prepare(
        'INSERT INTO waitlist (email, use_case, crypto, spend, country, lang, created_at)
         VALUES (:email, :use_case, :crypto, :spend, :country, :lang, NOW())
         ON DUPLICATE KEY UPDATE
           use_case = VALUES(use_case),
           crypto   = VALUES(crypto),
           spend    = VALUES(spend),
           country  = VALUES(country),
           lang     = VALUES(lang)'
    );

    $stmt->execute([
        ':email'    => $email,
        ':use_case' => substr($body['a1'] ?? '', 0, 160),
        ':crypto'   => substr($body['a2'] ?? '', 0, 160),
        ':spend'    => substr($body['a3'] ?? '', 0, 160),
        ':country'  => substr($body['a4'] ?? '', 0, 120),
        ':lang'     => substr($body['lang'] ?? 'en', 0, 10),
    ]);

    echo json_encode(['ok' => true]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}
