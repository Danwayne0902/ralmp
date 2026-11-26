<?php

namespace App\Console\Commands;

use App\Support\ImageStore;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Proves the configured upload disk really works: write, read back, delete.
 * Run it after pointing UPLOADS_DISK at S3 and again after a CDN change.
 */
class CheckUploads extends Command
{
    protected $signature = 'uploads:check';

    protected $description = 'Write, read and delete a test object on the uploads disk';

    public function handle(): int
    {
        $diskName = ImageStore::disk();

        try {
            $disk = Storage::disk($diskName);
        } catch (Throwable $e) {
            $this->error("The {$diskName} disk is not configured: {$e->getMessage()}");

            return self::FAILURE;
        }

        $this->line("Upload disk: <info>{$diskName}</info>");

        $path = 'health/upload-check-'.now()->format('YmdHis').'-'.bin2hex(random_bytes(4)).'.txt';
        $payload = 'RAMLP upload check';

        try {
            $written = $disk->put($path, $payload);
        } catch (Throwable $e) {
            $this->error("Could not write to the {$diskName} disk: {$e->getMessage()}");

            return self::FAILURE;
        }

        if ($written === false) {
            $this->error("Could not write to the {$diskName} disk. Check the bucket name, credentials and region.");

            return self::FAILURE;
        }

        try {
            $readBack = $disk->get($path);
        } catch (Throwable $e) {
            $this->error("The object was written but could not be read back: {$e->getMessage()}");
            $disk->delete($path);

            return self::FAILURE;
        }

        if ($readBack !== $payload) {
            $this->error('The object was written but its contents did not match.');
            $disk->delete($path);

            return self::FAILURE;
        }

        try {
            $this->line("Object URL: {$disk->url($path)}");
        } catch (Throwable $e) {
            // Not every disk can build a URL; reading the object is the real test.
        }

        $disk->delete($path);

        if ($disk->exists($path)) {
            $this->error('The test object could not be deleted.');

            return self::FAILURE;
        }

        $this->info("Uploads work on the {$diskName} disk.");

        if ($diskName === 's3' && blank(config('filesystems.disks.s3.url'))) {
            $this->warn('AWS_URL is empty, so this disk cannot build a public URL. Point AWS_URL at the CDN or bucket origin and set VITE_ASSET_URL for the frontend build.');
        }

        return self::SUCCESS;
    }
}
