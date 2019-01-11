(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.pegChart = factory());
}(this, (function () { 'use strict';

var timelines = function() {

    // 1. Create the button
    var button = document.createElement("button");
    button.innerHTML = "Save to local storage";
     
   var body = document.getElementById("savebtn")
    body.appendChild(button);
   
    button.addEventListener("click", function () {
        var temp = [];
        for (var t = 0; t < env.structData.length; t++) {
            temp.push({
                start: dateFormat(env.structData[t].start, "yyyy-mm-dd"),
                finish: dateFormat(env.structData[t].finish, "yyyy-mm-dd"),
                group: env.structData[t].group,
                label: env.structData[t].label
            })
        }
       
        localStorage.setItem('myData', temp);       
        console.log("saved" + JSON.stringify(temp));
    });


    //<General functions>               
    function convertdata() {
        for (var t = 0; t < env.structData.length; t++) {
            env.structData[t].start = new Date(env.structData[t].start)
            env.structData[t].finish = new Date(env.structData[t].start.getTime() + ((Math.floor(Math.random() * 100) + 10) * 24 * 60 * 60 * 1000))
            env.structData[t].clas = "x" + (t + 1)
        }
    }

    function onlyUnique(value, index, self) {
        return self.indexOf(value) === index;
    }

    
    function getColor() {
        var color = [];
        env.structData.forEach(function (item) {
            color.push(item.label)
        })
        color = color.filter((v, i, a) => a.indexOf(v) === i);
        return color
    }

   
    function getlabels() {
        var labels = [];
        env.structData.forEach(function (item) {
            labels.push(item.sub)
        })
        labels = labels.filter((v, i, a) => a.indexOf(v) === i);
        labels.sort()
        return labels
    }

    function getLines() {
        env.nLines = 0 
        env.flatData.forEach(function (item) {
            env.nLines += item.count
        })      
        return env.nLines
    }

   
    function resolveOverlaps() {
        env.flatData = []      
        var keys = env.structData.map(function (d) { return d[env.category]; })
                    .reduce(function (p, v) { return p.indexOf(v) == -1 ? p.concat(v) : p; }, [])
                    .filter(function (d) { return (typeof d !== "undefined") ? d !== null : false });

        env.structData.sort(function (a, b) {
            return d3.descending(a.start, b.start);
        });
        
        keys.forEach(function (key) {                     
            var items = env.structData.filter(function (d) { return d[env.category] === key; });
            var i, line, count = [], lines = [];

            var top = d3.max(env.structData, function (d) { return d.line }) || 0;
          
            items.forEach(function (item) {
                for (i = 0, line = 0; i < lines.length; i++, line++) {
                    if (item.finish <= lines[i]) { break; }
                }

                item.line = line + top + 1;
                item.sub = item[env.category] + '+&+' + item.line
                lines[line] = item.start;
                count.push(item.line);
            })

            count = count.filter(onlyUnique)
            env.flatData.push({ category: items[0][env.category], count: count.length })
           });

            env.flatData.sort(function (a, b) {
                return d3.ascending(a.category, b.category);
           });
    }
    //<General functions/>  

    //< Drag Functions>  
    function dragstarted(d) {
        var current = d3.select(this);
    }

    function dragged(d) {
        d3.select(this).attr("transform", function (d, i) {
            return "translate(" + [d3.event.x, d3.event.y] + ")"
        })
    }

    function dragended(d) {
        
        d3.select(this).classed("active", false);
        var t = d3.select(this);
        var clas = t.attr("id");

        for (var i = 0; i < env.structData.length; i++) {
            if (env.structData[i].clas === clas) {
                var delta = env.xScale(env.structData[i].finish) - env.xScale(env.structData[i].start);
                env.structData[i].finish = env.xScale.invert(d3.event.x + delta);
                env.structData[i].start = env.xScale.invert(d3.event.x);                            
            }
        }
       
            for (var t = 0; t < env.structData.length; t++) {
                env.structData[t].line = 0            
            }
       
        resolveOverlaps()       
        labels = getlabels()       
        env.nLines = getLines();
        env.graphH = d3.min([env.nLines * env.maxLineHeight, env.maxHeight - env.margin.top - env.margin.bottom]);     
        renderAxises()
        d3.event = null
        draw();            
    }

    function dragstartedl(d) {
        var current = d3.select(this);
    }
      
    function draggedl(d) {
        var clas, end;
        if (typeof xt === 'undefined') {
            xt = env.xScale
        }
        d3.select(this).attr("x", d3.event.x)
        var clas = d3.select(this).attr("class");

        for (var i = 0; i < env.structData.length; i++) {
            if ("clasl " + env.structData[i].clas === clas) {
                end = xt(d.finish)
                clas = env.structData[i].clas
            };
        }

        env.svg.select("." + clas)
            .attr("fill", "orange")
            .style("opacity", 0.9) 
            .attr("x", d3.event.x)
             .attr("width", end - d3.event.x);
    }

    function dragendedl(d) {
        var clas = d3.select(this).attr("class");

        for (var i = 0; i < env.structData.length; i++) {
            if ("clasl " + env.structData[i].clas === clas) {
                env.structData[i].start = xt.invert(d3.event.x);
            }
        };
        d3.event = null
        draw();
    }


    function dragstartedr(d) {
        var current = d3.select(this);
    }

    function draggedr(d) {
        var clas, end;
        if (typeof xt === 'undefined') {
            xt = env.xScale
        }

        d3.select(this).attr("x", d3.event.x)

        var clas = d3.select(this).attr("class");

        for (var i = 0; i < env.structData.length; i++) {
            if ("clasr " + env.structData[i].clas === clas) {
                end = xt(d.start)
                clas = env.structData[i].clas
            };
        }

        env.svg.select("." + clas)
            .attr("fill", "orange")
            .style("opacity", 0.9)
            .attr("width", d3.event.x - end);
    }


    function dragendedr(d) {
        var clas = d3.select(this).attr("class");

        for (var i = 0; i < env.structData.length; i++) {
            if ("clasr " + env.structData[i].clas === clas) {
                env.structData[i].finish = xt.invert(d3.event.x);
            }
        };
        d3.event = null
        draw();
    }
    //< Drag Functions>  

    //Main    
    var env = {
        width: 1000, 
        height: 800,
        maxHeight: 640,
        lineMaxHeight: 12,
        maxLineHeight: 12,
        minLabelFont: 16,
        margin: { top: 26, right: 0, bottom: 30, left: 90 },
        groupBkgGradient: ['#FAFAFA', '#E0E0E0'],
        xScale: d3.scaleTime(),
        yScale: d3.scalePoint(),
        grpScale: d3.scaleOrdinal(),
        xGrid: d3.axisTop(),
        yAxis: d3.axisRight(),
        xAxis: d3.axisBottom(),
        grpAxis: d3.axisLeft(),
        category: "group",
        svg: null,
        graph: null,
        graphW: null,
        graphH: null,
        nLines: 0,
        minSegmentDuration: 0, 
        transDuration: 700, 
        structData: null,
        flatData: null
        
    };
    var lineHeight,g, xt, labels, color, colorScale
    var border = 1;
    var bordercolor = 'black';
    var zoom = d3.zoom()
                .scaleExtent([0.5, 32])           
                .on("zoom", draw);

    var parseTime = d3.timeParse("%d/%m/%Y")     
    var colors = ["#EDBB99", "#73C6B6", "#85C1E9", "#95A5A6", "#F4D03F"]
   

    function chart(nodeElem, data) {
      
        env.structData = data;
        var elem = d3.select(nodeElem)
           .attr('class', 'timelines-chart');

        env.svg = elem.append("svg")
                .attr("border", border)
                .attr("width", env.width)
                .attr("height", env.height);

        env.svg.call(zoom);

        var borderPath = env.svg.append("rect")
                     .attr("x", 0)
                     .attr("y", 0)
                     .attr("height", env.height)
                     .attr("width", env.width)
                     .style("stroke", bordercolor)
                     .style("fill", "none")
                     .style("stroke-width", border);

        var grad = env.svg.append('defs')
          .append('linearGradient')
          .attr('id', 'grad')
          .attr('x1', '0%')
          .attr('x2', '0%')
          .attr('y1', '0%')
          .attr('y2', '100%');

        grad.selectAll('stop')
          .data(env.groupBkgGradient)
          .enter()
          .append('stop')
          .style('stop-color', function (d) { return d; })
          .attr('offset', function (d, i) {
              return 100 * (i / (env.groupBkgGradient.length - 1)) + '%';
          })

        env.svg.transition().duration(100).attr('width', env.width).attr('height', env.height);
       
        env.graph = env.svg.append('g')
            
        g = env.svg.append("g")
                
        buildDomStructure();
        convertdata(data)
        parseData(env.structData);
        renderAxises();
        draw();
        return chart;
    }


    function parseData(data) {     
        convertdata()           
        resolveOverlaps()       
        labels = getlabels()
        env.nLines = getLines();
        env.graphW = env.width - env.margin.left - env.margin.right;
        env.graphH = d3.min([env.nLines * env.maxLineHeight, env.maxHeight - env.margin.top - env.margin.bottom]);
    }

               
        function buildDomStructure() {

            env.graphW = env.width - env.margin.left - env.margin.right;

            env.xScale.range([0, env.graphW])
             
            env.svg.attr("width", env.width);

            var axises = env.svg.append('g');

            env.graph.attr("transform", "translate(" + env.margin.left + "," + env.margin.top + ")");

             g.attr("transform", "translate(" + env.margin.left + "," + env.margin.top + ")");

            axises.attr("class", "axises")
                .attr("transform", "translate(" + env.margin.left + "," + env.margin.top + ")");

            axises.append("g")
                .attr("class", "x-axis");

            axises.append("g")
                .attr("class", "x-grid");

            axises.append("g")
                .attr("class", "y-axis")
                .attr("transform", "translate(" + env.graphW + ", 0)");

            axises.append("g")
                .attr("class", "grp-axis");

            env.xAxis.scale(env.xScale)           
                .ticks(Math.round(env.graphW * 0.011));

            env.xGrid.scale(env.xScale)
                .tickFormat("")
                .ticks(env.xAxis.ticks()[0]);

            env.yAxis.scale(env.yScale)
                .tickSize(0);

            env.grpAxis.scale(env.grpScale)
                .tickSize(0);

        }
           
               
        function renderAxises() {
         
            var fontVerticalMargin = 0.6;       

            var fontSize = Math.min(12, env.graphH / env.flatData.length * fontVerticalMargin * Math.sqrt(2));        

            env.yScale
              .domain(labels)
              .range([env.graphH / labels.length * 0.5, env.graphH * (1 - 0.5 / labels.length)]);
         
            env.xGrid
                    .scale(env.xScale)
                    .tickSize(env.graphH)
                    .ticks(d3.timeMonth, 1)
                    .tickFormat(d3.timeFormat("%b %y"))

            //env.svg.select('g.x-axis')
            //   .style('stroke-opacity', 0)
            //   .style('fill-opacity', 0)
            //   .attr("transform", "translate(0," + env.graphH + ")")
            //   .transition().duration(100)
            //       .call(env.xAxis)
            //       .style('stroke-opacity', 1)
            //       .style('fill-opacity', 1);


            env.xScale
               .domain([d3.min(env.structData, function (d) { return d.start; }), d3.max(env.structData, function (d) { return d.finish; })])
               .range([0, env.graphW]);


           env.svg.select('g.x-grid')
               .attr('transform', 'translate(0,' + env.graphH + ')')
               .transition().duration(100)
               .call(env.xGrid);


            var groups = env.graph.selectAll('rect.series-group, g.series-group ').data(env.flatData, function (d) {
                return d.category;
            });
                                         
            env.yAxis.tickValues("");   //labels

            env.svg.select('g.y-axis')
                .transition().duration(100)
                .attr('transform', 'translate(' + env.graphW + ', 0)')
                .style('font-size', fontSize + 'px')
                .call(env.yAxis);

            var minHeight = d3.min(env.grpScale.range(), function (d, i) {
                return i > 0 ? d - env.grpScale.range()[i - 1] : d * 2;
            });

            env.grpAxis.tickFormat(function (d) { return d })
                         .ticks(0);

            env.grpScale.domain(env.flatData.map(function (d) {
                return d.category
            }));

            var cntLines = 0;
            env.grpScale.range(env.flatData.map(function (d) {
                var pos = (cntLines + d.count / 2) / env.nLines * env.graphH;
                cntLines += d.count;
                return pos;
            }));

            env.svg.select('g.grp-axis')
                .transition()
                .duration(100)
                .style('font-size', fontSize + 'px')
                .call(env.grpAxis);
           
            groups.exit().transition().duration(500).style('stroke-opacity', 0).style('fill-opacity', 0).remove();

            var newGroups = groups.enter()
                .append('rect')
                .attr('class', 'series-group')
                .attr('x', 0)
                .attr('y', 0)
                .attr('height', 0)
                .style('fill', 'url(#grad)');
    
            newGroups.append('title').text('click-drag to pan or mouse wheel to zoom in/out');

            groups = groups.merge(newGroups);

            groups.transition().duration(500)
                .attr('width', env.graphW)
                .attr('height', function (d) { return env.graphH * d.count / env.nLines;})
                .attr('y', function (d) { return env.grpScale(d.category) - env.graphH * d.count / env.nLines / 2; })
           
        }

        function draw() {

            color = getColor()
            colorScale = d3.scaleOrdinal(colors).domain(color)
            lineHeight = env.graphH / env.nLines * 0.8;

            if (d3.event) {
                var t = d3.event.transform
                xt = t.rescaleX(env.xScale);
            } else {
                xt = env.xScale;
            }

            env.svg.select('.x-grid').call(env.xGrid.scale(xt));
            env.svg.selectAll(".rectangle").remove();
            env.svg.selectAll(".interval").remove();
            env.svg.selectAll(".clas").remove();
            env.svg.selectAll(".clasr").remove();
            env.svg.selectAll(".clasl").remove();

            var group = g.selectAll(".rectangle")
                         .data(env.structData);

            var gEnter = group.enter()
           .append("g")
           .attr("class", "rectangle")
           .attr("fill", function (d, i) { return colorScale(d.label); })
           .attr("transform", function (d) {
               return "translate(" + xt(d.start) + "," + (env.yScale(d.sub) - lineHeight / 2) + ")";
           })
           .attr("id", function (d) { return d.clas; })
           .attr("xstart", function (d) { return xt(d.start) })
           .attr("ystart", function (d) { return (env.yScale(d.sub) - lineHeight / 2) })
               .call(d3.drag()
             .subject(function () {
                 return {
                     x: d3.select(this).attr("xstart"),
                     y: d3.select(this).attr("ystart")
                 };
             })
                 .on("start", dragstarted)
                 .on("drag", dragged)
                 .on("end", dragended))
           .append("svg")
           .attr("height", lineHeight)
           .attr("class", "interval")
           .attr("width", function (d) { return xt(d.finish) - xt(d.start) });


            gEnter.append("rect")
               .attr("class", "rectband " + function (d) { return d.clas; })
                .attr("width", function (d) { return xt(d.finish) - xt(d.start) })
                .attr("height", lineHeight)
                .style("opacity", .5) // set the element opacity
                .style("stroke", "black");

            gEnter.append("text")
                     .attr("class", "interval")
                     .attr("x", 6)
                     .attr("y", 9)
                     .style("pointer-events", "none")
                     .style("fill", "black")
                     .attr("font-size", 11)
                     .attr("font-family", "Cambria")
                     .text(function (d) { return (d.description); });

            var lEnter = group.enter()
                  .append("rect")
                  .attr("class", "lefthand")
                  .attr("width", function (d) { return xt(new Date(d.finish)) - xt(new Date(d.start)) })
                  .attr("x", function (d) { return xt(d.start) })
                  .attr("y", function (d) { return env.yScale(d.sub) - lineHeight / 2 })
                .attr("class", function (d) { return "clasl " + d.clas; })
                .attr("idx", function (d) { return d.id; })
                .attr("start", function (d) { return d.start; })
                .attr("height", lineHeight)
                .attr("id", "dragleft")
                .attr("width", 2)
                .attr("fill", "#4A235A")
                .attr("fill-opacity", 1)
                .attr("cursor", "ew-resize")
                 .call(d3.drag()
                    .on("start", dragstartedl)
                    .on("drag", draggedl)
                    .on("end", dragendedl))

            var rEnter = group.enter()
                  .append("rect")
                  .attr("class", "righthand")
                    .attr("x", function (d) { return xt(d.finish) - 2 })
                    .attr("y", function (d) { return env.yScale(d.sub) - lineHeight / 2 })
                  .attr("class", function (d) { return "clasr " + d.clas; })
                  .attr("idx", function (d) { return d.id; })
                  .attr("start", function (d) { return d.start; })
                  .attr("height", lineHeight)
                  .attr("id", "dragright")
                  .attr("width", 2)
                  .attr("fill", "#4A235A")
                  .attr("fill-opacity", 1)
                  .attr("cursor", "ew-resize")
                   .call(d3.drag()
                      .on("start", dragstartedr)
                      .on("drag", draggedr)
                      .on("end", dragendedr));


            group = group.merge(gEnter);
        }



    // Exposed functions

    chart.width = function (_) {
        if (!arguments.length) { return env.width }
        env.width = _;
        return chart;
    };

    chart.leftMargin = function (_) {
        if (!arguments.length) { return env.margin.left }
        env.margin.left = _;
        return chart;
    };

    chart.rightMargin = function (_) {
        if (!arguments.length) { return env.margin.right }
        env.margin.right = _;
        return chart;
    };

    chart.topMargin = function (_) {
        if (!arguments.length) { return env.margin.top }
        env.margin.top = _;
        return chart;
    };

    chart.bottomMargin = function (_) {
        if (!arguments.length) { return env.margin.bottom }
        env.margin.bottom = _;
        return chart;
    };
  
    chart.category = function (_) {
        if (!arguments.length) { return env.category }
        env.category = _;
        return chart;
    };

    return chart;
}

return timelines;

})));
