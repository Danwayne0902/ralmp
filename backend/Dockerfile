# syntax=docker/dockerfile:1

FROM php:8.2-cli-alpine

WORKDIR /app

RUN apk add --no-cache \
        bash \
        git \
        unzip \
        libzip-dev \
    && docker-php-ext-install -j"$(nproc)" \
        bcmath \
        pdo \
        pdo_mysql \
        zip \
    && rm -rf /var/cache/apk/*

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

RUN chmod +x docker/entrypoint.sh \
    && mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache

ENV APP_ENV=production \
    APP_DEBUG=false \
    LOG_CHANNEL=stderr

EXPOSE 8000

ENTRYPOINT ["docker/entrypoint.sh"]
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
