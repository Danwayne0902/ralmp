<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\ImageStore;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class ProfileController extends Controller
{
    /**
     * Get user profile
     */
    public function show(Request $request)
    {
        $user = $request->user();
        
        return response()->json([
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'role' => $user->role,
            'state' => $user->state,
            'lga' => $user->lga,
            'address' => $user->address,
            'bank_name' => $user->bank_name,
            'bank_code' => $user->bank_code,
            'account_name' => $user->account_name,
            'account_number' => $user->account_number,
            'profile_image' => $user->profile_image,
            'email_verified_at' => $user->email_verified_at,
            'created_at' => $user->created_at,
        ], 200);
    }

    /**
     * Update user profile
     */
    public function update(Request $request)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'phone' => 'sometimes|required|string',
            'address' => 'sometimes|required|string',
            'state' => 'sometimes|required|string',
            'lga' => 'sometimes|required|string',
            'bank_name' => 'sometimes|required|string|max:255',
            'bank_code' => 'sometimes|required|string|max:20',
            'account_name' => 'sometimes|required|string|max:255',
            'account_number' => 'sometimes|required|digits:10',
            'profile_image' => 'sometimes|nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        $user = $request->user();

        // Bank details are all-or-nothing: half an account cannot receive money.
        // A partial edit is fine only when the rest is already saved.
        $bankFields = ['bank_name', 'bank_code', 'account_name', 'account_number'];
        $finalBank = [];
        foreach ($bankFields as $field) {
            $finalBank[$field] = $request->filled($field) ? $validated[$field] : $user->{$field};
        }

        $filled = array_filter($finalBank, fn ($value) => trim((string) $value) !== '');

        if ($filled && count($filled) < 4) {
            return response()->json([
                'message' => 'Add the bank name, account name and 10-digit account number together.',
            ], 422);
        }

        $previousImage = null;

        if ($request->hasFile('profile_image')) {
            $previousImage = $user->profile_image;
            $validated['profile_image'] = ImageStore::put($request->file('profile_image'), 'profiles');
        }

        // A new account needs a new Paystack recipient before the next payout.
        $bankChanged = false;
        foreach ($bankFields as $field) {
            if (array_key_exists($field, $validated) && (string) $validated[$field] !== (string) $user->{$field}) {
                $bankChanged = true;
            }
        }

        if ($bankChanged) {
            $validated['paystack_recipient_code'] = null;
        }

        $user->update($validated);

        // Drop the replaced file only after the profile update succeeded.
        if ($previousImage && $previousImage !== $user->profile_image) {
            ImageStore::delete($previousImage);
        }

        return response()->json([
            'message' => $bankChanged
                ? 'Profile updated. Your payout account is ready.'
                : 'Profile updated successfully',
            'user' => $user->fresh(),
        ], 200);
    }

    /**
     * Change password
     */
    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        if (!Hash::check($request->current_password, $request->user()->password)) {
            return response()->json(['message' => 'Current password is incorrect'], 400);
        }

        $request->user()->update([
            'password' => Hash::make($request->password),
        ]);

        return response()->json(['message' => 'Password changed successfully'], 200);
    }
}
