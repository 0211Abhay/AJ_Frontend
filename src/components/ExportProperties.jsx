import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const ExportProperties = ({ brokerId }) => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch data on component mount or when brokerId changes
  useEffect(() => {
    setLoading(true);
    
    // If broker ID is provided, use broker-specific endpoint
    const endpoint = brokerId 
      ? `http://localhost:5001/api/property/getPropertiesByBroker/${brokerId}`
      : 'http://localhost:5001/api/property/getAllProperty';
      
    console.log(`Exporting properties from endpoint: ${endpoint}`);
    
    axios.get(endpoint)
      .then(res => {
        // Handle different response structures
        const propertiesData = res.data.properties || res.data;
        
        // Make sure propertiesData is an array
        if (!Array.isArray(propertiesData)) {
          throw new Error('Invalid data format received from server');
        }
        
        const formatted = propertiesData.map((property) => ({
          ...property,
          amenities: property.amenities ? 
            (typeof property.amenities === 'string' ? 
              JSON.parse(property.amenities).join(', ') : 
              Array.isArray(property.amenities) ? 
                property.amenities.join(', ') : 
                property.amenities)
            : ''
        }));
        setProperties(formatted);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching properties:', err);
        setError(err.message);
        setLoading(false);
      });
  }, [brokerId]);

  // Function to export data
  const handleExportClick = () => {
    const worksheet = XLSX.utils.json_to_sheet(properties);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Properties");

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, "properties.xlsx");
  };

  // Auto-export on successful data fetch
  useEffect(() => {
    if (!loading && !error && properties.length > 0) {
      handleExportClick();
    }
  }, [properties, loading, error]);

  // Component doesn't render UI - it just triggers the export
  return null;
};

export default ExportProperties;
