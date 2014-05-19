<?php

$north = $_REQUEST['north'];
$south = $_REQUEST['south'];
$west  = $_REQUEST['west'];
$east  = $_REQUEST['east'];


$width = $east - $west;
$height = $north - $south;
$area = $width * $height;
$zoom = 50 / $area;

$segmentlength = $area / (25*25); 

header('Content-type: application/json');
$conn = pg_pconnect("host=192.168.26.76 dbname=research user=postgres password=postgres");
if (!$conn) {
  echo "A connection error occurred.\n";
  exit;
}
$query = "
WITH 
bounds AS (
	SELECT ST_Segmentize(ST_MakeEnvelope($west, $south, $east, $north, 28992),$segmentlength) geom
),
terrain AS (
	SELECT $west::text || $south::text || 't'||fid id, typelandgebruik as type,
	  ST_Intersection(wkb_geometry, geom) As geom
	FROM brt_201402.terrein_vlak a, bounds b
	WHERE ST_Intersects(a.wkb_geometry, b.geom)
	--AND fid = 124352708
)
,
roads AS (
	SELECT $west::text || $south::text || 'r'||fid id, 'wegvlak'::text as type,
	  ST_Intersection(wkb_geometry, geom) As geom
	FROM brt_201402.wegdeel_vlak a, bounds b
	WHERE ST_Intersects(a.wkb_geometry, b.geom)
	AND fysiekvoorkomen Is Null
),
water AS (
	SELECT $west::text || $south::text || 'w'||fid id, 'water'::text as type,
	  ST_Intersection(wkb_geometry, geom) As geom
	FROM brt_201402.waterdeel_vlak a, bounds b
	WHERE ST_Intersects(a.wkb_geometry, b.geom)
),
breaklines AS ( --TODO: add breaklines to rest of query
	SELECT $west::text || $south::text || 'br'||fid id, 'breakline'::text as type,
	  ST_Intersection(wkb_geometry, geom) As geom
	FROM brt_201402.hoogteverschilhz_lijn a, bounds b
	WHERE ST_Intersects(a.wkb_geometry, b.geom)
)
,polygons AS (
	SELECT * FROM terrain
	UNION
	SELECT * FROM roads
	UNION
	SELECT * FROM water
),
points AS ( -- get pts in every boundary
	SELECT t.id, t.type, PC_Explode(pa)::geometry geom
	FROM ahn2terrain, polygons t
	WHERE ST_Intersects(
		geom,
		geometry(pa)
	)
	AND t.type != 'water'
),
--Get PC points within polygons (later used again to fit Z-values to triangles)
points_in_polygon AS ( 
	SELECT p.id, p.type, p.geom geom
	FROM points p
	JOIN polygons t ON (p.id = t.id AND ST_Intersects(
		ST_Buffer(t.geom,-0.5),
		p.geom
	))
),
points_filtered AS ( 
	SELECT p.id, p.type, p.geom geom
	FROM points p
	JOIN polygons t ON (p.id = t.id AND ST_Intersects(
		ST_Buffer(t.geom,-0.5),
		p.geom
	)) --TODO: idea: base random factor on the std-deviation of the points in the intersection
	WHERE random() < $zoom --reduce the number of points
),
--Make a set of ALL the points to triangulate with
points_combined AS (
	SELECT * FROM points_filtered
	UNION
	SELECT id, type, ST_Force3D((ST_Dumppoints(geom)).geom) geom FROM polygons
)

--okay, now we have points from the PC, triangulate them to find crossings with the polygons
,triags1 AS ( --TODO: we should add the points from the tile boundary here
	SELECT (ST_Dump(ST_DelaunayTriangles(ST_Collect(ST_Force2D(geom)),0,0))).geom tin
	FROM points_combined
)

