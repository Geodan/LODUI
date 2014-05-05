/* Create graphics */
		/**
		var graphdiv = d3.select('#infobox').html('');
		graphdiv.append('div').html(function(d){
			return address.straat + ' ' + address.nummer + (address.letter || '' ) + '<br>' + address.woonplaats;
		});
		
		var svg = graphdiv.append('svg');
		var chart;
		var selectmenu = graphdiv.append('div').append('select');
			selectmenu.append('option').attr('value',2013).html('2013');
			selectmenu.append('option').attr('value',2012).html('2012');
			selectmenu.on('change', function(e){
				console.log(this.value);
				var data = processor.data(response).filter('year', this.value).group('month').map('month', 'waarde').data();
				var graphdata = [
				{
				  values: data,      //as x,y
				  key: 'Gasgebruik',
				  color: '#ff7f0e',
				  bar: true
				}];
				svg.datum(graphdata).call(chart);
			});
		var graphdata = [
			{
			  values: data,      //as x,y
			  key: 'Gasgebruik',
			  color: '#ff7f0e',
			  bar: true
			}];
		nv.addGraph(function() {
		  chart = nv.models.multiBarChart();

		  chart.xAxis
			  .axisLabel('Maand')
			  .tickFormat(d3.format(',r'));

		  chart.yAxis
			  .axisLabel('Verbruik (m3)')
			  .tickFormat(d3.format('.02f'));
		  
		  svg
			.datum(graphdata)
			.call(chart);
			
			
			
		});
		*/