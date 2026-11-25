/*
 * PegChart: interactive timeline chart built for D3 v6.
 * Data items use { group, label, start, finish, description } by default.
 */
(function (global, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else if (typeof define === "function" && define.amd) {
        define(factory);
    } else {
        global.pegChart = factory();
    }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
    "use strict";

    function timelines() {
        var settings = {
            width: 1000,
            maxHeight: 1500,
            rowHeight: 28,
            margin: { top: 28, right: 24, bottom: 42, left: 140 },
            category: "group",
            colors: ["#EDBB99", "#73C6B6", "#85C1E9", "#95A5A6", "#F4D03F", "#D5DBDB", "#FEF9E7", "#EBDEF0", "#D2B4DE"]
        };
        var host, svg, plot, xScale, yScale, colorScale, zoom, data = [], categories = [], lanes = [], plotHeight = 0;
        var uniqueId = "peg-chart-" + Math.random().toString(36).slice(2, 10);

        function date(value) {
            var parsed = value instanceof Date ? new Date(value.getTime()) : new Date(value);
            return isNaN(parsed.getTime()) ? null : parsed;
        }

        function normalize(items) {
            return (items || []).map(function (item, index) {
                var start = date(item.start);
                var finish = date(item.finish);
                if (!start || !finish) {
                    throw new Error("Each activity needs valid start and finish dates.");
                }
                return Object.assign({}, item, {
                    start: start,
                    finish: finish,
                    _id: item._id || (uniqueId + "-" + index),
                    _category: item[settings.category] == null ? "Uncategorised" : String(item[settings.category])
                });
            });
        }

        function allocateLanes() {
            categories = Array.from(new Set(data.map(function (item) { return item._category; }))).sort();
            lanes = [];
            categories.forEach(function (category) {
                var categoryItems = data.filter(function (item) { return item._category === category; })
                    .sort(function (a, b) { return a.start - b.start || a.finish - b.finish; });
                var ends = [];
                categoryItems.forEach(function (item) {
                    var lane = ends.findIndex(function (end) { return end <= item.start; });
                    if (lane < 0) lane = ends.length;
                    ends[lane] = item.finish;
                    item._lane = lane;
                    item._row = lanes.length + lane;
                });
                lanes.push({ category: category, count: Math.max(1, ends.length), firstRow: lanes.length });
            });
            plotHeight = Math.max(settings.rowHeight, Math.min(settings.maxHeight - settings.margin.top - settings.margin.bottom,
                Math.max(1, data.length ? lanes.reduce(function (sum, group) { return sum + group.count; }, 0) : 1) * settings.rowHeight));
            var row = 0;
            lanes.forEach(function (group) {
                group.firstRow = row;
                row += group.count;
            });
            data.forEach(function (item) {
                var group = lanes.find(function (entry) { return entry.category === item._category; });
                item._row = group.firstRow + item._lane;
            });
        }

        function domain() {
            var starts = data.map(function (item) { return item.start; });
            var finishes = data.map(function (item) { return item.finish; });
            if (!starts.length) {
                var now = new Date();
                return [new Date(now.getFullYear(), now.getMonth() - 1, 1), new Date(now.getFullYear(), now.getMonth() + 2, 1)];
            }
            var min = d3.min(starts), max = d3.max(finishes);
            if (+min === +max) {
                min = new Date(+min - 86400000);
                max = new Date(+max + 86400000);
            }
            var padding = Math.max(86400000, (max - min) * 0.025);
            return [new Date(+min - padding), new Date(+max + padding)];
        }

        function rowCenter(item) {
            return (item._row + 0.5) * (plotHeight / Math.max(1, data.reduce(function (n, d) { return Math.max(n, d._row + 1); }, 0)));
        }

        function nearestCategory(y) {
            var rowHeight = plotHeight / Math.max(1, data.reduce(function (n, d) { return Math.max(n, d._row + 1); }, 0));
            var row = Math.max(0, Math.min(Math.round(y / rowHeight - 0.5), data.reduce(function (n, d) { return Math.max(n, d._row); }, 0)));
            var nearest = data.slice().sort(function (a, b) { return Math.abs(a._row - row) - Math.abs(b._row - row); })[0];
            return nearest ? nearest._category : settings.category;
        }

        function render() {
            if (!svg) return;
            allocateLanes();
            var innerWidth = Math.max(1, settings.width - settings.margin.left - settings.margin.right);
            var height = plotHeight + settings.margin.top + settings.margin.bottom;
            svg.attr("width", settings.width).attr("height", height);
            xScale = d3.scaleTime().domain(domain()).range([0, innerWidth]);
            var rowCount = Math.max(1, data.reduce(function (n, item) { return Math.max(n, item._row + 1); }, 0));
            yScale = d3.scaleLinear().domain([0, rowCount]).range([0, plotHeight]);
            colorScale = d3.scaleOrdinal(settings.colors).domain(Array.from(new Set(data.map(function (item) { return item.label || "Activity"; }))));
            plot.attr("transform", "translate(" + settings.margin.left + "," + settings.margin.top + ")");

            var xAxis = d3.axisBottom(xScale).ticks(Math.max(2, Math.floor(innerWidth / 110))).tickFormat(d3.timeFormat("%b %Y"));
            plot.select(".x-axis").attr("transform", "translate(0," + plotHeight + ")").call(xAxis);
            plot.select(".x-grid").attr("transform", "translate(0,0)")
                .call(d3.axisTop(xScale).ticks(Math.max(2, Math.floor(innerWidth / 110))).tickSize(-plotHeight).tickFormat(""));
            plot.select(".y-axis").call(d3.axisLeft(yScale).tickValues(lanes.map(function (group) {
                return group.firstRow + group.count / 2;
            })).tickFormat(function (value) {
                var group = lanes.find(function (entry) { return value >= entry.firstRow && value <= entry.firstRow + entry.count; });
                return group ? group.category : "";
            }).tickSize(0));

            var groups = plot.selectAll(".category-band").data(lanes, function (d) { return d.category; });
            groups.exit().remove();
            groups = groups.enter().append("rect").attr("class", "category-band").merge(groups)
                .attr("x", 0).attr("width", innerWidth)
                .attr("y", function (d) { return yScale(d.firstRow); })
                .attr("height", function (d) { return yScale(d.count); })
                .attr("fill", function (d, i) { return i % 2 ? "#f4f6f8" : "#ffffff"; });

            var bars = plot.selectAll("g.activity").data(data, function (d) { return d._id; });
            bars.exit().remove();
            var entered = bars.enter().append("g").attr("class", "activity");
            entered.append("rect").attr("class", "activity-bar");
            entered.append("text").attr("class", "activity-label").attr("dominant-baseline", "middle");
            entered.append("rect").attr("class", "resize-handle resize-start");
            entered.append("rect").attr("class", "resize-handle resize-finish");
            bars = entered.merge(bars);
            var rowHeight = plotHeight / rowCount;
            bars.attr("transform", function (item) { return "translate(" + xScale(item.start) + "," + (yScale(item._row) + rowHeight * 0.12) + ")"; });
            bars.select(".activity-bar").attr("width", function (item) { return Math.max(2, xScale(item.finish) - xScale(item.start)); })
                .attr("height", Math.max(8, rowHeight * 0.76)).attr("rx", 2)
                .attr("fill", function (item) { return colorScale(item.label || "Activity"); })
                .append("title").text(function (item) { return item.description || item.label || "Activity"; });
            bars.select(".activity-label").attr("x", 5).attr("y", rowHeight * 0.38)
                .attr("fill", "#17202a").attr("font-size", Math.max(10, Math.min(13, rowHeight * 0.42)))
                .text(function (item) { return item.description || item.label || ""; });
            bars.select(".resize-start").attr("x", -2).attr("y", 0).attr("width", 5).attr("height", Math.max(8, rowHeight * 0.76));
            bars.select(".resize-finish").attr("x", function (item) { return Math.max(2, xScale(item.finish) - xScale(item.start)) - 3; })
                .attr("y", 0).attr("width", 5).attr("height", Math.max(8, rowHeight * 0.76));

            bars.call(d3.drag().on("start", function (event) { d3.select(this).raise().classed("is-dragging", true); })
                .on("drag", function (event, item) {
                    item.start = new Date(+xScale.invert(xScale(item.start) + event.dx));
                    item.finish = new Date(+xScale.invert(xScale(item.finish) + event.dx));
                    item._category = nearestCategory(yScale(item._row) + event.dy + rowHeight / 2);
                    item[settings.category] = item._category;
                    d3.select(this).attr("transform", "translate(" + xScale(item.start) + "," + (yScale(item._row) + event.dy + rowHeight * 0.12) + ")");
                })
                .on("end", function () { d3.select(this).classed("is-dragging", false); render(); }));

            bars.select(".resize-start").call(d3.drag().on("drag", function (event, item) {
                item.start = new Date(+xScale.invert(xScale(item.start) + event.dx));
                if (item.start > item.finish) item.start = new Date(item.finish);
                render();
            }));
            bars.select(".resize-finish").call(d3.drag().on("drag", function (event, item) {
                item.finish = new Date(+xScale.invert(xScale(item.finish) + event.dx));
                if (item.finish < item.start) item.finish = new Date(item.start);
                render();
            }));
            plot.select(".x-grid").selectAll(".tick line").attr("stroke", "#d8dee4").attr("stroke-dasharray", "2,3");
        }

        function refresh() { render(); return chart; }
        function attachButton(id, label, action) {
            var container = document.getElementById(id);
            if (!container) return;
            var button = document.createElement("button");
            button.type = "button";
            button.textContent = label;
            button.addEventListener("click", action);
            container.appendChild(button);
        }
        function updateAfterEdit() { render(); }

        function chart(node, items) {
            host = typeof node === "string" ? document.querySelector(node) : node;
            if (!host) throw new Error("PegChart target element was not found.");
            data = normalize(items);
            host.innerHTML = "";
            svg = d3.select(host).append("svg").attr("class", "peg-chart").attr("role", "img").attr("aria-label", "Interactive project timeline");
            plot = svg.append("g").attr("class", "plot");
            plot.append("g").attr("class", "x-grid");
            plot.append("g").attr("class", "category-bands");
            plot.append("g").attr("class", "activities");
            plot.append("g").attr("class", "x-axis");
            plot.append("g").attr("class", "y-axis");
            plot.select(".category-bands").lower();
            zoom = d3.zoom().scaleExtent([0.5, 32]).on("zoom", function (event) {
                if (!data.length) return;
                xScale = event.transform.rescaleX(xScale);
                plot.select(".x-axis").call(d3.axisBottom(xScale).ticks(8).tickFormat(d3.timeFormat("%b %Y")));
                plot.selectAll("g.activity").attr("transform", function (item) { return "translate(" + xScale(item.start) + "," + (yScale(item._row) + plotHeight / Math.max(1, data.length) * 0.12) + ")"; });
                plot.selectAll(".activity-bar").attr("width", function (item) { return Math.max(2, xScale(item.finish) - xScale(item.start)); });
                plot.selectAll(".resize-finish").attr("x", function (item) { return Math.max(2, xScale(item.finish) - xScale(item.start)) - 3; });
                plot.select(".x-grid").call(d3.axisTop(xScale).ticks(8).tickSize(-plotHeight).tickFormat(""));
            });
            svg.call(zoom);
            attachButton("savebtn", "Save to local storage", function () {
                var serializable = data.map(function (item) {
                    var copy = Object.assign({}, item);
                    delete copy._id; delete copy._category; delete copy._lane; delete copy._row;
                    copy.start = item.start.toISOString().slice(0, 10);
                    copy.finish = item.finish.toISOString().slice(0, 10);
                    return copy;
                });
                try { localStorage.setItem("myData", JSON.stringify(serializable)); }
                catch (error) { window.alert("Could not save chart data: " + error.message); }
            });
            attachButton("newbtn", "Add new", function () {
                var description = window.prompt("Enter activity description");
                if (description === null) return;
                var latest = d3.max(data, function (item) { return item.finish; }) || new Date();
                var start = new Date(+latest);
                start.setDate(start.getDate() - 30);
                var item = { group: "New", label: "New", start: start, finish: new Date(latest), description: description };
                item[settings.category] = "New";
                data.push.apply(data, normalize([item]));
                updateAfterEdit();
            });
            attachButton("deletebtn", "Show delete", function () {
                var latest = d3.max(data, function (item) { return item.finish; }) || new Date();
                var start = new Date(+latest); start.setDate(start.getDate() - 30);
                var item = { group: "|Delete", label: "|Delete", start: start, finish: new Date(latest), description: "Move activities here to mark them for deletion." };
                item[settings.category] = "|Delete";
                data.push.apply(data, normalize([item]));
                updateAfterEdit();
            });
            attachButton("emptybtn", "Empty delete", function () {
                data = data.filter(function (item) { return item._category !== "|Delete"; });
                updateAfterEdit();
            });
            render();
            return chart;
        }

        function setter(name, getter, apply) {
            chart[name] = function (value) {
                if (!arguments.length) return getter();
                apply(value);
                if (svg) render();
                return chart;
            };
        }
        setter("width", function () { return settings.width; }, function (value) { settings.width = Math.max(200, +value || 1000); });
        setter("maxHeight", function () { return settings.maxHeight; }, function (value) { settings.maxHeight = Math.max(100, +value || 1500); });
        setter("rowHeight", function () { return settings.rowHeight; }, function (value) { settings.rowHeight = Math.max(12, +value || 28); });
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
            data = normalize(value);
            if (svg) render();
            return chart;
        };
        return chart;
    }
    return timelines;
}));
