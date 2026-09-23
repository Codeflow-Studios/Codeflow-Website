<?php
declare(strict_types=1);

// The AI stays on Railway. Only the website's existing, explicit API routes
// are forwarded; the browser continues to use same-origin /api/marketing URLs.
const API_BASE = 'https://api-production-d512f.up.railway.app';

function respond_json(int $status, string $message): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode(['title' => $message], JSON_UNESCAPED_SLASHES);
    exit;
}

function id_segment(string $value): ?string
{
    return preg_match('/^[A-Za-z0-9-]{1,100}$/D', $value) ? rawurlencode($value) : null;
}

function query_id(): ?string
{
    $value = $_GET['brandProfileId'] ?? null;
    return is_string($value) ? id_segment($value) : null;
}

$requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
$prefix = '/api/marketing/';
if (!is_string($requestPath) || !str_starts_with($requestPath, $prefix)) {
    respond_json(404, 'Not found');
}

$route = substr($requestPath, strlen($prefix));
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$backendPath = null;
$timeout = 15;
$redirectAllowed = false;

if ($route === 'brand' && $method === 'POST') {
    $backendPath = '/api/brands';
} elseif ($route === 'trends' && $method === 'POST') {
    $backendPath = '/api/trends/ingest';
} elseif (preg_match('~^brands/([^/]+)/trends$~D', $route, $match) && $method === 'GET') {
    $id = id_segment($match[1]);
    if ($id !== null) $backendPath = '/api/brands/' . $id . '/trends?limit=3';
} elseif ($route === 'campaigns' && $method === 'POST') {
    $backendPath = '/api/campaigns';
} elseif (preg_match('~^campaigns/([^/]+)$~D', $route, $match) && in_array($method, ['GET', 'POST'], true)) {
    $id = id_segment($match[1]);
    if ($id !== null) $backendPath = '/api/campaigns/' . $id . ($method === 'POST' ? '/decision' : '');
} elseif (preg_match('~^campaigns/([^/]+)/publish$~D', $route, $match) && $method === 'POST') {
    $id = id_segment($match[1]);
    if ($id !== null) $backendPath = '/api/campaigns/' . $id . '/publish';
    $timeout = 210;
} elseif ($route === 'social/connections' && $method === 'GET') {
    $id = query_id();
    if ($id === null) respond_json(400, 'Brand profile is required');
    $backendPath = '/api/social/connections?brandProfileId=' . $id;
} elseif ($route === 'social/meta/connect' && $method === 'GET') {
    $id = query_id();
    if ($id === null) respond_json(400, 'Brand profile is required');
    $backendPath = '/api/social/meta/connect?brandProfileId=' . $id;
    $redirectAllowed = true;
}

if ($backendPath === null) respond_json(404, 'Not found');

$handle = curl_init(API_BASE . $backendPath);
if ($handle === false) respond_json(503, 'Marketing service unavailable');

$location = null;
$requestBody = $method === 'POST' ? file_get_contents('php://input') : '';
$options = [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_TIMEOUT => $timeout,
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
    CURLOPT_HEADERFUNCTION => static function ($handle, string $header) use (&$location): int {
        if (preg_match('/^Location:\s*(.+)\s*$/i', trim($header), $match)) $location = trim($match[1]);
        return strlen($header);
    },
];
if ($method === 'POST') {
    $options[CURLOPT_POSTFIELDS] = $requestBody === false ? '' : $requestBody;
    if ($requestBody !== false && $requestBody !== '') {
        $options[CURLOPT_HTTPHEADER] = ['Content-Type: application/json'];
    }
}
curl_setopt_array($handle, $options);
$body = curl_exec($handle);
$status = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
$contentType = (string) curl_getinfo($handle, CURLINFO_CONTENT_TYPE);
curl_close($handle);

if ($body === false || $status === 0) respond_json(503, 'Marketing service unavailable');
if ($redirectAllowed && $status >= 300 && $status < 400 && is_string($location)
    && str_starts_with($location, 'https://')) {
    http_response_code(302);
    header('Location: ' . str_replace(["\r", "\n"], '', $location));
    header('Cache-Control: no-store');
    exit;
}

http_response_code($status);
header('Content-Type: ' . str_replace(["\r", "\n"], '', $contentType ?: 'application/json'));
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
echo $body;
