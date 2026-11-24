<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;

class Search
{
    /**
     * Search text columns with MySQL FULLTEXT when possible, and fall back to
     * LIKE on SQLite (tests) or when the term is too short for the index.
     */
    public static function apply(Builder $query, string $term, array $columns): Builder
    {
        $term = trim($term);

        if ($term === '') {
            return $query;
        }

        if ($query->getConnection()->getDriverName() === 'mysql' && mb_strlen($term) >= 3) {
            $boolean = self::booleanTerm($term);

            if ($boolean !== '') {
                return $query->whereRaw(
                    'MATCH(' . implode(', ', $columns) . ') AGAINST (? IN BOOLEAN MODE)',
                    [$boolean],
                );
            }
        }

        return $query->where(function (Builder $nested) use ($term, $columns) {
            foreach ($columns as $index => $column) {
                $method = $index === 0 ? 'where' : 'orWhere';
                $nested->{$method}($column, 'like', '%' . $term . '%');
            }
        });
    }

    private static function booleanTerm(string $term): string
    {
        $words = preg_split('/\s+/u', $term) ?: [];
        $parts = [];

        foreach ($words as $word) {
            // Boolean-mode operators are not user input.
            $word = trim(preg_replace('/[+\-<>()~*"@]/u', '', $word) ?? '');

            if ($word === '' || mb_strlen($word) < 3) {
                continue;
            }

            $parts[] = '+' . $word . '*';
        }

        return implode(' ', $parts);
    }
}
