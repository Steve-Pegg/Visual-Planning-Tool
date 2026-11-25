# Visual Planning Tool
An interactive Gantt-like chart for visualising project and portfolio information.

## Quick start

Include D3 v6 and the chart module, then call the chart with an element and activity data:

```html
<script src="https://d3js.org/d3.v6.min.js"></script>
<script src="src/pegChart.js"></script>
```

```js
var chart = pegChart().category("group").leftMargin(140).width(1000);
chart(document.getElementById("myPlot"), [
  { group: "Planning", label: "Design", start: "2026-01-01", finish: "2026-02-01", description: "Plan the work" }
]);
```

Activities must provide valid `start` and `finish` dates. The default category is `group`; use `.category("label")` to group by another field. The chart includes optional buttons when elements with IDs `savebtn`, `newbtn`, `deletebtn`, and `emptybtn` exist.

## Features

- Zoomable time axis and draggable activities.
- Drag the activity edges to resize dates.
- Automatic non-overlapping lanes within each category.
- Optional local-storage save and activity-management buttons.
- Configurable dimensions, margins, row height, and grouping field.

See `example/index.html` for a runnable example and `D3-V6-MIGRATION.md` for migration details.
