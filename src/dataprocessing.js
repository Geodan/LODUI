lodui.dataprocessor = function(){
	this._data = [];
	this._meta = [];
}

lodui.dataprocessor.prototype.data = function(data){
	var self = this;
	if (!data){
		return this._data;
	}
	else {
		this._meta = [];
		this._origdata = data;
		this._data = _.clone(data);
		
		//parse records
		for (var i=0;i<this._data.length;i++){
			rec = this._data[i];
			//TODO: find out data types
			var time = new Date(rec.tijd);
			rec.time = time;
			rec.year = time.getFullYear();
			rec.month = time.getMonth();
			rec.date = time.getDate();
			rec.day = time.getDay();
		}
		
		//Get metadata
		var kys = _(this._data[0]).keys();
		_(kys).each(function(key,i){
			var max = _.max(self._data, function(d){return d[key];})[key];
			var min = _.min(self._data, function(d){return d[key];})[key];
			self._meta.push({name: key, min: min, max: max});
		});
		
		return this;
	}
}

lodui.dataprocessor.prototype.meta = function(){
	/*TODO: return metedata as 
	[{name: 'keyname', type: 'datatype', min: minvalue, max: maxvalue}]
	*/
	
	
	
	
	
	return this._meta;
}

lodui.dataprocessor.prototype.filter = function(key, value){
	this._data = _(this._data).filter(function(d){return d[key] == value;});
	return this;
}

lodui.dataprocessor.prototype.group = function(key){
	this._data = _(this._data).groupBy(key);
	return this;
}

lodui.dataprocessor.prototype.map = function(key1, key2){
	this._data = _(this._data).map(function(g, key1) {
		return { 
			x: key1, 
		    y: _(g).reduce(function(m,x) { return m + parseFloat(x[key2]); }, 0) 
		};
	});
	return this;
}