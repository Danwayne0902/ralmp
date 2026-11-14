<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Mail;
use App\Mail\VerifyEmail;
use App\Mail\ResetPassword;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    private const RESET_TOKEN_TTL_MINUTES = 60;

    /**
     * Register a new user
     */
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'phone' => 'required|string|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'role' => 'required|in:farmer,buyer,logistics_provider',
            'address' => 'required|string',
            'state' => 'required|string',
            'lga' => 'required|string',
            'profile_image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        $verificationToken = Str::random(64);

        $userData = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'address' => $validated['address'],
            'state' => $validated['state'],
            'lga' => $validated['lga'],
            'email_verified_at' => null,
            // Store only a hash; the raw token is emailed to the user.
            'verification_token' => hash('sha256', $verificationToken),
        ];

        // Handle profile image upload
        if ($request->hasFile('profile_image')) {
            $path = $request->file('profile_image')->store('profiles', 'public');
            $userData['profile_image'] = $path;
        }

        $user = User::create($userData);

        // Assign role
        $user->assignRole($validated['role']);

        // Send verification email
        Mail::to($user->email)->send(new VerifyEmail($user, $verificationToken));

        return response()->json([
            'message' => 'User registered successfully. Please verify your email.',
            'user' => $user->only(['id', 'name', 'email', 'phone', 'role', 'profile_image']),
        ], 201);
    }

    /**
     * Login user and issue token
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if (is_null($user->email_verified_at)) {
            return response()->json([
                'message' => 'Please verify your email address before logging in.',
                'code' => 'email_unverified',
            ], 403);
        }

        if (!$user->is_active) {
            return response()->json([
                'message' => 'This account has been suspended.',
                'code' => 'account_suspended',
            ], 403);
        }

        // Keep existing device tokens alive. Revoking every token on login
        // signed the user out of any other open tab/device (and any background
        // request holding the previous token) the moment they signed in again.
        // Explicit logout still revokes only the current token.
        $token = $user->createToken('auth_token');

        return response()->json([
            'message' => 'Login successful',
            'token' => $token->plainTextToken,
            'user' => $user->only(['id', 'name', 'email', 'phone', 'role', 'email_verified_at']),
        ], 200);
    }

    /**
     * Logout user
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logout successful'], 200);
    }

    /**
     * Verify email with token
     */
    public function verifyEmail(Request $request)
    {
        $request->validate([
            'token' => 'required|string',
        ]);

        $user = User::where('verification_token', hash('sha256', $request->token))->first();

        if (!$user) {
            return response()->json(['message' => 'Invalid verification token'], 400);
        }

        $user->update([
            'email_verified_at' => now(),
            'verification_status' => true,
            'verification_token' => null,
        ]);

        return response()->json(['message' => 'Email verified successfully'], 200);
    }

    /**
     * Resend verification email
     */
    public function resendVerificationEmail(Request $request)
    {
        $request->validate(['email' => 'required|string|email']);

        $user = User::where('email', $request->email)->first();

        // Do not reveal whether an account exists.
        $response = response()->json([
            'message' => 'If an unverified account exists with that email, a verification link has been sent.',
        ], 200);

        if (!$user || $user->email_verified_at) {
            return $response;
        }

        $token = Str::random(64);
        $user->update(['verification_token' => hash('sha256', $token)]);
        Mail::to($user->email)->send(new VerifyEmail($user, $token));

        return $response;
    }

    /**
     * Send password reset link
     */
    public function forgotPassword(Request $request)
    {
        $request->validate(['email' => 'required|string|email']);

        // Always return the same response to prevent account enumeration.
        $response = response()->json([
            'message' => 'If an account exists with that email, a reset link has been sent',
        ], 200);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return $response;
        }

        $token = Str::random(64);

        $user->update([
            'reset_token' => hash('sha256', $token),
            'reset_token_expires_at' => now()->addMinutes(self::RESET_TOKEN_TTL_MINUTES),
        ]);

        Mail::to($user->email)->send(new ResetPassword($user, $token));

        return $response;
    }

    /**
     * Reset password with token
     */
    public function resetPassword(Request $request)
    {
        $request->validate([
            'token' => 'required|string',
            'email' => 'required|string|email',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = User::where('email', $request->email)
            ->where('reset_token', hash('sha256', $request->token))
            ->first();

        if (!$user || !$user->reset_token_expires_at || $user->reset_token_expires_at->isPast()) {
            return response()->json(['message' => 'Invalid or expired reset token'], 400);
        }

        $user->update([
            'password' => Hash::make($request->password),
            'reset_token' => null,
            'reset_token_expires_at' => null,
        ]);

        // Any existing sessions must be invalidated after a password reset.
        $user->tokens()->delete();

        return response()->json(['message' => 'Password reset successfully'], 200);
    }

    /**
     * Get current user
     */
    public function getCurrentUser(Request $request)
    {
        return response()->json([
            'user' => $request->user()->load('roles'),
        ], 200);
    }
}
