/**
	lodui.layer is instantiated from the map object
**/
lodui.layer = function(id, map, config){
	this._data = config.data;
	this._id = id;
	this._map = map;
	this._type = config.type || 'path';
	this._g = this._map.vector.append('g').attr('id',this._id); //now we have a layer to add data on
	this._onmouseover = config.onmouseover;
	this._onclick = config.onclick;
}

/** 
	layer.data(features) - adds/replaces features for specific layer
**/
lodui.layer.prototype.data = function(data){
	var projection = this._map.projection;
	var pointprojection = this._map.pointprojection;
	var clicked = this._map.clicked;
	var self = this;
	if (this._type == 'path'){
		this._g.selectAll("path")
				.data(data)
				.enter().append("path")
				.attr('d', this._map.geoPath)
				.on('mouseover', function(d){
					if (self._onmouseover){
						self._onmouseover(d);
					}
					else {
						d3.select(this).style('opacity',0.8);
					}
				})
				.on('mouseout', function(d){
					d3.select(this).style('opacity',1);
				})
				.on('click', clicked);
	}
	else if (this._type == 'point'){
		this._g.selectAll("circle")
				.data(data)
				.enter().append("circle")
				.attr('cx', function(d){
					var point = d.geometry.coordinates;
					return projection(point)[0];
				})
				.attr('cy', function(d){
					var point = d.geometry.coordinates;
					return projection(point)[1];
				})
				.attr('r',0.0001)
				.on('mouseover', function(d){
					if (self._onmouseover){
						self._onmouseover(d);
					}
					else {
						d3.select(this).style('opacity',0.8);
					}
					
				})
				.on('mouseout', function(d){
					d3.select(this).style('opacity',1);
				})
				.on('click', function(d){
					if (self._onclick){
						self._onclick(d);
					}
					else {
						d3.select(this).style('opacity',0.8);
					}
				});
	}
}
