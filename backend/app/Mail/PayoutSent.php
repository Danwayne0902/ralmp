<?php

namespace App\Mail;

use App\Models\Payout;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PayoutSent extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public Payout $payout)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '₦' . number_format((float) $this->payout->amount, 2)
                . ' sent to your bank account',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.payout-sent',
            with: [
                'payout' => $this->payout,
                'payee' => $this->payout->user,
                'release' => $this->payout->release,
            ],
        );
    }
}
