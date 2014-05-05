
lodui.queries = function(){
	this.sparqlEndpoint = 'http://lod.geodan.nl/sparql?format="text/csv"&query=';
}

lodui.queries.prototype.getGasMeters = function(){
	var query = 'prefix ebif: <http://lod.geodan.nl/vocab/cerise-sg/ebif#> \
		prefix locn: <http://www.w3.org/ns/locn#> \
		prefix bag: <http://lod.geodan.nl/vocab/bag#> \
		select ?meter ?woonplaats ?straat ?nummer ?letter ?postcode \
		from <http://lod.geodan.nl/cerise-sg/ebif/julianadorp/> \
		where { \
		?meter a ebif:GasMeter . \
		?meter locn:address ?adres . \
		?adres locn:addressArea ?woonplaats . \
		?adres locn:thoroughfare ?straat . \
		?adres locn:postCode ?postcode . \
		?adres bag:huisnummer ?nummer . \
		optional {?adres bag:huisletter ?letter .} \
		} \
		order by ?woonplaats ?straat ?nummer';
		var request_url = encodeURI(this.sparqlEndpoint) + encodeURIComponent(query);
		return request_url;
		
}
lodui.queries.prototype.getMeterValues = function(meter){
	var query = 'prefix ebif:<http://lod.geodan.nl/vocab/cerise-sg/ebif#>\
		select ?tijd ?waarde \
		from <http://lod.geodan.nl/cerise-sg/ebif/julianadorp/> \
		where { \
		?meting a ebif:Measurement . \
		?meting ebif:meter <'+meter+'> . \
		?meting ebif:time ?tijd . \
		?meting ebif:measuredValue ?waarde . \
		} \
		order by ?tijd';
	var request_url = encodeURI(this.sparqlEndpoint) + encodeURIComponent(query);
	return request_url;
}

lodui.queries.prototype.geocodedMeters = function(){
	var query = 'prefix bag: <http://lod.geodan.nl/vocab/bag#> \
		prefix ebif: <http://lod.geodan.nl/vocab/cerise-sg/ebif#> \
		prefix locn: <http://www.w3.org/ns/locn#> \
		select ?meter ?woonplaats ?straat ?nummer ?letter ?postcode ?geom \
		from <http://lod.geodan.nl/basisreg/bag/verblijfsobject/> \
		from <http://lod.geodan.nl/basisreg/bag/nummeraanduiding/> \
		from <http://lod.geodan.nl/cerise-sg/ebif/julianadorp/> \
		where { \
		{ \
		?meter a ebif:GasMeter . \
		?meter locn:address ?adres . \
		?adres locn:postCode ?postcode . \
		?adres bag:huisnummer ?nummer . \
		?adres locn:addressArea ?woonplaats . \
		?adres locn:thoroughfare ?straat . \
		optional {?adres bag:huisletter ?letter .} \
		?NumAandMut a bag:Nummeraanduidingmutatie . \
		?NumAandMut bag:lastKnown "true"^^xsd:boolean . \
		?NumAandMut bag:postcode ?postcode. \
		?NumAandMut bag:huisletter ?letter . \
		?NumAandMut bag:huisnummer ?nummer . \
		?NumAandMut bag:nummeraanduiding ?NumAand . \
		?VobjMut a bag:Verblijfsobjectmutatie . \
		?VobjMut bag:lastKnown "true"^^xsd:boolean . \
		?VobjMut bag:hoofdadres ?NumAand .         \
		?VobjMut bag:geometrie ?geom               \
		} union {                                  \
		?meter a ebif:GasMeter .                   \
		?meter locn:address ?adres .               \
		?adres locn:postCode ?postcode .           \
		?adres bag:huisnummer ?nummer .            \
		?adres locn:addressArea ?woonplaats .      \
		?adres locn:thoroughfare ?straat .         \
		optional {?adres bag:huisletter ?letter} . \
		filter (!bound(?letter)) .                 \
		?NumAandMut a bag:Nummeraanduidingmutatie .\
		?NumAandMut bag:lastKnown "true"^^xsd:boolean .\
		?NumAandMut bag:postcode ?postcode.            \
		?NumAandMut bag:huisnummer ?nummer .           \
		?NumAandMut bag:nummeraanduiding ?NumAand .    \
		?VobjMut a bag:Verblijfsobjectmutatie .        \
		?VobjMut bag:lastKnown "true"^^xsd:boolean .   \
		?VobjMut bag:hoofdadres ?NumAand .             \
		?VobjMut bag:geometrie ?geom }                 \
		}                                              \
		order by ?meter                                \
	';
	var request_url = encodeURI(this.sparqlEndpoint) + encodeURIComponent(query);
	return request_url;	
}