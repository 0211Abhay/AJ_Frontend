import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';

const ExportProperties = ({ brokerId, onExportComplete, onExportError }) => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Format property data for Excel export
  const formatPropertyData = (propertiesData) => {
    return propertiesData.map(property => {
      // Format date if available
      let formattedCreatedDate = 'N/A';
      if (property.createdAt) {
        try {
          formattedCreatedDate = format(new Date(property.createdAt), 'MM/dd/yyyy');
        } catch (e) {
          console.warn('Error formatting created date:', e);
        }
      }

      // Format price with currency symbol
      let formattedPrice = 'N/A';
      if (property.price && !isNaN(parseFloat(property.price))) {
        formattedPrice = `$${parseFloat(property.price).toLocaleString()}`;
      }

      // Format amenities
      let formattedAmenities = '';
      if (property.amenities) {
        try {
          if (typeof property.amenities === 'string') {
            // Try to parse JSON string
            try {
              formattedAmenities = JSON.parse(property.amenities).join(', ');
            } catch (e) {
              formattedAmenities = property.amenities;
            }
          } else if (Array.isArray(property.amenities)) {
            formattedAmenities = property.amenities.join(', ');
          } else {
            formattedAmenities = String(property.amenities);
          }
        } catch (e) {
          console.warn('Error formatting amenities:', e);
          formattedAmenities = 'Error parsing amenities';
        }
      }

      // Get broker name if available
      let brokerName = 'N/A';
      if (property.broker && property.broker.name) {
        brokerName = property.broker.name;
      }
      
      return {
        'Property ID': property.propertyId || 'N/A',
        'Name': property.name || 'N/A',
        'Property Type': property.propertyType || 'N/A',
        'Property For': property.propertyFor || 'N/A',
        'Price': formattedPrice,
        'Location': property.location || 'N/A',
        'Bedrooms': property.bedrooms || 'N/A',
        'Bathrooms': property.bathrooms || 'N/A',
        'Area (sq ft)': property.area ? `${property.area}` : 'N/A',
        'Year Built': property.yearBuilt || 'N/A',
        'Status': property.status || 'N/A',
        'Amenities': formattedAmenities || 'N/A',
        'Description': property.description || 'N/A',
        'Created Date': formattedCreatedDate,
        'Broker ID': property.broker ? property.broker.brokerId : 'N/A',
        'Broker Name': brokerName
      };
    });
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    
    // Get the authentication token
    const token = localStorage.getItem('token');
    const authHeader = token ? { 'Authorization': `Bearer ${token}` } : {};
    
    // If broker ID is provided, use broker-specific endpoint
    // Use the correct endpoints that match the backend controller
    const endpoint = brokerId 
      ? `http://localhost:5001/api/properties/broker/${brokerId}`
      : 'http://localhost:5001/api/properties';
      
    console.log(`Exporting properties from endpoint: ${endpoint}`);
    
    // Try without authentication headers first (since we've updated WebSecurityConfig)
    axios.get(endpoint)
      .then(res => {
        // Handle different response structures
        const propertiesData = res.data.properties || res.data;
        
        // Make sure propertiesData is an array
        if (!Array.isArray(propertiesData)) {
          const errorMsg = 'Invalid data format received from server';
          console.error(errorMsg, res.data);
          setError(errorMsg);
          setLoading(false);
          if (onExportError) onExportError(errorMsg);
          return;
        }
        
        setProperties(propertiesData);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching properties for export:', err);
        const errorMsg = err.message || 'Failed to fetch property data';
        setError(errorMsg);
        setLoading(false);
        if (onExportError) onExportError(errorMsg);
      });
  }, [brokerId, onExportError]);

  // Function to export data
  const handleExportClick = () => {
    try {
      // Format the data for Excel
      const formattedData = formatPropertyData(properties);
      
      // Create worksheet with formatted data
      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      
      // Set column widths for better readability
      const columnWidths = [
        { wch: 10 },  // Property ID
        { wch: 30 },  // Name
        { wch: 15 },  // Property Type
        { wch: 15 },  // Property For
        { wch: 15 },  // Price
        { wch: 30 },  // Location
        { wch: 10 },  // Bedrooms
        { wch: 10 },  // Bathrooms
        { wch: 12 },  // Area
        { wch: 10 },  // Year Built
        { wch: 12 },  // Status
        { wch: 40 },  // Amenities
        { wch: 50 },  // Description
        { wch: 15 },  // Created Date
        { wch: 10 }   // Broker ID
      ];
      worksheet['!cols'] = columnWidths;
      
      // Create workbook and append worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Properties");

      // Generate filename with date
      const date = format(new Date(), 'yyyy-MM-dd');
      const filename = `properties_export_${date}.xlsx`;
      
      // Create Excel file and trigger download
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      saveAs(blob, filename);
      
      // Notify parent component of successful export
      if (onExportComplete) onExportComplete(formattedData.length);
    } catch (err) {
      console.error('Error during export:', err);
      if (onExportError) onExportError(err.message || 'Failed to export data');
    }
  };

  // Auto-export on successful data fetch
  useEffect(() => {
    if (!loading && !error && properties.length > 0) {
      handleExportClick();
    } else if (!loading && !error && properties.length === 0) {
      // Handle case where there are no properties to export
      if (onExportError) onExportError('No properties found to export');
    }
  }, [properties, loading, error, onExportComplete, onExportError]);

  // Component doesn't render UI - it just triggers the export
  return null;
};

export default ExportProperties;
