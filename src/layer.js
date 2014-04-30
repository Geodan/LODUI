lodui.layer = function(config){
	this._data = config.data;
	this._id = config.id;
	this._map = config.map;
	this._type = config.type || 'path';
	this._g = this._map.vector.append('g').attr('id',this._id); //now we have a layer to add data on
}


lodui.layer.prototype.data = function(data){
	var projection = this._map.projection;
	if (this._type == 'path'){
		this._g.selectAll("path")
				.data(data)
				.enter().append("path")
				.attr('d', this._map.geoPath)
				.on('mouseover', function(d){
					d3.select(this).style('opacity',0.5);
				})
				.on('mouseout', function(d){
					d3.select(this).style('opacity',1);
				});
	}
	else if (this._type == 'point'){
		this._g.selectAll("circle")
				.data(data)
				.enter().append("circle")
				.attr('x', function(d){
					var point = d.geometry.coordinates;
					return projection(point)[0];
				})
				.attr('y', function(d){
					var point = d.geometry.coordinates;
					return projection(point)[1];
				})
				.attr('r',1E-7)
				.on('mouseover', function(d){
					d3.select(this).style('opacity',0.5);
				})
				.on('mouseout', function(d){
					d3.select(this).style('opacity',1);
				});
	}
}