--now find the crossings and produce new triangles
,triags1_5 AS (
	SELECT id, type, (ST_Dump(ST_Tesselate((ST_Dump(ST_Intersection(tin, geom))).geom))).geom geom
	FROM triags1, polygons
	WHERE ST_Intersects(geom, tin)
	--AND (geom) = 'ST_Triangle'
)
--rebuild the triangles into polygons
,triags2 AS ( 
	SELECT nextval('counter') tid, id, type, ST_MakePolygon(ST_ExteriorRing(geom)) geom
	FROM triags1_5
	WHERE ST_GeometryType(geom) = 'ST_Triangle'
)

,noded_polygons AS (
	SELECT id, type, ST_Union(geom) geom
	FROM triags2
	GROUP BY id,type
)
,boundspoints AS ( --get points on boundary of every terrain
	SELECT id, type, ST_Force3D((ST_Dumppoints(geom)).geom) geom FROM noded_polygons
),
boundspoints_patch AS ( --get closest patch to every vertex
	SELECT a.id, a.type, a.geom,  --find closes patch to point
	COALESCE(b.pa, 
		(
		SELECT b.pa FROM ahn2terrain b
		ORDER BY a.geom <#> b.pa::geometry 
		LIMIT 1
		)
	) pa
	FROM boundspoints a LEFT JOIN ahn2terrain b
	ON ST_Intersects(
		geom,
		geometry(pa)
	)
),
emptyz AS ( --find closest pt for every boundary point
	SELECT a.*, ( --find closest pc.pt to point
		SELECT b.pt FROM (SELECT PC_Explode(a.pa) pt ) b
		ORDER BY a.geom <#> b.pt::geometry
		LIMIT 1
	) pt
	FROM boundspoints_patch a
	
)
-- assign z-value for every boundary point
,filledz AS ( 
	SELECT id, type, ST_Translate(geom, 0,0,PC_Get(first(pt),'z')) geom
	FROM emptyz
	GROUP BY id, type, geom
)
--combine polygon vertices with PC vertices
,pointsetz AS ( 
	SELECT id, type, geom FROM points_filtered --points from pointcloud
UNION
	SELECT id, type, geom FROM filledz --points from polygons
)
--4 secs later.... Now we have all relevant points we can start creating the TIN

,triag_points AS (
	SELECT tid, id, type, ST_DumpPoints(geom) g FROM triags2
)
,tin_pointsz AS ( --replace points with 3D version
	SELECT tid, tp.id, tp.type, (tp.g).path, p.geom
	FROM triag_points tp INNER JOIN pointsetz p
	ON (tp.id = p.id AND ST_Equals((tp.g).geom, p.geom))
	GROUP BY tid, tp.id, tp.type, (tp.g).path, p.geom, (tp.g).geom
	ORDER BY tid, id, path
)
,new_tin_lines AS (--put back to lines
	SELECT id, type, ST_Reverse(ST_MakeLine(geom)) geom
	FROM tin_pointsz
	GROUP BY tid,id, type
)
,new_tin AS (
	SELECT id, type, ST_Tesselate(ST_MakePolygon(geom)) geom
	FROM new_tin_lines
	WHERE ST_NPoints(geom) >= 4
)
,tins_agg AS (--horrible hack to get the tins aggregated glued
	SELECT id, type, 
	'TIN Z(' || string_agg(
		replace(replace(ST_AsText(geom),'TIN Z (',''),')))','))')
		,',') || ')'geom
	FROM new_tin
	GROUP BY id, type
)

SELECT $south::text || $west::text || id, 'terrain' as type, 
	CASE
		WHEN type = 'overig' THEN 'gray'
		WHEN type = 'bebouwd gebied' THEN 'gray'
		WHEN type = 'grasland' THEN 'green'
		WHEN type = 'bos: loofbos' THEN '0 0.4 0'
		WHEN type = 'basaltblokken, steenglooiing' THEN 'black'
		WHEN type = 'wegvlak' THEN '0.4 0.4 0.4'
		WHEN type = 'water' THEN '0 0 0.6'
		WHEN type = 'zand' THEN '0.8 0.8 0.3'
		WHEN type = 'akkerland' THEN '0.8 0.7 0.3'
		ELSE 'red'
	END as color, 
	ST_AsX3D(geom,3) geom
FROM tins_agg
;
";

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
