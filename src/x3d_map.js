var wxs3 = wxs3 || {};
//d3.ns.prefix.x3da="http://www.web3d.org/specifications/x3d-namespace";

var counter = 0;
var light1;
var map;

var loadlist = [
	//{name: 'trees',reload: true, url: './data/tree_service.php'},
	{name: 'terrain', reload: true, url: './data/terrain_service.php'},
	{name: 'buildings', reload: true, url: './data/buildings_service.php'},
	//{name: 'roofs', reload: true, url: './data/roof_service.php'},
	//{name: 'pc_buildings', reload: true, url: './data/pc_buildings_service.php'},
	//{name: 'water', reload: true, url: './data/water_service.php'}
];


var tilesize = 100;
var div = d3.select('#debug');
div.append('span').html('Tilesize ');
var select =  div.append('select');
select.append('option').attr('value',25).html('25');
select.append('option').attr('value',50).html('50');
select.append('option').attr('value',100).attr('selected',true).html('100');
select.append('option').attr('value',200).html('200');
select.on('change', function(){
	loadlist.forEach(function(val){
		if (val.name == 'terrain'){
			val.reload = true;
		}
	});
	tilesize = parseInt(this.value);
});


div.append('button').on('click', function(){
	loadlist.forEach(function(val){
		if (val.name = 'terrain'){
			d3.selectAll('.'+ val.name).remove();
		}
	});
	map.bbox2tiles(map.dim.getBounds());
}).html('Render');


