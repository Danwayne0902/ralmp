<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{ $title ?? 'RAMLP Notification' }}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #f3f4f6;
      color: #111827;
      font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .email-wrapper {
      width: 100%;
      padding: 32px 16px;
      background: #f3f4f6;
    }
    .email-card {
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 24px 80px rgba(15, 23, 42, 0.08);
    }
    .email-header {
      padding: 32px 32px 24px;
      background: linear-gradient(135deg, #10b981 0%, #0ea5e9 100%);
      color: #ffffff;
      text-align: center;
    }
    .email-header h1 {
      margin: 0;
      font-size: 28px;
      letter-spacing: -0.02em;
    }
    .email-header p {
      margin: 12px auto 0;
      max-width: 420px;
      font-size: 14px;
      opacity: 0.92;
      line-height: 1.7;
    }
    .email-body {
      padding: 32px;
    }
    .email-body h2 {
      margin-top: 0;
      font-size: 22px;
      color: #111827;
    }
    .email-body p {
      color: #475569;
      line-height: 1.75;
      margin: 16px 0;
      font-size: 15px;
    }
    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 14px 24px;
      border-radius: 999px;
      background-color: #10b981;
      color: #ffffff;
      text-decoration: none;
      font-weight: 700;
      margin: 18px 0 0;
    }
    .button-secondary {
      background-color: #eef2ff;
      color: #4338ca;
    }
    .panel {
      margin: 24px 0;
      padding: 20px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      font-size: 14px;
      color: #334155;
      line-height: 1.75;
    }
    .footer {
      padding: 24px 32px 32px;
      font-size: 13px;
      color: #64748b;
      text-align: center;
    }
    .footer a {
      color: #0ea5e9;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-card">
      <div class="email-header">
        <h1>{{ $title ?? 'RAMLP' }}</h1>
        <p>{{ $subtitle ?? 'Fresh produce, meaningful connections, better logistics.' }}</p>
      </div>
      <div class="email-body">
        @yield('content')
      </div>
      <div class="footer">
        <p>Need help? Reach us at <a href="mailto:support@ramlp.com">support@ramlp.com</a></p>
        <p>© {{ date('Y') }} RAMLP. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
