@extends('emails.layout')

@section('content')
  <h2>Order #{{ $order->id }} update</h2>
  <p>Your order has a new status: <strong>{{ strtoupper($order->status) }}</strong>.</p>

  <div class="panel">
    <p><strong>Order total</strong>: ₦{{ number_format($order->total_price, 2) }}</p>
    <p><strong>Delivery date</strong>: {{ date('M d, Y', strtotime($order->delivery_date)) }}</p>
    <p><strong>Current stage</strong>: {{ ucfirst($order->status) }}</p>
  </div>

  @if($recipientType === 'buyer')
    <p>Great news! The farmer is working on your order and we'll keep you posted as it moves through confirmation, pickup, and delivery.</p>
  @elseif($recipientType === 'logistics_provider')
    <p>The delivery price for this order has been agreed and paid into escrow. Check your dashboard for the pickup details. Your money is released after the buyer and the farmer both confirm the goods arrived.</p>
  @else
    <p>This order is now {{ $order->status }}. Please check your dashboard for next steps and coordinate with your buyer.</p>
  @endif

  <a href="{{ config('app.url') }}/orders/{{ $order->id }}" class="button">View Order</a>
  <p>If you have questions, reply to this email and our support team will help.</p>
@endsection
