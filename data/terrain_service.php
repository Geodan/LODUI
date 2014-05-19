<?php

$north = $_REQUEST['north'];
$south = $_REQUEST['south'];
$west  = $_REQUEST['west'];
$east  = $_REQUEST['east'];

$width = $east - $west;
$height = $north - $south;
$area = $width * $height;
$zoom = 50 / $area;

//$zoom  = $_REQUEST['zoom'] ?: 0.005;

$segmentlength = 0.1 / $zoom;

header('Content-type: application/json');
$conn = pg_pconnect("host=192.168.26.76 dbname=research user=postgres password=postgres");
if (!$conn) {
  echo "A connection error occurred.\n";
  exit;
}
$query = "
WITH 
bounds AS (
	SELECT ST_MakeEnvelope($west, $south, $east, $north, 28992) geom
),
--ROADS
roads AS (
	SELECT 
	 ST_Collect( 
	  ST_SnapToGrid(
		wkb_geometry
		--ST_Intersection(wkb_geometry, geom)
	  ,0.1,0.1)
	) As geom
  	  
	FROM brt_201402.wegdeel_vlak a, bounds b
	WHERE ST_Intersects(a.wkb_geometry, b.geom)
	AND typeinfrastructuurwegdeel != 'overig verkeersgebied'
	AND fysiekvoorkomen Is Null
),
--We need some points at the boundary to (poorly) seamlessly fit the tiles
boundspoints AS (
	SELECT ST_Force3D((ST_Dumppoints(ST_Segmentize(geom,$segmentlength))).geom) geom FROM bounds
),
boundspointsz AS (
	SELECT pa, ST_Translate(geom, 0,0,PC_PatchAvg(pa,'z')) geom
	FROM boundspoints p, ahn2terrain
	WHERE ST_Intersects(
		geom,
		geometry(pa)
	)
),
emptyz AS (
	SELECT a.*, ( --find closest pc.pt to point
		SELECT b.pt FROM (SELECT PC_Explode(a.pa) pt ) b
		ORDER BY a.geom <#> b.pt::geometry 
		LIMIT 1
	) pt
	FROM boundspointsz a
),
filledz AS (
	SELECT ST_Translate(geom, 0,0,PC_Get(first(pt),'z')) geom
	FROM emptyz
	GROUP BY geom
),
points AS (
	SELECT PC_Explode(pa)::geometry geom 
	FROM ahn2terrain, bounds
	WHERE ST_Intersects(
		geom,
		geometry(pa)
	)
),
points_filtered AS (
	SELECT p.geom FROM points p, roads r
	WHERE random() < $zoom --reduce the number of points
	AND Not ST_Intersects(p.geom, r.geom)
	UNION
	SELECT geom FROM boundspointsz -- filledz
	
)
SELECT nextval('counter') id, 'terrain' as type, ST_AsX3D(ST_DelaunayTriangles(ST_Collect(p.geom), 1,2),2)
FROM points_filtered p, bounds b
WHERE ST_Intersects(p.geom, b.geom)
";


$result = pg_query($conn, $query);
if (!$result) {
  echo "An error occurred.\n";
  exit;
}

$res_string = "id;type;geom;\n";
while ($row = pg_fetch_row($result)) {
	$res_string = $res_string . implode(';',$row) . "\n";
}
ob_start("ob_gzhandler");
echo $res_string;
ob_end_flush();

?>
