import React, { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';

const ExportClients = ({ brokerId, onExportComplete, onExportError }) => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Format client data for Excel export
  const formatClientData = (clientsData) => {
    return clientsData.map(client => {
      // Extract the client ID from various possible properties
      const clientId = client.client_id || client.id || client.clientId;
      
      // Format join date if available
      let formattedJoinDate = 'N/A';
      if (client.joinDate) {
        try {
          formattedJoinDate = format(new Date(client.joinDate), 'MM/dd/yyyy');
        } catch (e) {
          console.warn('Error formatting join date:', e);
        }
      }
      
      return {
        'Client ID': clientId,
        'Name': client.name || 'N/A',
        'Email': client.email || 'N/A',
        'Phone': client.phone || 'N/A',
        'Address': client.address || 'N/A',
        'Join Date': formattedJoinDate,
        'Broker ID': brokerId || 'N/A'
      };
    });
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    
    // Get the authentication token
    const token = localStorage.getItem('token');
    const authHeader = token ? { 'Authorization': `Bearer ${token}` } : {};
    
    if (brokerId) {
      console.log(`Exporting clients for broker ID: ${brokerId}`);
      // Use broker-specific endpoint with proper error handling
      axios.get(`http://localhost:5001/api/clients/broker/${brokerId}`, {
        headers: authHeader
      })
        .then((res) => {
          if (res.data && Array.isArray(res.data)) {
            setClients(res.data);
            setLoading(false);
          } else if (res.data && Array.isArray(res.data.clients)) {
            setClients(res.data.clients);
            setLoading(false);
          } else {
            console.error('Unexpected data format:', res.data);
            setError('Received unexpected data format from server');
            setLoading(false);
            if (onExportError) onExportError('Unexpected data format received');
          }
        })
        .catch((err) => {
          console.error('Error fetching clients for export:', err);
          setError(err.message || 'Failed to fetch client data');
          setLoading(false);
          if (onExportError) onExportError(err.message || 'Failed to fetch client data');
        });
    } else {
      // Fallback to all clients if no broker ID provided
      console.warn('No broker ID provided, fetching all clients');
      axios.get('http://localhost:5001/api/clients', {
        headers: authHeader
      })
        .then((res) => {
          if (res.data && Array.isArray(res.data)) {
            setClients(res.data);
            setLoading(false);
          } else if (res.data && Array.isArray(res.data.clients)) {
            setClients(res.data.clients);
            setLoading(false);
          } else {
            console.error('Unexpected data format:', res.data);
            setError('Received unexpected data format from server');
            setLoading(false);
            if (onExportError) onExportError('Unexpected data format received');
          }
        })
        .catch((err) => {
          console.error('Error fetching all clients for export:', err);
          setError(err.message || 'Failed to fetch client data');
          setLoading(false);
          if (onExportError) onExportError(err.message || 'Failed to fetch client data');
        });
    }
  }, [brokerId, onExportError]);

  const handleExportClick = () => {
    try {
      // Format the data for Excel
      const formattedData = formatClientData(clients);
      
      // Create worksheet with formatted data
      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      
      // Set column widths for better readability
      const columnWidths = [
        { wch: 10 }, // Client ID
        { wch: 25 }, // Name
        { wch: 30 }, // Email
        { wch: 15 }, // Phone
        { wch: 30 }, // Address
        { wch: 12 }, // Join Date
        { wch: 10 }  // Broker ID
      ];
      worksheet['!cols'] = columnWidths;
      
      // Create workbook and append worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Clients");

      // Generate filename with date
      const date = format(new Date(), 'yyyy-MM-dd');
      const filename = `clients_export_${date}.xlsx`;
      
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
    if (!loading && !error && clients.length > 0) {
      handleExportClick();
    } else if (!loading && !error && clients.length === 0) {
      // Handle case where there are no clients to export
      if (onExportError) onExportError('No clients found to export');
    }
  }, [clients, loading, error, onExportComplete, onExportError]);

  // Component doesn't render UI - it just triggers the export
  return null;
};

export default ExportClients;
