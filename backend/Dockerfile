# syntax=docker/dockerfile:1

FROM php:8.2-fpm-alpine

WORKDIR /app

# nginx + supervisor serve the app; the same image runs the queue worker with
# a different command. pcntl lets queue:work shut down cleanly.
RUN apk add --no-cache \
        bash \
        git \
        unzip \
        libzip-dev \
        nginx \
        supervisor \
        $PHPIZE_DEPS \
    && docker-php-ext-install -j"$(nproc)" \
        bcmath \
        opcache \
        pcntl \
        pdo \
        pdo_mysql \
        zip \
    && yes '' | pecl install redis-6.3.0 \
    && docker-php-ext-enable redis \
    && apk del $PHPIZE_DEPS \
    && rm -rf /var/cache/apk/* /tmp/pear

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Install dependencies before copying the source so Docker can cache this layer.
# Scripts are deferred because artisan/package:discover needs the full app.
COPY composer.json composer.lock ./
RUN composer install \
        --no-dev \
        --no-interaction \
        --no-progress \
        --prefer-dist \
        --no-scripts \
        --no-autoloader

COPY . .

RUN composer dump-autoload --no-dev --optimize --classmap-authoritative

COPY docker/nginx.conf /etc/nginx/http.d/default.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/php-fpm.conf /usr/local/etc/php-fpm.d/zz-ramlp.conf
COPY docker/php.ini /usr/local/etc/php/conf.d/zz-ramlp.ini

RUN chmod +x docker/entrypoint.sh \
    && mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && (php artisan storage:link || true)

ENV APP_ENV=production \
    APP_DEBUG=false \
    LOG_CHANNEL=stderr \
    RUN_MIGRATIONS=0

EXPOSE 8000

ENTRYPOINT ["docker/entrypoint.sh"]
# The web container runs nginx and php-fpm together under supervisor.
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
