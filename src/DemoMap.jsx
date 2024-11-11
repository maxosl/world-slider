import React, { useRef, useEffect, useState } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { select } from 'd3-selection';

const DemoMap = () => {
    const [geoData, setGeoData] = useState(null);

    const svgRef = useRef(null);

    useEffect(() => {
        // Fetch selected GeoJSON data
        const fetchGeoData = async () => {
            try {
                const response = await fetch(`/geojson/world_1994.geojson`);
                if (!response.ok) throw new Error(`Failed to fetch GeoJSON: ${response.statusText}`);
                const data = await response.json();
                setGeoData(data);
            } catch (error) {
                console.error(error);
            }
        };
        fetchGeoData();
    }, []);

    useEffect(() => {
        if (!geoData) return;

        const svg = select(svgRef.current);

        // Define projection to focus on Europe + surrounding areas
        const projection = geoMercator()
            .scale(400) // Zoom out further to fit Russia
            .center([30, 58]) // Shifted eastward to capture more of Russia
            .translate([400, 300]); // Centering the map in the SVG

        const pathGenerator = geoPath().projection(projection);

        // Filter to include Europe, Russia, and North Africa
        const extendedRegion = geoData.features.filter(feature => {
            const [longitude, latitude] = geoPath().centroid(feature);
            return latitude >= 20 && latitude <= 75 && longitude >= -30 && longitude <= 100;
        });
        svg.selectAll('path')
            .data(extendedRegion)
            .join('path')
            .attr('d', pathGenerator)
            .attr('fill', '#4CAF50')
            .attr('stroke', '#333')
            .attr('stroke-width', 0.5);
    }, [geoData]);

    return (
        <svg ref={svgRef} width="800" height="600" style={{ border: "1px solid #ccc" }} />
    );
};

export default DemoMap;
