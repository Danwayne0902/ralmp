@extends('emails.layout')

@section('content')
  <h2>Verify your email</h2>
  <p>Welcome to RAMLP! Please confirm your email address to complete your registration and start placing orders.</p>

  <div class="panel">
    <p><strong>Email</strong>: {{ $user->email }}</p>
    <p><strong>Account</strong>: {{ $user->name }}</p>
  </div>

  <a href="{{ $verificationUrl }}" class="button">Verify Email</a>

  <p>If the button above does not work, copy and paste this URL into your browser:</p>
  <p><a href="{{ $verificationUrl }}" style="color: #0ea5e9; word-break: break-all">{{ $verificationUrl }}</a></p>
@endsection
