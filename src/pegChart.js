/* PegChart: interactive timeline chart built for D3 v6. */
(function (global, factory) {
    if (typeof module === "object" && module.exports) module.exports = factory();
    else if (typeof define === "function" && define.amd) define(factory);
    else global.pegChart = factory();
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
    "use strict";
    function timelines() {
        var settings = {
            width: null, maxHeight: 1500, rowHeight: 28, minBarHeight: 16, maxBarHeight: 21,
            margin: { top: 8, right: 24, bottom: 26, left: 140 }, category: "group",
            colors: ["#0072B2", "#E69F00", "#009E73", "#D55E00", "#CC79A7", "#56B4E9", "#F0E442", "#333333"],
            laneAccents: ["#0072B2", "#E69F00", "#009E73", "#D55E00", "#CC79A7", "#56B4E9"]
        };
        var host, svg, plot, overlay, baseXScale, xScale, yScale, colorScale, zoom;
        var resizeObserver, resizeTimer;
        var data = [], lanes = [], plotHeight = 0, rowCount = 1, rowHeight = settings.rowHeight, barHeight = 21;
        var uniqueId = "peg-chart-" + Math.random().toString(36).slice(2, 10), clipId = uniqueId + "-clip";

        function date(value) {
            var parsed = value instanceof Date ? new Date(value.getTime()) : new Date(value);
            return isNaN(parsed.getTime()) ? null : parsed;
        }
        function normalize(items) {
            return (items || []).map(function (item, index) {
                var start = date(item.start), finish = date(item.finish);
                if (!start || !finish) throw new Error("Each activity needs valid start and finish dates.");
                return Object.assign({}, item, {
                    start: start, finish: finish, _id: item._id || (uniqueId + "-" + index),
                    _category: item[settings.category] == null ? "Uncategorised" : String(item[settings.category])
                });
            });
        }
        function allocateLanes() {
            var categories = Array.from(new Set(data.map(function (item) { return item._category; }))).sort();
            lanes = [];
            categories.forEach(function (category) {
                var items = data.filter(function (item) { return item._category === category; })
                    .sort(function (a, b) { return a.start - b.start || a.finish - b.finish; });
                var ends = [];
                items.forEach(function (item) {
                    var lane = ends.findIndex(function (end) { return end <= item.start; });
                    if (lane < 0) lane = ends.length;
                    ends[lane] = item.finish; item._lane = lane;
                });
                lanes.push({ category: category, count: Math.max(1, ends.length), firstRow: 0 });
            });
            var row = 0;
            lanes.forEach(function (group) { group.firstRow = row; row += group.count; });
            data.forEach(function (item) {
                var group = lanes.find(function (entry) { return entry.category === item._category; });
                item._row = group.firstRow + item._lane;
            });
            rowCount = Math.max(1, row);
            var configuredPlotMax = Math.max(settings.minBarHeight * rowCount,
                settings.maxHeight - settings.margin.top - settings.margin.bottom);
            var hostTop = host ? Math.max(0, host.getBoundingClientRect().top) : 0;
            var viewportPlotSpace = window.innerHeight
                ? window.innerHeight - hostTop - settings.margin.top - settings.margin.bottom
                : configuredPlotMax;
            var availablePlotHeight = Math.max(settings.minBarHeight * rowCount,
                Math.min(configuredPlotMax, viewportPlotSpace));
            var maxRowHeight = settings.maxBarHeight / 0.76;
            var preferredRowHeight = Math.min(settings.rowHeight, maxRowHeight);
            plotHeight = Math.min(rowCount * preferredRowHeight, availablePlotHeight);
            rowHeight = plotHeight / rowCount;
            barHeight = Math.min(settings.maxBarHeight, Math.max(settings.minBarHeight, rowHeight * 0.76));
        }
        function dateDomain() {
            var starts = data.map(function (item) { return item.start; }), finishes = data.map(function (item) { return item.finish; });
            if (!starts.length) {
                var now = new Date();
                return [new Date(now.getFullYear(), now.getMonth() - 1, 1), new Date(now.getFullYear(), now.getMonth() + 2, 1)];
            }
            var min = d3.min(starts), max = d3.max(finishes);
            if (+min === +max) { min = new Date(+min - 86400000); max = new Date(+max + 86400000); }
            var padding = Math.max(86400000, (max - min) * 0.025);
            return [new Date(+min - padding), new Date(+max + padding)];
        }
        function resolvedWidth() {
            if (settings.width !== null) return Math.max(200, Math.floor(settings.width));
            var w = host ? Math.floor(host.getBoundingClientRect().width) : 0;
            if (!w && host && host.parentElement) w = Math.floor(host.parentElement.getBoundingClientRect().width);
            if (!w) w = Math.floor(window.innerWidth || 1000);
            return Math.max(200, w);
        }
        function nearestCategory(y) {
            var row = Math.max(0, Math.min(Math.round(y / rowHeight - 0.5), rowCount - 1));
            var nearest = data.slice().sort(function (a, b) { return Math.abs(a._row - row) - Math.abs(b._row - row); })[0];
            return nearest ? nearest._category : settings.category;
        }
        function updateZoomedTimeline(transform) {
            if (!baseXScale) return;
            xScale = transform.rescaleX(baseXScale);
            plot.select(".x-axis").call(d3.axisBottom(xScale).ticks(8).tickFormat(d3.timeFormat("%b %Y")));
            plot.select(".x-axis-top").call(d3.axisTop(xScale).ticks(8).tickFormat(d3.timeFormat("%b %Y")));
            plot.select(".x-grid").call(d3.axisTop(xScale).ticks(8).tickSize(-plotHeight).tickFormat(""));
            plot.select(".activities").selectAll("g.activity").attr("transform", function (item) {
                return "translate(" + xScale(item.start) + "," + (yScale(item._row) + rowHeight / 2 - barHeight / 2) + ")";
            });
            plot.select(".activities").selectAll(".activity-bar").attr("width", function (item) { return Math.max(2, xScale(item.finish) - xScale(item.start)); }).attr("height", barHeight);
            plot.select(".activities").selectAll(".resize-handle").attr("height", barHeight);
            plot.select(".activities").selectAll(".resize-finish").attr("x", function (item) { return Math.max(2, xScale(item.finish) - xScale(item.start)) - 3; });
            plot.select(".activities").selectAll(".activity-label").attr("y", Math.min(barHeight * 0.55, rowHeight * 0.5));
            plot.select(".x-grid").selectAll(".tick line").attr("stroke", "#d8dee4").attr("stroke-dasharray", "2,3");
        }
        function updateBarDuringResize(selection, item, resizeStart) {
            var w = Math.max(2, xScale(item.finish) - xScale(item.start));
            selection.select(".activity-bar").attr("width", w).attr("height", barHeight);
            selection.selectAll(".resize-handle").attr("height", barHeight);
            selection.select(".resize-finish").attr("x", w - 3);
            if (resizeStart) selection.attr("transform", "translate(" + xScale(item.start) + "," + (yScale(item._row) + rowHeight / 2 - barHeight / 2) + ")");
        }
        function render() {
            if (!svg) return;
            allocateLanes();
            var width = resolvedWidth(), innerWidth = Math.max(1, width - settings.margin.left - settings.margin.right);
            var height = plotHeight + settings.margin.top + settings.margin.bottom;
            svg.attr("width", width).attr("height", height).attr("viewBox", "0 0 " + width + " " + height);
            plot.attr("transform", "translate(" + settings.margin.left + "," + settings.margin.top + ")");
            svg.select("#" + clipId + " rect").attr("width", innerWidth).attr("height", plotHeight);
            overlay.attr("width", innerWidth).attr("height", plotHeight);
            zoom.extent([[0, 0], [innerWidth, plotHeight]]).translateExtent([[0, 0], [innerWidth, plotHeight]]);
            baseXScale = d3.scaleTime().domain(dateDomain()).range([0, innerWidth]);
            yScale = d3.scaleLinear().domain([0, rowCount]).range([0, plotHeight]);
            colorScale = d3.scaleOrdinal(settings.colors).domain(Array.from(new Set(data.map(function (item) { return item.label || "Activity"; }))));
            updateZoomedTimeline(d3.zoomTransform(overlay.node()));
            plot.select(".x-axis").attr("transform", "translate(0," + plotHeight + ")");
            plot.select(".x-axis-top").attr("transform", "translate(0,0)");
            plot.select(".y-axis").call(d3.axisLeft(yScale).tickValues(lanes.map(function (g) { return g.firstRow + g.count / 2; }))
                .tickFormat(function (value) {
                    var group = lanes.find(function (entry) { return value >= entry.firstRow && value <= entry.firstRow + entry.count; });
                    return group ? group.category : "";
                }).tickSize(0)).selectAll("text").attr("fill", "#17202a").style("font-size", "13px").style("font-weight", "700");
            var bandHost = plot.select(".category-bands");
            var bands = bandHost.selectAll(".category-band").data(lanes, function (d) { return d.category; });
            bands.exit().remove();
            bands.enter().append("rect").attr("class", "category-band").merge(bands)
                .attr("x", 0).attr("width", innerWidth).attr("y", function (d) { return yScale(d.firstRow); })
                .attr("height", function (d) { return yScale(d.firstRow + d.count) - yScale(d.firstRow); })
                .attr("fill", function (d, i) { return i % 2 ? "#e9eef3" : "#ffffff"; });
            var accents = bandHost.selectAll(".category-accent").data(lanes, function (d) { return d.category; });
            accents.exit().remove();
            accents.enter().append("rect").attr("class", "category-accent").merge(accents)
                .attr("x", 0).attr("width", 5).attr("y", function (d) { return yScale(d.firstRow); })
                .attr("height", function (d) { return yScale(d.firstRow + d.count) - yScale(d.firstRow); })
                .attr("fill", function (d, i) { return settings.laneAccents[i % settings.laneAccents.length]; });
            var dividers = bandHost.selectAll(".category-divider").data(lanes.filter(function (d) { return d.firstRow > 0; }), function (d) { return d.category; });
            dividers.exit().remove();
            dividers.enter().append("line").attr("class", "category-divider").merge(dividers)
                .attr("x1", 0).attr("x2", innerWidth).attr("y1", function (d) { return yScale(d.firstRow); }).attr("y2", function (d) { return yScale(d.firstRow); })
                .attr("stroke", "#b8c2cc").attr("stroke-width", 1);
            var activityLayer = plot.select(".activities");
            var bars = activityLayer.selectAll("g.activity").data(data, function (d) { return d._id; });
            bars.exit().remove();
            var entered = bars.enter().append("g").attr("class", "activity");
            entered.append("rect").attr("class", "activity-bar");
            entered.append("text").attr("class", "activity-label").attr("dominant-baseline", "middle");
            entered.append("rect").attr("class", "resize-handle resize-start");
            entered.append("rect").attr("class", "resize-handle resize-finish");
            bars = entered.merge(bars);
            bars.attr("transform", function (item) { return "translate(" + xScale(item.start) + "," + (yScale(item._row) + rowHeight / 2 - barHeight / 2) + ")"; });
            bars.select(".activity-bar").attr("width", function (item) { return Math.max(2, xScale(item.finish) - xScale(item.start)); })
                .attr("height", barHeight).attr("rx", 2).attr("fill", function (item) { return colorScale(item.label || "Activity"); });
            bars.select(".activity-bar").selectAll("title").data(function (item) { return [item]; }).join("title")
                .text(function (item) { return item.description || item.label || "Activity"; });
            bars.select(".activity-label").attr("x", 5).attr("y", Math.min(barHeight * 0.55, rowHeight * 0.5))
                .attr("fill", "#17202a").attr("font-size", Math.max(8, Math.min(13, barHeight * 0.55)))
                .text(function (item) { return item.description || item.label || ""; });
            bars.select(".resize-start").attr("x", -2).attr("y", 0).attr("width", 5).attr("height", barHeight);
            bars.select(".resize-finish").attr("x", function (item) { return Math.max(2, xScale(item.finish) - xScale(item.start)) - 3; })
                .attr("y", 0).attr("width", 5).attr("height", barHeight);
            // D3 drag event.dy is the incremental movement since the previous event.
            // Accumulate it for the bar's current y-position to prevent vertical jitter.
            var dragCenterY = 0;
            bars.call(d3.drag().on("start", function (event, item) {
                dragCenterY = yScale(item._row) + rowHeight / 2;
                d3.select(this).raise().classed("is-dragging", true);
            }).on("drag", function (event, item) {
                item.start = new Date(+xScale.invert(xScale(item.start) + event.dx));
                item.finish = new Date(+xScale.invert(xScale(item.finish) + event.dx));
                dragCenterY += event.dy;
                item._category = nearestCategory(dragCenterY);
                item[settings.category] = item._category;
                d3.select(this).attr("transform", "translate(" + xScale(item.start) + "," + (dragCenterY - barHeight / 2) + ")");
            }).on("end", function () { d3.select(this).classed("is-dragging", false); render(); }));
            bars.select(".resize-start").call(d3.drag().container(function () { return overlay.node(); })
                .on("drag", function (event, item) {
                    item.start = new Date(+xScale.invert(xScale(item.start) + event.dx));
                    if (item.start > item.finish) item.start = new Date(item.finish);
                    updateBarDuringResize(d3.select(this.parentNode), item, true);
                }).on("end", function () { render(); }));
            bars.select(".resize-finish").call(d3.drag().container(function () { return overlay.node(); })
                .on("drag", function (event, item) {
                    item.finish = new Date(+xScale.invert(xScale(item.finish) + event.dx));
                    if (item.finish < item.start) item.finish = new Date(item.start);
                    updateBarDuringResize(d3.select(this.parentNode), item, false);
                }).on("end", function () { render(); }));
        }
        function attachButton(id, label, action) {
            var container = document.getElementById(id); if (!container) return;
            var button = document.createElement("button"); button.type = "button"; button.textContent = label;
            button.addEventListener("click", action); container.appendChild(button);
        }
        function chart(node, items) {
            host = typeof node === "string" ? document.querySelector(node) : node;
            if (!host) throw new Error("PegChart target element was not found.");
            data = normalize(items); host.innerHTML = "";
            svg = d3.select(host).append("svg").attr("class", "peg-chart").attr("role", "img")
                .attr("aria-label", "Interactive project timeline").style("display", "block").style("width", "100%").style("max-width", "100%");
            svg.append("defs").append("clipPath").attr("id", clipId).attr("clipPathUnits", "userSpaceOnUse").append("rect");
            plot = svg.append("g").attr("class", "plot");
            plot.append("g").attr("class", "category-bands").attr("pointer-events", "none");
            plot.append("g").attr("class", "x-grid").attr("clip-path", "url(#" + clipId + ")").attr("pointer-events", "none");
            plot.append("g").attr("class", "x-axis-top");
            overlay = plot.append("rect").attr("class", "zoom-overlay").attr("fill", "transparent").style("pointer-events", "all");
            plot.append("g").attr("class", "activities").attr("clip-path", "url(#" + clipId + ")");
            plot.append("g").attr("class", "x-axis"); plot.append("g").attr("class", "y-axis");
            zoom = d3.zoom().scaleExtent([0.5, 32]).on("zoom", function (event) { updateZoomedTimeline(event.transform); });
            overlay.call(zoom);
            attachButton("savebtn", "Save to local storage", function () {
                var serializable = data.map(function (item) {
                    var copy = Object.assign({}, item);
                    delete copy._id; delete copy._category; delete copy._lane; delete copy._row;
                    copy.start = item.start.toISOString().slice(0, 10); copy.finish = item.finish.toISOString().slice(0, 10); return copy;
                });
                try { localStorage.setItem("myData", JSON.stringify(serializable)); }
                catch (error) { window.alert("Could not save chart data: " + error.message); }
            });
            attachButton("newbtn", "Add new", function () {
                var description = window.prompt("Enter activity description"); if (description === null) return;
                var latest = d3.max(data, function (item) { return item.finish; }) || new Date();
                var start = new Date(+latest); start.setDate(start.getDate() - 30);
                var item = { group: "New", label: "New", start: start, finish: new Date(latest), description: description };
                item[settings.category] = "New"; data.push.apply(data, normalize([item])); render();
            });
            attachButton("deletebtn", "Show delete", function () {
                var latest = d3.max(data, function (item) { return item.finish; }) || new Date();
                var start = new Date(+latest); start.setDate(start.getDate() - 30);
                var item = { group: "|Delete", label: "|Delete", start: start, finish: new Date(latest), description: "Move activities here to mark them for deletion." };
                item[settings.category] = "|Delete"; data.push.apply(data, normalize([item])); render();
            });
            attachButton("emptybtn", "Empty delete", function () { data = data.filter(function (item) { return item._category !== "|Delete"; }); render(); });
            render();
            if (typeof ResizeObserver !== "undefined") {
                resizeObserver = new ResizeObserver(function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(render, 50); });
                resizeObserver.observe(host);
            }
            window.addEventListener("resize", function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(render, 50); });
            return chart;
        }
        function setter(name, getter, apply) {
            chart[name] = function (value) {
                if (!arguments.length) return getter();
                apply(value); if (svg) render(); return chart;
            };
        }
        setter("width", function () { return settings.width; }, function (value) {
            if (value === null || value === undefined || value === "auto" || value === "responsive") settings.width = null;
            else settings.width = Math.max(200, +value || 1000);
        });
        setter("maxHeight", function () { return settings.maxHeight; }, function (value) { settings.maxHeight = Math.max(100, +value || 1500); });
        setter("rowHeight", function () { return settings.rowHeight; }, function (value) { settings.rowHeight = Math.max(12, +value || 28); });
        setter("minBarHeight", function () { return settings.minBarHeight; }, function (value) {
            settings.minBarHeight = Math.max(4, +value || 16);
            settings.maxBarHeight = Math.max(settings.maxBarHeight, settings.minBarHeight);
        });
        setter("maxBarHeight", function () { return settings.maxBarHeight; }, function (value) { settings.maxBarHeight = Math.max(settings.minBarHeight, +value || 21); });
        setter("leftMargin", function () { return settings.margin.left; }, function (value) { settings.margin.left = Math.max(0, +value || 0); });
        setter("rightMargin", function () { return settings.margin.right; }, function (value) { settings.margin.right = Math.max(0, +value || 0); });
        setter("topMargin", function () { return settings.margin.top; }, function (value) { settings.margin.top = Math.max(0, +value || 0); });
        setter("bottomMargin", function () { return settings.margin.bottom; }, function (value) { settings.margin.bottom = Math.max(0, +value || 0); });
        setter("category", function () { return settings.category; }, function (value) {
            settings.category = String(value || "group");
            data.forEach(function (item) { item._category = item[settings.category] == null ? "Uncategorised" : String(item[settings.category]); });
        });
        chart.data = function (value) {
            if (!arguments.length) return data.slice();
            data = normalize(value); if (svg) render(); return chart;
        };
        return chart;
    }
    return timelines;
}));