(function (ns) {
//var render = function(ns){
    'use strict';

    //check WebGL
    if (!window.WebGLRenderingContext) {
        // the browser doesn't even know what WebGL is
        window.location = "http://get.webgl.org";
    }

    //utility func to convert dict of {key: "val", key2: "val2"} to key=val&key2=val2
    function urlformat(values) {
        var res = [], key;
        for (key in values) {
            if (values.hasOwnProperty(key)) {
                var value = values[key];
                res.push(key + '=' + value);
            }
        }
        return res.join('&');
    }

    var WCSTile = function (dim, tileNr, bounds) {
        this.dim = dim;
        this.tileNr = tileNr;
        this.bounds = bounds;
        this.loaded = false;
    };

    WCSTile.prototype.getWcsBbox = function () {
        return [
            parseInt(this.bounds.minx, 10),
            parseInt(this.bounds.miny - this.dim.proportionHeight, 10),
            parseInt(this.bounds.maxx + this.dim.proportionWidth, 10),
            parseInt(this.bounds.maxy, 10)
        ].join(',');
    };

    WCSTile.prototype.load = function (callback) {

        this.callback = callback;
		/*OBS
        var params = {
            //SERVICE: 'WCS',
			SERVICE: 'WMS',
            VERSION: '1.3.0',
            //REQUEST: 'GetCoverage',
            //FORMAT: 'XYZ',
			//TT:
			REQUEST: 'GetMap',
			FORMAT: 'image/png',
            //COVERAGE: this.dim.coverage,
			LAYERS: this.dim.coverage,
            bbox: this.getWcsBbox(),
            CRS: this.dim.crs,
            //RESPONSE_CRS: this.dim.crs,
            WIDTH: parseInt(this.dim.demWidth, 10),
            HEIGHT: parseInt(this.dim.demHeight, 10)
        };
        var url = this.dim.wcsUrl + '?' + urlformat(params);
		*/
		
		var bbox = this.getWcsBbox().split(',');
		var that = this;
		
		var dsv = d3.dsv(";", "text/plain");
		loadlist.forEach(function(val){
			if (1 ==1 || val.reload){
				val.reload = false;
				dsv(val.url + '?west='+bbox[0]+'&east='+bbox[2]+'&south='+bbox[1]+'&north='+bbox[3], function(d){
					that.demTileLoaded(d);
				});
			}
		});

        //allows chaining
        return this;
    };

	
	
    WCSTile.prototype.demTileLoaded = function (d) {
		this.data = d;
		this.data.materialUrl = this.createMaterial();
        this.loaded = true; //not used yet
        this.callback(this);
    };
    WCSTile.prototype.createMaterial = function () {
        var params = {
            service: 'wms',
            version: '1.1.1',
            request: 'getmap',
            crs: this.dim.crs,
            srs: this.dim.crs,
            WIDTH: this.dim.demWidth * this.dim.wmsMult,
            HEIGHT: this.dim.demHeight * this.dim.wmsMult,
            //bbox: this.getWmsBbox(),
			styles: '',
			bbox: this.getWcsBbox(),
            layers: this.dim.wmsLayers,
            format: this.dim.wmsFormat + this.dim.wmsFormatMode
        };
		return this.dim.wmsUrl + '?' + urlformat(params);
    };

    ns.ThreeDMap = function (layers, dim) {

        this.dim = dim;
        this.camera = null;
        this.scene = null;
        this.renderer = null;
        this.controls = null;


        //TODO: these shpuld be moved to separate functions to improve
        //readability. I'm not quite certain how to name these functions
        if (dim.metersWidth > dim.metersHeight) {
            var widthHeightRatio = dim.metersWidth / dim.metersHeight;
            dim.demWidth = parseInt(widthHeightRatio * dim.demWidth, 10);
        } else if (dim.metersWidth < dim.metersHeight) {
            var heightWidthRatio = dim.metersHeight / dim.metersWidth;
            dim.demHeight = parseInt(heightWidthRatio * dim.demHeight, 10);
        }
		//TT: Why do we need proportional Width/Height? it makes the tiles overlap
        // mapunits between vertexes in x-dimension
        dim.proportionWidth = 0; //dim.metersWidth / dim.demWidth;

        // mapunits between vertexes in y-dimension
        dim.proportionHeight = 0; //dim.metersHeight / dim.demHeight;

        this.dim.wmsLayers = layers;

        this.createRenderer();
        this.createScene();
        this.createCamera();

        // Generate tiles and boundingboxes
        this.bbox2tiles(this.dim.getBounds());
    };

    ns.ThreeDMap.prototype.createRenderer = function () {
		this.renderer = d3.select("#webgl")//.style('width', '800px').style('height', '800px')
                .append("x3d")
				.attr('showStat', false)
				.attr('showLog', false)
                .attr( "width", this.dim.width + "px" )
                .attr( "height", this.dim.height + "px" );
    };

    ns.ThreeDMap.prototype.createScene = function () {
		this.scene = this.renderer.append("scene");
		//this.scene.append('Fog').attr('id', 'fog1').attr('visibilityRange', 3000).attr('fogType', 'EXPONENTIAL');
		this.scene.append('Background').attr('skyColor', '0.4 0.6 0.8');
		light1 = this.scene.append('DirectionalLight').attr('direction','45 0 -10').attr('intensity','1.0').attr('shadowIntensity','0');
        //this.scene.append('SpotLight').attr('location','187870.1,429135.4,50').attr('direction','187870.1,429135.4,100').attr('radius',300).attr('beamWidth',0.140);
		
		this.scene.append('navigationInfo').attr('headLight', false);
		//<PointLight id='point' on='TRUE' intensity='0.9000' color='0.0 0.6 0.0' location='0 10 0.5 ' radius='5.0000' >  </PointLight> 
		//<SpotLight DEF='Spot01' on='TRUE' intensity='1.000' ambientIntensity='0.000' color='1.000 1.000 1.000' direction='-0.764 -0.158 0.626' location='-10.171 -36.087 16.289' radius='300.000' beamWidth='0.140' cutOffAngle='0.255' shadowIntensity="0.5" zNear='20' />
		
		//todo: add lights
		//this.scene.append('PointLight').attr('location','188250 429009 40').attr('radius','50').attr('intensity',0.1);
    };

    ns.ThreeDMap.prototype.createCamera = function () {
		// Some trick to find height for camera
        var cameraHeight;
		var fov = 45;
        if (this.dim.Z) {
            cameraHeight = this.dim.Z;
        } else {
            cameraHeight = (this.dim.metersHeight / 2) / Math.tan((fov / 2) * Math.PI / 180);
        }
        // Place camera in middle of bbox
        var centerX = (this.dim.minx + this.dim.maxx) / 2;
        var centerY = (this.dim.miny + this.dim.maxy) / 2;
        
		
		this.scene.append("viewpoint")
           .attr( "centerOfRotation", centerX + " " + centerY + " 0" )
           .attr( "position", centerX + " " + centerY + " " + (cameraHeight + 50))
		   .attr( 'fieldOfView' , 1.8)
		   .attr( 'zNear',"10").attr('zFar',"5000")
           //.attr( "orientation", "0.9 0.16 0.21 1.37" )
           ;
    };

    
	
    ns.ThreeDMap.prototype.bbox2tiles = function (bounds) {
		var tilesize = 100;
		
		var width = bounds.maxx - bounds.minx;
		var height = bounds.maxy - bounds.miny;
		//tilesize = 10000000 / (width * height); //makes 100 meter tiles for 1X1 km
		var nx = Math.ceil(width/tilesize);
		var ny = Math.ceil(height/tilesize);
		this.cycle = 0;
        this.tiles = [];
		
		for (var i = 0;i<ny;i++){
			for (var j = 0; j<nx;j++){
				var minx = bounds.minx + (tilesize*j);
				var maxx = bounds.minx + (tilesize*j) + tilesize;
				var miny = bounds.miny + (tilesize*i);
				var maxy = bounds.miny + (tilesize*i) + tilesize;
				//console.log(minx + ' ' + maxx  + ' ' +  miny + ' ' +  maxy);
				
				this.tiles.push(
					new WCSTile(this.dim, 'x0_y0', {
						minx: minx,
						miny: miny,
						maxx: maxx,
						maxy: maxy
					}).load(this.tileLoaded.bind(this))
				);
			}
		}
    };

    ns.ThreeDMap.prototype.tileLoaded = function (tile) {
		var data = tile.data;
		var shapes = this.scene.selectAll('shape').data(data, function(d){return d.id;});
		var newshape = shapes.enter()
			//.append('transform')
			//.attr('translation', '-188395 -428765 -40')
			.append('shape').attr('class',function(d){
				return d.type;
			})
			.attr('id',function(d){return d.id;})
			.on('click',function(d){
				console.log(d);
			})
			.html(function(d){
				if (d.type != 'buildingxx'){
					return d.geom;
				}
				else { //Handle building extrusion
					var shape = '<extrusion DEF="HULL" crossSection="' + d.geom + '" solid=false scale="1 1, 1 1 , 0.2 0.2" spine="0 0 0 , 0 0 0 , 0 0 0.01">';
					return shape;
				}
			});
		var appearance = newshape.append("Appearance").each(function(x){
			d3.select(this)
		//appearance.append("Material").attr('emissiveColor', function(d){return d.color;});
			.append("Material").attr("diffuseColor", function(d){return d.color;});
			if (x.type == 'terrain'){
				d3.select(this).append('ImageTexture').attr('url',data.materialUrl);
			}
		});
		

    };

    // extraction for URL parameters
    function getQueryVariable(variable) {
        var pair, i;
        var query = window.location.search.substring(1);
        var vars = query.split("&");
        for (i = 0; i < vars.length; i = i + 1) {
            pair = vars[i].split("=");
            if (pair[0].toUpperCase() === variable) {
                return pair[1];
            }
        }
        return false;
    }

    ns.Dim = {
        width: 800 || window.innerWidth,
        height: 800,
        demWidth: getQueryVariable("WIDTH") || 100,
        demHeight: getQueryVariable("HEIGHT") || 250, //TT: trick to get the textures aligned along the longest side. TODO: find out what the effect on the tiles is
        bbox: getQueryVariable("BBOX") || '188045,428786, 188411,429044', //klein stukje nijmegen (Valkhof)
        //bbox: getQueryVariable("BBOX") || '188000,428500,189000,429500',
		//bbox: getQueryVariable("BBOX") || '110500,544000,111500,544500', //Julianadorp
		metersWidth: 0,
        metersHeight: 0,
        minx: 0,
        maxx: 0,
        miny: 0,
        maxy: 0,
        getBounds: function () {
            return {
                minx: this.minx,
                miny: this.miny,
                maxx: this.maxx,
                maxy: this.maxy
            };
        },
        init: function () {
            var splitBbox = this.bbox.split(',');
            this.metersWidth = splitBbox[2] - splitBbox[0];
            this.metersHeight = splitBbox[3] - splitBbox[1];
            this.minx = parseInt(splitBbox[0], 10);
            this.maxx = parseInt(splitBbox[2], 10);
            this.miny = parseInt(splitBbox[1], 10);
            this.maxy = parseInt(splitBbox[3], 10);

            if (getQueryVariable("WMSFORMATMODE")) {
                this.wmsFormatMode = '; mode=' + getQueryVariable("WMSFORMATMODE");
            }
            return this;
        },
        crs: getQueryVariable("CRS") || getQueryVariable("SRS") || 'EPSG:28992',
        coverage: getQueryVariable("COVERAGE") || 'ahn2_05m_int',
        wmsUrl: getQueryVariable("WMS") || '/service/nlr/wms/dkln2006',
        wcsUrl: '/service/nlr/wms/aster2012',
        wmsMult: getQueryVariable("WMSMULT") || 5,
        wmsFormat: getQueryVariable("WMSFORMAT") || "image/jpeg",
        wmsFormatMode: "",
        zMult: getQueryVariable("ZMULT")||1,
        Z: getQueryVariable("Z") || null,
        proportionWidth: 0,
        proportionHeight: 0
    };

    var dim = ns.Dim.init();
	//TT:
	var layers = 'dkln2006';
    var wmsLayers = getQueryVariable("LAYERS") || layers;
    var threeDMap = new ns.ThreeDMap(wmsLayers, dim);
	map = threeDMap;
}(wxs3));
//};