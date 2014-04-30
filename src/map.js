var lodui = lodui || {};

lodui.map = function(id, config){
	var mapdiv = d3.select('#' + id);
	this.config = config;
	this._layers = [];
	
	var center = config.center;
	
	var width = Math.max(960, window.innerWidth),
		height = Math.max(500, window.innerHeight);
	
	var tile = d3.geo.tile()
    .size([width, height]);
	
	var projection = d3.geo.mercator()
		.scale((1 << 18) / 2 / Math.PI)
		.translate([width / 2, height / 2]);
	this.projection = projection;	
	var center = projection(center || [5.2, 52.2]);
	var geoPath = d3.geo.path()
		.projection(projection).pointRadius(function(d){
			return 10 / zoom.scale(); //is a constant
		});
	this.geoPath = geoPath;
	
	function redraw() { 
		var tiles = tile
			.scale(zoom.scale())
			.translate(zoom.translate())
			();
		
		vector
			.attr("transform", "translate(" + zoom.translate() + ")scale(" + zoom.scale() + ")")
			.style("stroke-width", 1 / zoom.scale());
						
		var image = raster
			.attr("transform", "scale(" + tiles.scale + ")translate(" + tiles.translate + ")")
			.selectAll("image")
			.data(tiles, function(d) { return d; });

		image.exit()
			.remove();

		image.enter().append("image")
		  .attr("xlink:href", function(d) { return "http://" + ["a", "b", "c", "d"][Math.random() * 4 | 0] + ".tiles.mapbox.com/v3/examples.map-vyofok3q/" + d[2] + "/" + d[0] + "/" + d[1] + ".png"; })
		  .attr("width", 1)
		  .attr("height", 1)
		  .attr("x", function(d) { return d[0]; })
		  .attr("y", function(d) { return d[1]; });
	}
	this.redraw = redraw;
	var zoom = d3.behavior.zoom()
		.scale(projection.scale() * 2 * Math.PI)
		.scaleExtent([1 << 11, 1 << 20])
		.translate([width - center[0], height - center[1]])
		.on("zoom", redraw);
	this.zoom = zoom;
	// With the center computed, now adjust the projection such that
	// it uses the zoom behavior’s translate and scale.
	projection
    .scale(1 / 2 / Math.PI)
    .translate([0, 0]);
	
	var svg = mapdiv.append("svg")
		.attr("width", width)
		.attr("height", height);
	this.svg = svg;
	var raster = svg.append("g").attr('id', 'raster');	
	var vector = svg.append("g").attr('id','vector');
	this.vector = vector;
	/*
	d3.json("./data/cbs2013/gemeenten.topojson", function(error, data) {
		svg.call(zoom);
		//vector.attr("d", geoPath(topojson.mesh(data, data.objects.gemeenten)));
		var layer = vector.append('g').attr('id','gemeenten');
		
		var areas = topojson.feature(data, data.objects.gemeenten);
		for (var i = 0; i < areas.features.length; i++ ){
			areas.features[i].id = i;
		}
		layer.selectAll("path")
			.data(areas.features)
			.enter().append("path")
			.attr('d', geoPath)
			.on('mouseover', function(d){
				d3.select(this).style('opacity',0.5);
			})
			.on('mouseout', function(d){
				d3.select(this).style('opacity',1);
			});
		
		redraw();
	});
	*/
	
	
}

/** 
	layers() - returns all layers
	layers(id) - returns specific layer or null
	layers(id, config) - creates a new layer, returns layer
**/
lodui.map.prototype.layers = function(id,config){
	if (!id){
		return this._layers;
	}
	else if (!config){
		//TODO: search for layer with id
	}
	else {
		this.svg.call(this.zoom);
		var layer = new lodui.layer({
			id: id,
			data: config.data,
			style: config.style,
			type: config.type,
			map: this
		});
		this._layers.push(layer);
		return layer;
	}
}

lodui.map.prototype.redraw = function(){
	this.svg.call(zoom);
	this.redraw();
}