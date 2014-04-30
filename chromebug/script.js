var width = 960,
    height = 1160;

var projection = d3.geo.mercator()
    .center([5.2, 52.2])
    .scale(1200 * 10)
    .translate([width / 2, height / 2]);

var path = d3.geo.path()
    .projection(projection)
    .pointRadius(2);

var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

d3.json("data.topojson", function(error, data) {
  svg.append("path")
      .datum(topojson.mesh(data, data.objects.gemeenten))
      .attr("d", path)
      .attr("class", "buurt-boundary");
});