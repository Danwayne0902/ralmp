@extends('emails.layout')

@section('content')
  <h2>Password Reset Request</h2>
  <p>We received a request to reset the password for your RAMLP account.</p>

  <div class="panel">
    <p>If you did not request a password reset, you can safely ignore this email.</p>
  </div>

  <a href="{{ $resetUrl }}" class="button">Reset Password</a>

  <p>The link will expire in 60 minutes. If you need help, contact support@ramlp.com.</p>
@endsection
