<?php
declare(strict_types=1);
require __DIR__ . '/audit-request.php';

$checks = 0;
function expect_audit(bool $value, string $message): void {
    global $checks;
    if (!$value) throw new RuntimeException($message);
    $checks++;
}
$valid = ['company' => 'Voorbeeldbedrijf', 'email' => 'klant@example.com', 'website' => 'example.com', 'goal' => 'Een bruikbare offerteaanvraag', 'utm_source' => 'meta'];
$sent = [];
$sender = static function ($to, $subject, $body, $headers) use (&$sent): bool {
    $sent[] = compact('to', 'subject', 'body', 'headers');
    return true;
};
$request = static fn($data, $origin = 'https://codeflowstudios.be', $method = 'POST', $rate = true, $mailer = null) => handle_audit_request($method, $origin, 'application/json', json_encode($data), $mailer ?? $sender, static fn() => $rate);
$result = $request($valid);
expect_audit($result['status'] === 202 && strlen($result['reference']) === 12, 'Valid request is accepted with a reference');
expect_audit(count($sent) === 1 && $sent[0]['to'] === 'info@codeflowstudios.be', 'Only the fixed business inbox receives the request');
expect_audit($sent[0]['headers']['Reply-To'] === 'klant@example.com', 'Reply goes to the validated visitor');
expect_audit(str_contains(base64_decode($sent[0]['body']), 'https://example.com') && str_contains(base64_decode($sent[0]['body']), 'utm_source: meta'), 'Website and campaign attribution survive delivery');
foreach ([['email' => "valid@example.com\r\nBcc: attacker@example.com"], ['company' => ['not a string']], ['website' => 'javascript:alert(1)'], ['website' => 'https://user:pass@example.com'], ['goal' => str_repeat('a', 3001)]] as $bad) {
    expect_audit($request(array_replace($valid, $bad))['status'] === 422, 'Invalid input is rejected');
}
expect_audit($request($valid, 'https://attacker.example')['status'] === 403, 'Foreign origins cannot submit');
expect_audit($request($valid, 'https://codeflowstudios.be', 'GET')['status'] === 405, 'GET never sends mail');
expect_audit($request($valid, 'https://codeflowstudios.be', 'POST', false)['status'] === 429, 'Rate limiting blocks sending');
expect_audit($request($valid, 'https://codeflowstudios.be', 'POST', null)['status'] === 503, 'Unavailable rate storage fails closed');
expect_audit($request($valid, 'https://codeflowstudios.be', 'POST', true, static fn() => false)['status'] === 503, 'Mail rejection is not reported as success');
$before = count($sent);
expect_audit($request(array_replace($valid, ['fax' => 'spam']))['status'] === 202 && count($sent) === $before, 'Honeypot does not send');
expect_audit(count($sent) === 1, 'Rejected requests did not reach the mailer');
$testIp = 'audit-test-' . bin2hex(random_bytes(10));
expect_audit(audit_rate_limit($testIp) === true && audit_rate_limit($testIp) === false, 'Real private rate storage rejects a rapid repeat');
@unlink(sys_get_temp_dir() . '/codeflow-audit-rate/' . hash('sha256', $testIp) . '.json');
echo "Passed $checks audit request checks.\n";
