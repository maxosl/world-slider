import React, { useEffect, useRef, useState, useCallback } from 'react';
import { geoOrthographic, geoMercator, geoPath, select, drag, geoCentroid, transition, interpolate } from 'd3';
import debounce from 'lodash.debounce';

const WorldMap = () => {
  const svgRef = useRef(null);
  const [geoData, setGeoData] = useState(null);
  const [geojsonFiles, setGeojsonFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState("world_1914.geojson");
  const [selectedCountryIndex, setSelectedCountryIndex] = useState(0);
  const [projectionType, setProjectionType] = useState("Orthographic");
  const [sensitivity, setSensitivity] = useState(0.5);
  const [zoomLevel, setZoomLevel] = useState(4000);
  const [tilt, setTilt] = useState(45);
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(800);
  const rotationRef = useRef([0, -30]);
  const isDragging = useRef(false);

  // Debounced setters for width and height
  const debouncedSetWidth = debounce((value) => setWidth(value), 100);
  const debouncedSetHeight = debounce((value) => setHeight(value), 100);
  const debouncedSetZoomLevel = debounce((value) => setWidth(value), 100);
  const debouncedSetTilt = debounce((value) => setHeight(value), 400);

  useEffect(() => {
    // Fetch list of GeoJSON files
    const fetchGeojsonFiles = async () => {
      try {
        const response = await fetch('/geojsonFiles.json');
        if (!response.ok) throw new Error(`Failed to fetch geojsonFiles.json: ${response.statusText}`);
        const files = await response.json();
        setGeojsonFiles(files);
      } catch (error) {
        console.error(error);
      }
    };
    fetchGeojsonFiles();
  }, []);

  const smoothRotation = useCallback((dx, dy, projection, svg, pathGenerator) => {
    const [lambda, phi] = rotationRef.current;
    rotationRef.current = [
      lambda + dx * sensitivity,
      Math.max(-90, Math.min(90, phi - dy * sensitivity)),
    ];
    projection.rotate(rotationRef.current);
    svg.selectAll('path').attr('d', pathGenerator);
  }, [sensitivity]);

  const zoomToCountry = useCallback((country, projection, svg) => {
    const [cx, cy] = geoCentroid(country);

    // Create target rotation and zoom settings
    const targetRotation = [-cx, -cy, tilt];
    const targetScale = zoomLevel;

    const pathGenerator = geoPath().projection(projection);

    // Animate rotation and scale change
    transition()
      .duration(2000)
      .tween('projection', () => {
        const rotateInterpolator = interpolate(rotationRef.current, targetRotation);
        const scaleInterpolator = interpolate(projection.scale(), targetScale);

        return (t) => {
          projection
            .rotate(rotateInterpolator(t))
            .scale(scaleInterpolator(t));

          rotationRef.current = projection.rotate();
          svg.selectAll('path').attr('d', pathGenerator); // Redraw paths
        };
      });
  }, [tilt, zoomLevel]);

  useEffect(() => {
    // Fetch selected GeoJSON data
    const fetchGeoData = async () => {
      try {
        const response = await fetch(`/geojson/${selectedFile}`);
        if (!response.ok) throw new Error(`Failed to fetch GeoJSON: ${response.statusText}`);
        const data = await response.json();
        setGeoData(data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchGeoData();
  }, [selectedFile]);

  useEffect(() => {
    if (!geoData) return;

    const svg = select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const projection = (projectionType === "Orthographic" ? geoOrthographic() : geoMercator())
      .scale(Math.min(width, height) / 2 - 20)
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
      requestAnimationFrame(() => smoothRotation(dx, dy, projection, svg, pathGenerator));
    };

    const dragEnd = () => {
      isDragging.current = false;
    };

    svg.call(drag().on('start', dragStart).on('drag', dragMove).on('end', dragEnd));

    if (geoData.features[selectedCountryIndex]) {
      zoomToCountry(geoData.features[selectedCountryIndex], projection, svg);
    }

  }, [geoData, width, height, projectionType, sensitivity, selectedCountryIndex, smoothRotation, zoomToCountry]);

  return (
    <div style={styles.container}>
      <div style={styles.menuPanel}>
        <label>
          GeoJSON File:
          <select value={selectedFile} onChange={(e) => setSelectedFile(e.target.value)}>
            {geojsonFiles.map((file) => (
              <option key={file} value={file}>{file}</option>
            ))}
          </select>
        </label>
        <label>
          Projection:
          <select value={projectionType} onChange={(e) => setProjectionType(e.target.value)}>
            <option value="Orthographic">Orthographic</option>
            <option value="Mercator">Mercator</option>
          </select>
        </label>
        <label>
          Zoom level:
          <input
            type="number"
            step="100"
            value={zoomLevel}
            onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
          />
        </label>
        <label>
          Tilt:
          <input
            type="number"
            step="1"
            value={tilt}
            onChange={(e) => setTilt(parseFloat(e.target.value))}
          />
        </label>
        <label>
          Rotation Sensitivity:
          <input
            type="number"
            step="0.1"
            value={sensitivity}
            onChange={(e) => setSensitivity(parseFloat(e.target.value))}
          />
        </label>
        <label>
          Width:
          <input
            type="number"
            value={width}
            onChange={(e) => debouncedSetWidth(parseInt(e.target.value))}
          />
        </label>
        <label>
          Height:
          <input
            type="number"
            value={height}
            onChange={(e) => debouncedSetHeight(parseInt(e.target.value))}
          />
        </label>
      </div>
      <div style={styles.mapContainer}>
        <svg ref={svgRef} style={styles.svg}></svg>
        <input
          type="range"
          min="0"
          max={geoData ? geoData.features.length - 1 : 0}
          value={selectedCountryIndex}
          onChange={(e) => setSelectedCountryIndex(parseInt(e.target.value))}
          style={styles.slider}
        />
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  menuPanel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginRight: '20px',
  },
  mapContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  svg: {
    cursor: 'grab',
  },
  slider: {
    marginTop: '20px',
    width: '100%',
  },
};

export default WorldMap;
