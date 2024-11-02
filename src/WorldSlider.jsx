import React, { useEffect, useRef, useState } from 'react';
import { geoMercator, geoPath, select } from "d3";
import { feature } from 'topojson-client';


const WorldMap = () => {
  const svgRef = useRef(null);
  const [selectedCountryIndex, setSelectedCountryIndex] = useState(0);
  const [geoData, setGeoData] = useState(null);

  const width = 800;
  const height = 500;

  useEffect(() => {
    const fetchGeoData = async () => {
      const response = await fetch('/world-countries.geojson');
      const data = await response.json();
      setGeoData(data);
    };
    fetchGeoData();
  }, [])

  useEffect(() => {
    console.log('data', geoData);
    const svg = select(svgRef.current)
    .attr('width', width)
    .attr('height', height);
 
    const countries = feature(geoData, geoData.objects.countries);
    const projection = geoMercator().fitSize([width, height], countries);
    const path = geoPath().projection(projection);

    svg.selectAll('path')
    .data(geoData.features)
    .join('path')
    .attr("d", path)
    .attr('fill', (d, i) => (i === selectedCountryIndex ? 'blue' : '#ccc'))
    .attr('stroke', '#333')

        
  }, [geoData, selectedCountryIndex]);

  return (
      <>
        <svg ref={svgRef}></svg>
        <input
        type="range"
        min="0"
        max={geoData.features.length - 1}
        value={selectedCountryIndex}
        onChange={(e) => setSelectedCountryIndex(Number(e.target.value))}
        />
      </>
  );
};

export default WorldMap;