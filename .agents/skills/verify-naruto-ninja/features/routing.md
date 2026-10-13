# Field guide and missing scrolls

Use the Field guide link in the training room to open `/guide`. Its chapters explain manual practice, personal calibration, source limitations and local privacy. The footer returns to practice. On phones the link is beside the input status, above the movable panel.

Run `npm run test:e2e -- --grep "field guide navigation" --trace on` after a production build. Verify the URL, unique page title, focus landing on the main region, return link, and sequence-circle `data-progress`. Request an unknown URL and assert HTTP 404, a visible missing-scroll heading, noindex and a working return link. Reduced motion bypasses the curtain and smooth scrolling.
