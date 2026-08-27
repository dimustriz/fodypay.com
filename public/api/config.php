<?php
/*
 * FodyPay API config — fill in real values on Hostinger File Manager.
 * This file is committed with placeholders only.
 *
 * MySQL — run once in phpMyAdmin:
 *
 *   CREATE TABLE waitlist (
 *     id INT AUTO_INCREMENT PRIMARY KEY,
 *     email VARCHAR(255) NOT NULL UNIQUE,
 *     use_case VARCHAR(160), crypto VARCHAR(160),
 *     spend VARCHAR(160), country VARCHAR(120),
 *     lang VARCHAR(10), created_at DATETIME NOT NULL
 *   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
 *
 *   CREATE TABLE tg_sessions (
 *     chat_id BIGINT PRIMARY KEY,
 *     step VARCHAR(20) NOT NULL DEFAULT 'start',
 *     a1 VARCHAR(160) DEFAULT '',
 *     a2 VARCHAR(160) DEFAULT '',
 *     a3 VARCHAR(160) DEFAULT '',
 *     a4 VARCHAR(120) DEFAULT '',
 *     updated_at DATETIME NOT NULL
 *   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
 *
 * Telegram — activate webhook once after uploading:
 *   curl "https://api.telegram.org/bot{TG_TOKEN}/setWebhook?url=https://fodypay.com/api/bot.php&secret_token={TG_SECRET}"
 */

define('DB_HOST', 'localhost');
define('DB_NAME', 'YOUR_DB_NAME');
define('DB_USER', 'YOUR_DB_USER');
define('DB_PASS', 'YOUR_DB_PASSWORD');

define('TG_TOKEN',  'YOUR_BOT_TOKEN');   // from @BotFather
define('TG_SECRET', 'YOUR_RANDOM_SECRET'); // any random string, same in setWebhook call
define('TG_API',    'https://api.telegram.org/bot' . TG_TOKEN);
