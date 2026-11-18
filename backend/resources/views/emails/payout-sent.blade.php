@extends('emails.layout')

@section('title', 'Bank transfer sent')
@section('subtitle', 'The bank has confirmed your payout.')

@section('content')
  <h2>₦{{ number_format((float) $payout->amount, 2) }} sent to your bank account</h2>

  <p>Hello {{ $payee?->name ?? 'there' }},</p>

  <p>
    The bank has confirmed the transfer for order #{{ $payout->order_id }}.
    The money should appear in your account shortly, depending on your bank.
  </p>

  <div class="panel">
    <p><strong>Amount</strong>: ₦{{ number_format((float) $payout->amount, 2) }}</p>
    <p><strong>Bank</strong>: {{ $payout->bank_name ?: ($payee?->bank_name ?: 'Your bank') }}</p>
    <p><strong>Account</strong>: {{ $payout->account_number ? '****' . substr($payout->account_number, -4) : 'Your saved account' }}</p>
    <p><strong>Reference</strong>: {{ $payout->reference }}</p>
    <p><strong>Order</strong>: #{{ $payout->order_id }}</p>
  </div>

  <p>Keep this email as your record. If the money does not arrive, reply with the reference above.</p>
@endsection
