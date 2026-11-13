# Official Spread TypeScript kit

Downloaded from https://spread.bahnexpress.com/kit/spread-typescript.tar.gz on 13 November 2026.

`spread.ts`, `types.ts`, `starter.ts`, and `reveal-csv.ts` are the unmodified official kit files. The team's implementation imports the client and types from here. Team policy changes belong in `src/`.

The official starter is available for comparison:

```sh
node --env-file=.env vendor/spread/starter.ts --level 1 --seed spread-1
```

The exporter can write detailed CSV files for an ended practice world:

```sh
node --env-file=.env vendor/spread/reveal-csv.ts WORLD_ID
```

Ranking worlds cannot be revealed. See the official handbook in `docs/reference/`.
