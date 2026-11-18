@extends('emails.layout')

@section('title', 'Money released')
@section('subtitle', 'A payment for your order has been released from escrow.')

@section('content')
  <h2>Money released for order #{{ $payout->order_id }}</h2>

  <p>Hello {{ $payee?->name ?? 'there' }},</p>

  <p>
    {{ $release?->label ?? 'A payment' }} of
    <strong>₦{{ number_format((float) $payout->amount, 2) }}</strong>
    has been released from escrow for order #{{ $payout->order_id }}.
  </p>

  <div class="panel">
    <p><strong>Amount released</strong>: ₦{{ number_format((float) $payout->amount, 2) }}</p>
    <p><strong>Reference</strong>: {{ $payout->reference }}</p>
    <p><strong>Order</strong>: #{{ $payout->order_id }}</p>
    <p><strong>Status</strong>: {{ $payout->status === 'paid' ? 'Sent to your bank account' : 'Waiting for the bank transfer' }}</p>
  </div>

  @if($hasBankDetails)
    <p>
      We will send this money to your bank account by transfer. You will get another email
      as soon as the bank confirms it.
    </p>
  @else
    <p>
      We do not have your bank details yet, so the transfer cannot be sent. Open your profile,
      choose your bank, and add the account name and 10-digit account number. The money stays
      recorded against your order until then.
    </p>
    <a href="{{ config('app.url') }}/profile" class="button">Add bank details</a>
  @endif

  <p>You can see every payment and its reference in <strong>My money</strong> in your dashboard.</p>
@endsection
