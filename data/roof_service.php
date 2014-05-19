<?php

$north = $_REQUEST['north'];
$south = $_REQUEST['south'];
$west  = $_REQUEST['west'];
$east  = $_REQUEST['east'];


$width = $east - $west;
$height = $north - $south;
$area = $width * $height;
$zoom = 50 / $area;

$segmentlength = 1; //TODO: make dependant on zoom

header('Content-type: application/json');
$conn = pg_pconnect("host=192.168.26.76 dbname=research user=postgres password=postgres");
if (!$conn) {
  echo "A connection error occurred.\n";
  exit;
}
$query = "
WITH 
bounds AS (
	SELECT ST_Segmentize(ST_MakeEnvelope($west, $south, $east, $north, 28992),1) geom
),
footprints AS (
	SELECT 
		a.ogc_fid id,
		ST_Force2D(wkb_geometry) geom
	FROM bag.panden_nijmegen a, bounds b
	WHERE ST_Intersects(ST_Centroid(a.wkb_geometry), b.geom)
	AND gebw_type = 'p'
	--AND a.ogc_fid = '25531' OR a.ogc_fid = '25529' OR a.ogc_fid = '25528' OR a.ogc_fid = '25610'
),
/** PART 1, find roofedge **/
roofcornerpts AS (
	SELECT id, (ST_DumpPoints(geom)).*, geom footprint
	FROM footprints
),
roofcornercloud AS (
	SELECT a.*, PC_Explode(b.pa) pt
	FROM roofcornerpts a, ahn2 b
	WHERE ST_Intersects(a.geom, b.pa::geometry)
),
bordersz AS ( --find avg height around 
	SELECT a.*, (
		SELECT avg(PC_Get(b.pt,'z')) FROM roofcornercloud b
		WHERE ST_DWithin(a.footprint, pt::geometry, 1) AND ST_Intersects(a.footprint, pt::geometry)
	) z
	FROM roofcornerpts a
),
/** PART 2, get rooftop**/
papoints AS ( --get points from intersecting patches
	SELECT 
		a.id,
		PC_Explode(b.pa) pt,
		geom footprint
	FROM footprints a
	LEFT JOIN ahn2 b ON (ST_Intersects(a.geom, geometry(b.pa)))
),
footprintpatch AS ( --get only points that fall inside building, patch them
	SELECT id, PC_Patch(pt) pa, footprint
	FROM papoints WHERE ST_Intersects(footprint, pt::geometry)
	GROUP BY id, footprint
),
points AS (
	SELECT  id, footprint, 
		PC_Explode(pa) pt,
		PC_PatchMax(pa, 'z') max,
		PC_PatchMin(pa, 'z') min
	FROM footprintpatch
	
),
triags AS (
	SELECT 'roof'::text || id as id, ST_DelaunayTriangles(ST_Collect(pt::geometry),0,2) tin FROM points
	WHERE random() < 1
	GROUP BY id
)
SELECT id, 'roof' as type, 'red' as color, ST_AsX3D(ST_Translate(tin,0,0,1)) geom
FROM triags";

$result = pg_query($conn, $query);
if (!$result) {
  echo "An error occurred.\n";
  exit;
}
$res_string = "id;type;color;geom;\n";
while ($row = pg_fetch_row($result)) {
	$res_string = $res_string . implode(';',$row) . "\n";
}
ob_start("ob_gzhandler");
echo $res_string;
ob_end_flush();
?>
