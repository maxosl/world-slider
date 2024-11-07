import React, { useEffect, useRef, useState } from 'react';
import { geoOrthographic, geoPath, select, drag, interpolate, transition, geoCentroid } from "d3";


const WorldMap = () => {
  const svgRef = useRef(null);
  const [selectedCountryIndex, setSelectedCountryIndex] = useState(0);
  const [geoData, setGeoData] = useState(null);
  const [rotation, setRotation] = useState([0, 0]); // Rotation angles [lambda, phi]
  const rotationRef = useRef([0, -30]); // Start with a slight tilt



  const width = 600;
  const height = 600;
  const radius = Math.min(width, height) / 2 - 20; // Radius for the orthographic projection

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
    if(!geoData) return;

    const svg = select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const projection = geoOrthographic()
      .scale(radius)
      .translate([width / 2, height / 2])
      .rotate(rotationRef.current);

    const pathGenerator = geoPath().projection(projection);

    // Render the globe with countries
    svg.selectAll('path')
      .data(geoData.features)
      .join('path')
      .attr('d', (feature) => pathGenerator(feature.geometry) || '')
      .attr('fill', (d, i) => (i === selectedCountryIndex ? 'blue' : '#ccc'))
      .attr('stroke', '#333')
      .on('click', (event, d) => {
        const index = geoData.features.indexOf(d);
        setSelectedCountryIndex(index);
      });

    // Smooth rotation logic with requestAnimationFrame
    let lastRotation = rotationRef.current;

    function render() {
      const currentRotation = projection.rotate();
      if (
        currentRotation[0] !== lastRotation[0] ||
        currentRotation[1] !== lastRotation[1]
      ) {
        lastRotation = [...currentRotation];
        svg.selectAll('path').attr('d', pathGenerator); // Redraw paths
      }
      requestAnimationFrame(render);
    }
    render();

    // Set up drag behavior for smooth rotation
    const dragFunc = drag().on('drag', (event) => {
      const [lambda, phi] = projection.rotate();
      const sensitivity = 2.0;

      const targetRotation = [
        lambda + event.dx * sensitivity,
        Math.max(-90, Math.min(90, phi - event.dy * sensitivity)),
      ];

      const interpolator = interpolate(rotationRef.current, targetRotation);

      transition()
        .duration(100)
        .tween('rotate', () => (t) => {
          const newRotation = interpolator(t);
          projection.rotate(newRotation);
          rotationRef.current = newRotation;
        });
    });

    svg.call(dragFunc);
  }, [geoData, rotation, radius, selectedCountryIndex]);

  useEffect(() => {
    if (!geoData) return;

    const projection = geoOrthographic()
      .scale(radius)
      .translate([width / 2, height / 2])
      .rotate(rotationRef.current);

    const pathGenerator = geoPath().projection(projection);

    // Get the centroid of the selected country
    const selectedCountry = geoData.features[selectedCountryIndex];
    const [cx, cy] = geoCentroid(selectedCountry);

    // Calculate the new rotation to center the country
    const targetRotation = [-cx, -cy];
    const interpolator = interpolate(rotationRef.current, targetRotation);

    transition()
      .duration(1250) // Smooth transition duration
      .tween('rotate', () => (t) => {
        const newRotation = interpolator(t);
        projection.rotate(newRotation);
        rotationRef.current = newRotation;

        select(svgRef.current)
          .selectAll('path')
          .attr('d', pathGenerator); // Redraw paths during rotation
      });
  }, [selectedCountryIndex, geoData]);

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