import React, { useEffect, useRef, useState } from 'react';
import { geoOrthographic, geoPath, select, drag, interpolate, transition, geoCentroid } from "d3";


const WorldMap = () => {
  const svgRef = useRef(null);
  const [selectedCountryIndex, setSelectedCountryIndex] = useState(0);
  const [geoData, setGeoData] = useState(null);
  const rotationRef = useRef([0, -30]); // Start with a slight tilt
  const isDragging = useRef(false);

  const width = 800;
  const height = 800;
  const initialScale = Math.min(width, height) / 2 - 20;

  useEffect(() => {
    const fetchGeoData = async () => {
      try {
        const response = await fetch('/geojson/world_1914.geojson');
        if (!response.ok) {
          throw new Error(`Failed to fetch GeoJSON data: ${response.statusText}`);
        }
        const data = await response.json();
        setGeoData(data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchGeoData();
  }, [])


  useEffect(() => {
    if (!geoData) return;

    const svg = select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const projection = geoOrthographic()
      .scale(initialScale)
      .translate([width / 2, height / 2])
      .rotate(rotationRef.current);

    const pathGenerator = geoPath().projection(projection);

    // Render countries
    svg.selectAll('path')
      .data(geoData.features)
      .join('path')
      .attr('d', (feature) => pathGenerator(feature.geometry) || '')
      .attr('fill', (d, i) => (i === selectedCountryIndex ? 'blue' : '#ccc'))
      .attr('stroke', '#333');

    // Function to handle rotation and smooth the dragging effect
    const smoothRotation = (dx, dy) => {
      const [lambda, phi] = rotationRef.current;
      const sensitivity = 0.5; // Adjust sensitivity to control speed

      rotationRef.current = [
        lambda + dx * sensitivity,
        Math.max(-90, Math.min(90, phi - dy * sensitivity)),
      ];

      projection.rotate(rotationRef.current);

      svg.selectAll('path').attr('d', pathGenerator); // Redraw paths
    };

    // Drag event handler with requestAnimationFrame for smoother transitions
    let lastX, lastY;

    const dragStart = (event) => {
      isDragging.current = true;
      lastX = event.x;
      lastY = event.y;
    };

    const dragMove = (event) => {
      if (!isDragging.current) return;
      const dx = event.x - lastX;
      const dy = event.y - lastY;
      lastX = event.x;
      lastY = event.y;

      // Use requestAnimationFrame for smoother rotation
      requestAnimationFrame(() => smoothRotation(dx, dy));
    };

    const dragEnd = () => {
      isDragging.current = false;
    };

    svg
      .call(drag()
        .on('start', dragStart)
        .on('drag', dragMove)
        .on('end', dragEnd));
  }, [geoData, selectedCountryIndex, initialScale]);



  if (!geoData) {
    return <div>Loading map data...</div>;
  }

  return (
    <div style={styles.container}>
      {geoData && (
        <input
          type="range"
          min="0"
          max={geoData.features.length - 1}
          value={selectedCountryIndex}
          onChange={(e) => setSelectedCountryIndex(Number(e.target.value))}
          style={styles.slider}
        />
      )}
      <svg ref={svgRef} style={styles.svg}></svg>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
  },
  svg: {
    cursor: 'grab',
    marginBottom: '15px',
  },
  slider: {
    width: '80%',
    maxWidth: '600px',
  },
};

export default WorldMap;