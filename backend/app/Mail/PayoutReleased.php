<?php

namespace App\Mail;

use App\Models\Payout;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PayoutReleased extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public Payout $payout)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '₦' . number_format((float) $this->payout->amount, 2)
                . ' released for order #' . $this->payout->order_id,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.payout-released',
            with: [
                'payout' => $this->payout,
                'payee' => $this->payout->user,
                'release' => $this->payout->release,
                'hasBankDetails' => (bool) ($this->payout->user?->account_number),
            ],
        );
    }
}
