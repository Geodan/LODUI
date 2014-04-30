

//Method for moving elements to the front (used to get points on top of polygons)
//Idea from: http://stackoverflow.com/questions/14167863/how-can-i-bring-a-circle-to-the-front-with-d3
d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
  this.parentNode.appendChild(this);
  });
};

lodui.layer = function(layername, config){
	var f = {}, bounds, feature, collection;
	this.f = f;
	var _this = this;        
	var layername = layername;
	f.layername = layername;
	var data;
	var datastore = {features:[]};
	var type = config.type || "path";
	var style = config.style;
	var onClick = config.onClick;
	var onMouseover = config.onMouseover;
	var mouseoverContent = config.mouseoverContent;
	var classfield = config.classfield;
	var colorfield = config.colorfield;
	var satellites = config.satellites || false;
	var eachFunctions = config.eachFunctions || false;	
	var coolcircles = config.coolcircles || false;
	var labels = config.labels || false;
	var labelconfig = config.labelconfig;
	var legend = config.legend || false;
	var legendconfig = config.legendconfig;
	var highlight = config.highlight || false;
	var scale = config.scale || 'px';
	var pointradius = config.pointradius || 5;
	var bounds = [[0,0],[1,1]];
	var width, height,bottomLeft,topRight;
	var g;
	this.g = g;
	this.map = null;
	
	//In Chrome the transform element is not propagated to the foreignObject
	//Therefore we have to calculate our own offset
	var offset = function(x){
		var offset = {x:0,y:0}; 
		//TODO
		return offset;
	 }
		
	// Projecting latlon to screen coordinates
	var project = function(x) {
		var point = projection([x[1],x[0]]);
		return [point[0],point[1]];
	};
	
	var geoPath = d3.geo.path().projection(project);
	this.geoPath = geoPath;
	var click = function(d){
		d3.event.stopPropagation();//Prevent the map from firing click event as well
		if (onClick)
				onClick(d,this);
	}
	
	var mouseover = function(d){
		if (!d.origopac)
			d.origopac = d3.select(this).style('opacity'); 
		d3.select(this)
			.transition().duration(100)
			.style('opacity',d.origopac * 0.2)
			;
		
		if (mouseoverContent){
				tooltipdiv.transition()        
					.duration(200)      
					.style("opacity", .9);      
				tooltipdiv.html(d[mouseoverContent] + "<br/>")  
					.style("left", (d3.event.pageX) + "px")     
					.style("top", (d3.event.pageY - 28) + "px");
			}
		if (onMouseover)
			onMouseover(d,this);
	}
	var mouseout = function(d){
		d3.select(this)
			.transition().duration(100)
			.style('opacity',d.origopac)
			;
		if (mouseoverContent){
			tooltipdiv.transition()        
				.duration(500)      
				.style("opacity", 0);
		}
	}
	
	//Build up the element
	var build = function(d){
	  var entity = d3.select(this);
	  //Point/icon feature
	  if (d.style && d.style.icon && d.geometry.type == 'Point'){ 
		  var x = project(d.geometry.coordinates)[0];
		  var y = project(d.geometry.coordinates)[1];
		  var img = entity.append("image")
				.transition().duration(500)
				//.on("click", click)
				//.on('mouseover',mouseover)
				//.on('mouseout',mouseout);
	  }
	  //Path feature
	  else{
		var path = entity.append("path")
			.on("click", click)
			.on('mouseover',mouseover)
			.on('mouseout',mouseout)
			.style('opacity',1);
	  }
	}
	var color10 = d3.scale.category10();
	//A per feature styling method
	var styling = function(d){
	  var entity = d3.select(this);
	  //Point/icon feature
	  if (d.style && d.style.icon && d.geometry.type == 'Point'){ 
		  var x = project(d.geometry.coordinates)[0];
		  var y = project(d.geometry.coordinates)[1];
		  var img = entity.select("image")
				.attr("xlink:href", function(d){
						if (d.style.icon) return d.style.icon;
						else return "./mapicons/stratego/stratego-flag.svg"; //TODO put normal icon
				})
				.classed("nodeimg",true)
				.attr("width", 32)
				.attr("height", 37)
				.attr("x",x-25)
				.attr("y",y-25)
				.style('opacity',function(d){ //special case: opacity for icon
						return d.style.opacity || style.opacity || 1;
				});
		 
	  }
	  //Path feature
	  else{
		var path = entity.select("path");
		for (var key in style) { //First check for generic layer style
			
			path
				.style(key,function(d){
				if (d.style && d.style[key]){
					return d.style[key]; //Override with features style if present
				}
				else{ //Style can be defined by function...
					if (typeof(style[key]) == "function") {
						var f = style[key];
						return  f(d);
					}
					else {//..or by generic style string
						return style[key]; 
					}
				}
			});
		};
		//Now apply remaining styles of feature (possible doing a bit double work from previous loop)
		if (d.style) { //If feature has style information
			for (var key in d.style){ //run through the styles
				path
					.style(key,d.style[key]); //and apply them
			}
		}
		//A colorfield can be specified that will 
		//if (colorfield){
		//    path.style('fill',function(foo){
		//        return color10(d.properties[colorfield]);
		//    });
		//}
	  }
	};
	
	//A per feature styling method
	var textstyling = function(d){ 
		for (var key in labelconfig.style) { //First check for generic layer style
			d3.select(this).style(key,function(d){
				if (d.labelconfig && d.labelconfig.style && d.labelconfig.style[key])
					return d.labelconfig.style[key]; //Override with features style if present
				else	
					return labelconfig.style[key]; //Apply generic style
			});
		};
		//Now apply remaining styles of feature (possible doing a bit double work from previous loop)
		if (d.labelconfig && d.labelconfig.style) { //If feature has style information
			for (var key in d.labelconfig.style){ //run through the styles
				d3.select(this).style(key,d.labelconfig.style[key]); //and apply them
			}
		}
	};
	
	//Some path specific styles (point radius, label placement eg.)
	var pathStyler = function(d){ 
		if (d.style && d.style.radius)
			geoPath.pointRadius(d.style.radius);
		else if (style && style.radius)
			geoPath.pointRadius(style.radius);
		return geoPath(d);
	};
	
	//Calculating the location of the label, based on settings
	var textLocation = function(d){
		var textLocation = geoPath.centroid(d);
		var bounds = geoPath.bounds(d);
		if (style && style.textlocation){
			switch(style.textlocation){
			  case 'ul':
				textLocation[0] = bounds[0][0];
				textLocation[1] = bounds[0][1];
				break;
			  case 'ur':
				textLocation[0] = bounds[1][0];
				textLocation[1] = bounds[1][1];
				break;
			  //TODO: add other positions
			}
		}
		else {
			textLocation[1] = textLocation[1] + 20; //a bit down..
		}
		return textLocation;
	}
	
	//The part where new data comes in
	f.data = function(newdata){
		if (!newdata){
			return data || []; 
		}
		
		var points = [];
		var lines = [];
		var polygons = [];
		var collection = {"type":"FeatureCollection","features":[]}; 
		//A method to order the objects based on types
		//Points on top, then lines, then polygons
		for (var i = 0;i<newdata.features.length;i++){
		//$.each(newdata.features, function(i,d){
			var d = newdata.features[i];
			 if (d.geometry.type == 'Point'){
				 points.push(d);
			 }
			 else if (d.geometry.type == 'LineString' ||d.geometry.type == 'MultiLineString' ){
				 lines.push(d);
			 }
			 else if (d.geometry.type == 'Polygon' ||d.geometry.type == 'MultiPolygon' ){
				 polygons.push(d);
			 }
			 else {
				 console.warn(layername + ' has unknown geometry type: ',d.geometry.type);
			 }
		};
		//little hack from http://stackoverflow.com/questions/1374126/how-to-append-an-array-to-an-existing-javascript-array
		collection.features.push.apply(collection.features,polygons);
		collection.features.push.apply(collection.features,lines);
		collection.features.push.apply(collection.features,points);
		
		data = collection;
		//Store data for later use (i.e. turning layer on/off) 
		if (data.features.length > 0)
			datastore = data;
		bounds = d3.geo.bounds(collection);
		this.data = data;
	}
	f.draw = function(){
		var g = this.g;
		var collection = this.data;
		//Create a 'g' element first, in case we need to bind more then 1 elements to a data entry
		var entities = g.selectAll(".entity")
			.data(collection.features, function(d){
				return d.id || d.properties.id;
			});
		
		//On enter
		var newentity = entities.enter()
			.append('g')
			.classed('entity',true)
			.attr('id',function(d){
				return 'entity'+ (d.id || d.properties.id);
			});

		newentity.each(build);
		
		if (labels){
			var label = newentity.append('g')
				.classed('place-label',true);
			//On new:	
			label
				.append('text')
				.attr("x",function(d) {return textLocation(d)[0] ;})
				.attr("y",function(d) {return textLocation(d)[1] ;})
				//.classed("zoomable",true)
				.attr('text-anchor', 'left')
				.style('stroke','white')
				.style('stroke-width','3px')
				.style('stroke-opacity',.8)
				.text(function(d){return d.name});
			label
				.append('text')
				.attr("x",function(d) {return textLocation(d)[0] ;})
				.attr("y",function(d) {return textLocation(d)[1] ;})
				//.classed("zoomable",true)
				.attr('text-anchor', 'left')
				.each(textstyling)
				.text(function(d){return labelgenerator(d)});
		} //End of new label
		
		//Add custum functions to each feature
		if (eachFunctions){
			eachFunctions.forEach(function(f){
				newentity.each(function(d,i){
					f(d,this);
				});
			});
			f.reset();
		}

		//On update
		entities.each(styling);
		entities.each(function(d,i){
			var entity = d3.select(this);
			var x = geoPath.centroid(d)[0];
			var y = geoPath.centroid(d)[1];
			
			if (d.style && d.style.icon && d.geometry.type == 'Point'){
				var x = x;
				var y = y;
				entity.select('image')
					.attr("x",x-25)
					.attr("y",y-25);
			}
			else{
				entity.select('path') //Only 1 path per entity
					.attr("d",pathStyler(d))
					.style('opacity',1);
			}
			
			if (labels){
				entity.select('.place-label')
					.selectAll('text')
					.transition().duration(500)
					.attr("x", textLocation(d)[0] )
					.attr("y", textLocation(d)[1] )
					.text(labelgenerator(d));
			}
		});
		//On exit	
		entities.exit().remove().transition().duration(500);
		return f;
	}
	
	//Redraw all features
	f.reset = function(e) {
		g.selectAll(".entity")
			.each(function(d,i){
				var entity = d3.select(this);
				var x = geoPath.centroid(d)[0];
				var y = geoPath.centroid(d)[1];

				if (d.style && d.style.icon && d.geometry.type == 'Point'){
					entity.select('image')
						.attr("x",x-25)
						.attr("y",y-25)
						.moveToFront();
				}
				else{
					entity.select('path') //Only 1 path per entity
						.attr("d",pathStyler(d));
				}
				
				 if (labels){
					entity.select('.place-label')
						.selectAll('text')
						.attr("x", textLocation(d)[0] )
						.attr("y", textLocation(d)[1] )
						.text(labelgenerator(d));
				}
				entity.select('g.zoomable')
					.attr("transform", function(d){
						if (d.geometry.type == 'Point'){
							var x = project(d.geometry.coordinates)[0];
							var y = project(d.geometry.coordinates)[1];
						}
						else {
							var x = geoPath.centroid(d)[0];
							var y = geoPath.centroid(d)[1];
						}
						return "translate(" + x + "," + y + ")"
					})
					.transition().duration(500)
					.attr('opacity',function(d){
							if (d.minzoomlevel && d.minzoomlevel > getZoomLevel()){
								return 0;
							}
							else return 1;
					});
				
				
			});
	}
	return f;
};

