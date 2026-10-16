<?php
declare(strict_types=1);

// A single-purpose SiteGround endpoint. No visitor-controlled recipient or sender.
function handle_audit_request(string $method, string $origin, string $contentType, string $raw, callable $send, callable $rate): array
{
    if ($method !== 'POST') return ['status' => 405, 'ok' => false];
    if (!in_array($origin, ['https://codeflowstudios.be', 'https://www.codeflowstudios.be'], true)) {
        return ['status' => 403, 'ok' => false];
    }
    if (!str_starts_with(strtolower($contentType), 'application/json') || strlen($raw) > 12000) {
        return ['status' => 400, 'ok' => false];
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) return ['status' => 400, 'ok' => false];
    $text = static function (string $key, int $max) use ($data): ?string {
        $value = $data[$key] ?? '';
        return is_string($value) && strlen($value) <= $max ? trim($value) : null;
    };
    $company = $text('company', 160);
    $email = $text('email', 254);
    $website = $text('website', 1000);
    $goal = $text('goal', 3000);
    $trap = $text('fax', 1000);
    if ($trap === null || $trap !== '') return ['status' => 202, 'ok' => true];
    if ($company === null || $company === '' || preg_match('/[\r\n\x00]/', $company)
        || $email === null || preg_match('/[\r\n\x00]/', $email) || !filter_var($email, FILTER_VALIDATE_EMAIL)
        || $website === null || $website === '' || $goal === null || str_contains($goal, "\0")) {
        return ['status' => 422, 'ok' => false];
    }
    if (!preg_match('~^https?://~i', $website)) $website = 'https://' . $website;
    $url = parse_url($website);
    if (!filter_var($website, FILTER_VALIDATE_URL) || !is_array($url)
        || !in_array(strtolower($url['scheme'] ?? ''), ['https', 'http'], true)
        || empty($url['host']) || isset($url['user']) || isset($url['pass'])) {
        return ['status' => 422, 'ok' => false];
    }
    $allowed = $rate();
    if ($allowed === null) return ['status' => 503, 'ok' => false];
    if (!$allowed) return ['status' => 429, 'ok' => false];
    $reference = strtoupper(bin2hex(random_bytes(6)));
    $lines = [
        'Nieuwe digitale auditaanvraag', 'Referentie: ' . $reference,
        'Bedrijf: ' . $company, 'E-mail: ' . $email, 'Website: ' . $website,
        '', 'Belangrijkste doel:', $goal ?: '(niet ingevuld)', '', 'Herkomst: /free-audit',
    ];
    // Only campaign tags are retained, never arbitrary URL parameters/referrers.
    foreach (['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as $key) {
        $value = $text($key, 120);
        if ($value !== null && $value !== '' && !preg_match('/[\r\n\x00]/', $value)) $lines[] = $key . ': ' . $value;
    }
    $headers = [
        'From' => 'Codeflow Studios <info@codeflowstudios.be>',
        'Reply-To' => $email,
        'MIME-Version' => '1.0',
        'Content-Type' => 'text/plain; charset=UTF-8',
        'Content-Transfer-Encoding' => 'base64',
    ];
    $message = chunk_split(base64_encode(implode("\r\n", $lines)), 76, "\r\n");
    $accepted = $send('info@codeflowstudios.be', 'Codeflow - nieuwe digitale auditaanvraag', $message, $headers);
    return $accepted ? ['status' => 202, 'ok' => true, 'reference' => $reference] : ['status' => 503, 'ok' => false];
}

function audit_rate_limit(string $ip): ?bool
{
    // Private temporary storage contains timestamps only; no submitted form data.
    $directory = sys_get_temp_dir() . '/codeflow-audit-rate';
    if (!is_dir($directory) && !@mkdir($directory, 0700) && !is_dir($directory)) return null;
    $filename = $directory . '/' . hash('sha256', $ip) . '.json';
    $file = @fopen($filename, 'c+');
    if ($file === false) return null;
    @chmod($filename, 0600);
    try {
        if (!flock($file, LOCK_EX)) return null;
        $now = time();
        $stored = json_decode(stream_get_contents($file) ?: '[]', true);
        $times = array_values(array_filter(is_array($stored) ? $stored : [], static fn($t) => is_int($t) && $t > $now - 3600));
        if (count($times) >= 5 || (count($times) && max($times) > $now - 30)) return false;
        $times[] = $now;
        rewind($file);
        if (!ftruncate($file, 0) || fwrite($file, json_encode($times)) === false) return null;
        return true;
    } finally {
        flock($file, LOCK_UN);
        fclose($file);
    }
}

if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    $raw = file_get_contents('php://input', false, null, 0, 12001);
    try {
        $result = handle_audit_request(
            $_SERVER['REQUEST_METHOD'] ?? '', $_SERVER['HTTP_ORIGIN'] ?? '',
            $_SERVER['CONTENT_TYPE'] ?? '', $raw === false ? '' : $raw,
            static fn($to, $subject, $body, $headers) => @mail($to, $subject, $body, $headers),
            static fn() => audit_rate_limit($_SERVER['REMOTE_ADDR'] ?? 'unknown')
        );
    } catch (Throwable $error) {
        $result = ['status' => 503, 'ok' => false];
    }
    http_response_code($result['status']);
    if ($result['status'] === 405) header('Allow: POST');
    unset($result['status']);
    echo json_encode($result);
}
