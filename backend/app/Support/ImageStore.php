<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class ImageStore
{
    /**
     * The disk used for user-uploaded images. Defaults to the public local
     * disk so development keeps working; production sets UPLOADS_DISK=s3.
     */
    public static function disk(): string
    {
        return (string) config('filesystems.uploads_disk', 'public');
    }

    public static function put(UploadedFile $file, string $folder): string
    {
        $path = $file->store($folder, [
            'disk' => self::disk(),
            // Stored names are random, so a cached object never goes stale.
            // This lets a CDN and the browser keep uploads for a year.
            'CacheControl' => 'public, max-age=31536000, immutable',
        ]);

        if ($path === false) {
            throw new \RuntimeException('The upload could not be stored on the '.self::disk().' disk.');
        }

        return $path;
    }

    public static function delete(?string $path): void
    {
        if (!$path) {
            return;
        }

        try {
            Storage::disk(self::disk())->delete($path);
        } catch (\Throwable $e) {
            // A storage cleanup failure must not break the profile or listing
            // update that already succeeded.
            report($e);
        }
    }
}
