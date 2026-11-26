/*
 * D3 v6 compatibility for legacy axis formatters.
 * Converts string formatters passed to tickFormat into functions.
 */
(function (global) {
    "use strict";

    if (!global.d3 || !global.d3.axisTop || !global.d3.axisBottom) return;

    ["axisTop", "axisBottom"].forEach(function (axisName) {
        var originalAxis = global.d3[axisName];

        global.d3[axisName] = function () {
            var axis = originalAxis.apply(global.d3, arguments);
            var originalTickFormat = axis.tickFormat;

            axis.tickFormat = function (format) {
                if (typeof format === "string") {
                    var value = format;
                    format = function () { return value; };
                }
                return originalTickFormat.call(axis, format);
            };

            return axis;
        };
    });
}(typeof globalThis !== "undefined" ? globalThis : this));
