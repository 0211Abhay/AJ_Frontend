import React, { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const ExportClients = ({ brokerId }) => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    
    if (brokerId) {
      console.log(`Exporting clients for broker ID: ${brokerId}`);
      // Use broker-specific endpoint
      axios.post('http://localhost:5001/api/client/getClientsByBroker', {
        broker_id: brokerId
      })
        .then((res) => {
          setClients(res.data);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Error fetching clients:', err);
          setError(err.message);
          setLoading(false);
        });
    } else {
      // Fallback to all clients if no broker ID provided
      console.warn('No broker ID provided, fetching all clients');
      axios.get('http://localhost:5001/api/client/getAllClient')
        .then((res) => {
          setClients(res.data);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Error fetching clients:', err);
          setError(err.message);
          setLoading(false);
        });
    }
  }, [brokerId]);

  const handleExportClick = () => {
    const worksheet = XLSX.utils.json_to_sheet(clients);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clients");

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, "clients.xlsx");
  };

  // Auto-export on successful data fetch
  useEffect(() => {
    if (!loading && !error && clients.length > 0) {
      handleExportClick();
    }
  }, [clients, loading, error]);

  // Component doesn't render UI - it just triggers the export
  return null;
};

export default ExportClients;
