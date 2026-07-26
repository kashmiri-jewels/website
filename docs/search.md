# Product Search

Product search is powered by `@orama/orama` and runs locally over the generated catalog.

Current behavior:

- Builds a cached in-memory Orama index from the generated catalog produced during publish
- Searches title, description, category, color, details, and sizes
- Boosts title, category, color, and size matches
- Allows one-character typo tolerance for longer queries
- Keeps query, category, and sort in the URL
- Runs in TanStack Router loaders, so search results are SSR-rendered and shareable

The integration lives in `src/data/product-search.ts`.

This is intentionally backend-free. A future semantic upgrade can add Orama vector or hybrid search by generating product embeddings at catalog sync time and adding a query embedding strategy on the frontend.
