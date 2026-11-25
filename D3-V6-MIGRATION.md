# D3 v6 migration and chart improvements

This branch upgrades the timeline chart to D3 v6 and modernizes its core interactions.

## Changes

- Migrated zoom and drag handlers to D3 v6 event arguments (`event, datum`); no code relies on the removed global `d3.event`.
- Reworked lane allocation to avoid overlapping activities within a category and made row sizing configurable.
- Added safe date normalization, empty-data handling, padded time domains, and stable activity keys.
- Improved chart rendering with category bands, readable axes, a subtle time grid, and descriptive activity labels.
- Added horizontal zoom, activity dragging between categories, and start/end resize handles.
- Made the save button store valid JSON in local storage and made edit buttons optional when their containers are absent.
- Added chart setters for dimensions, margins, row height, category selection, and data updates.

## Integration note

Load D3 v6 before `src/pegChart.js` and initialize the chart with an element and activity array. The chart module is self-contained and does not require the separate legacy date-format helper.

## Verification

The source was reviewed for D3 v6 callback conventions. This repository does not currently include an automated test/build setup, so interactive behavior should be checked in the browser with the examples before merging.
