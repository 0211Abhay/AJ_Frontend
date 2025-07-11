import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaFileExport } from 'react-icons/fa';
import ExportClients from '../ExportClients';
import { useAuth } from '../../context/AuthContext';

import "../../style/Clients.css"

const Client = () => {
    // State management
    const [clients, setClients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddingClient, setIsAddingClient] = useState(false);
    const [isEditingClient, setIsEditingClient] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isExporting, setIsExporting] = useState(false);
    const [exportStatus, setExportStatus] = useState({ success: false, message: '', count: 0 });
    const [selectedClient, setSelectedClient] = useState(null);
    const [clientSchedules, setClientSchedules] = useState([]);
    const [clientProperties, setClientProperties] = useState([]);
    const [clientRentals, setClientRentals] = useState([]);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [errorDetails, setErrorDetails] = useState(null);
    const [selectedRental, setSelectedRental] = useState(null);
    const [isRentalDetailsModalOpen, setIsRentalDetailsModalOpen] = useState(false);
    const [paidPayments, setPaidPayments] = useState([]);
    const [currentClient, setCurrentClient] = useState({
        id: null,
        name: '',
        email: '',
        phone: '',
        address: ''
    });

    // Get auth context
    const { broker, loading: authLoading, sessionChecked } = useAuth();

    useEffect(() => {
        // Only fetch clients when auth is ready and not loading
        if (sessionChecked && !authLoading) {
            fetchClients();
        }
    }, [sessionChecked, authLoading]);

    const fetchClientDetails = async (clientId) => {
        setLoadingDetails(true);
        setErrorDetails(null);
        try {
            console.log('Fetching client details for client ID:', clientId);

            // Get the authentication token
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Authentication token not found. Please log in again.');
            }

            const authHeader = { 'Authorization': `Bearer ${token}` };

            // Fetch schedules with authentication
            try {
                // Use the updated endpoint without authentication headers
                const schedulesRes = await axios.get(`http://localhost:5001/api/schedules/getSchedulesByClient/${clientId}`);

                console.log('Fetched schedules:', schedulesRes.data);
                // Check if the response has the expected structure
                if (schedulesRes.data && Array.isArray(schedulesRes.data)) {
                    setClientSchedules(schedulesRes.data);
                } else if (schedulesRes.data && Array.isArray(schedulesRes.data.schedules)) {
                    setClientSchedules(schedulesRes.data.schedules);
                } else {
                    console.log('Unexpected schedule data format:', schedulesRes.data);
                    setClientSchedules([]);
                }

                // Fetch property for the first schedule if available
                const schedules = Array.isArray(schedulesRes.data) ? schedulesRes.data :
                    (schedulesRes.data && Array.isArray(schedulesRes.data.schedules) ? schedulesRes.data.schedules : []);

                if (schedules.length > 0) {
                    // Check both property_id and property.propertyId formats
                    const propertyId = schedules[0].property_id ||
                        (schedules[0].property ? schedules[0].property.propertyId : null);

                    if (propertyId) {
                        console.log('Fetching property with ID:', propertyId);
                        try {
                            const propertyRes = await axios.get(`http://localhost:5001/api/property/getOneProperty/${propertyId}`);
                            console.log('Fetched property data:', propertyRes.data);
                        } catch (propertyError) {
                            console.warn('Could not fetch property details:', propertyError);
                        }
                    } else {
                        console.log('No property ID found in schedule data');
                    }
                } else {
                    console.log('No schedules found.');
                }
            } catch (scheduleError) {
                console.error('Error fetching schedules:', scheduleError);
                // Don't throw here, continue with other data fetching
                setClientSchedules([]);
            }

            // Fetch rental information for the client without authentication headers
            try {
                const rentalRes = await axios.get(`http://localhost:5001/api/rentals/getRentalsByClient/${clientId}`);

                if (rentalRes.data && rentalRes.data.rentals) {
                    console.log('Fetched rentals:', rentalRes.data.rentals);

                    console.log('Processing rental data for client view:', rentalRes.data.rentals);

                    // Format the rental data similar to how it's done in Rental.jsx
                    const formattedRentals = rentalRes.data.rentals.map(rental => {
                        // Get property name - handle both formats
                        const property = rental.property ?
                            (rental.property.name || rental.property.title || 'Unknown Property') :
                            'Unknown Property';

                        // Handle both snake_case and camelCase field names
                        const rentalId = rental.rental_id || rental.rentalId || rental.id;
                        const startDate = rental.start_date || rental.startDate;
                        const endDate = rental.end_date || rental.endDate;
                        const rentAmount = rental.monthly_rent || rental.rentAmount || rental.rent_amount;

                        // Format dates properly with validation
                        let formattedStartDate = 'N/A';
                        let formattedEndDate = 'N/A';

                        if (startDate && !isNaN(new Date(startDate).getTime())) {
                            formattedStartDate = new Date(startDate).toLocaleDateString();
                        }

                        if (endDate && !isNaN(new Date(endDate).getTime())) {
                            formattedEndDate = new Date(endDate).toLocaleDateString();
                        }

                        // Format amount with validation
                        let formattedAmount = 'N/A';
                        if (rentAmount && !isNaN(parseFloat(rentAmount))) {
                            formattedAmount = `$${parseFloat(rentAmount).toFixed(2)}`;
                        }

                        return {
                            ...rental,
                            id: rentalId,
                            propertyName: property,
                            formattedStartDate: formattedStartDate,
                            formattedEndDate: formattedEndDate,
                            formattedAmount: formattedAmount
                        };
                    });

                    setClientRentals(formattedRentals);

                    // Also fetch payment information for these rentals
                    if (formattedRentals.length > 0) {
                        const rentalIds = formattedRentals.map(r => r.id);
                        try {
                            // Fetch all payments for all rentals in one request if possible
                            const paymentsPromises = rentalIds.map(rentalId =>
                                axios.get(`http://localhost:5001/api/rental/payments/${rentalId}`, {
                                    headers: authHeader
                                })
                            );

                            const paymentsResponses = await Promise.all(paymentsPromises);
                            const allPayments = paymentsResponses.flatMap(res => res.data || []);
                            console.log('Fetched payments for rentals:', allPayments);

                            setPaidPayments(allPayments);
                        } catch (paymentError) {
                            console.error('Error fetching rental payments:', paymentError);
                            setPaidPayments([]);
                        }
                    }
                } else {
                    setClientRentals([]);
                }
            } catch (rentalError) {
                console.error('Error fetching rental information:', rentalError);
                setClientRentals([]);
            }

        } catch (error) {
            console.error('Error fetching client details:', error);
            setErrorDetails(error.response?.data?.message || error.message || 'Failed to fetch client details');
            throw error; // Re-throw to be caught by the calling function
        } finally {
            setLoadingDetails(false);
        }
    };


    const handleViewDetails = async (client) => {
        try {
            // Reset any previous errors
            setErrorDetails(null);
            setLoadingDetails(true);

            // Set the selected client and open the modal
            setSelectedClient(client);
            setIsProfileModalOpen(true);

            // Check if we have a valid client ID
            if (!client || !client.id) {
                throw new Error('Invalid client data: Missing client ID');
            }

            console.log('Viewing details for client:', client.name, 'ID:', client.id);

            // Fetch client details with authentication
            await fetchClientDetails(client.id);
        } catch (error) {
            console.error('Error in handleViewDetails:', error);
            setErrorDetails(error.message || 'Failed to load client details');
        } finally {
            setLoadingDetails(false);
        }
    };
    // Helper function to process client data from API response
    const processClientData = (data) => {
        console.log('Processing client data:', data);
        setClients(data.map(client => {
            // Extract client ID from various possible properties
            const clientId = client.client_id || client.id || client.clientId;

            console.log('Extracted client ID:', clientId, 'from client:', client);

            if (!clientId) {
                console.warn('No client ID found for client:', client);
            }

            return {
                id: clientId,
                name: client.name,
                email: client.email,
                phone: client.phone,
                address: client.address || '',
                joinDate: client.createdAt || client.created_at || null
            };
        }));
    };

    const fetchClients = async () => {
        setLoading(true);
        try {
            // Try to get broker ID from context first, then localStorage as fallback
            let brokerId = broker?.brokerId || broker?.id;

            // If not in context, try localStorage
            if (!brokerId) {
                brokerId = localStorage.getItem('brokerId');
            }

            console.log('Using broker ID:', brokerId);

            // Ensure broker ID is available
            if (!brokerId) {
                throw new Error('Broker ID not found. Please log in again.');
            }

            // Get the authentication token
            const token = localStorage.getItem('token');

            // Use the correct GET endpoint with the broker ID and include the token in headers
            const response = await axios.get(`http://localhost:5001/api/clients/broker/${brokerId}`, {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });

            console.log('Received client data for broker ID', brokerId, ':', response.data);
            processClientData(response.data);

        } catch (error) {
            console.error("Error fetching clients:", error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setCurrentClient({ ...currentClient, [name]: value });
    };

    const addClient = async () => {
        if (!currentClient.name || !currentClient.email || !currentClient.phone) {
            setError('Please fill all required fields');
            return;
        }

        try {
            // Try to get broker ID from context first, then localStorage as fallback
            let brokerId = broker?.brokerId || broker?.id;

            // If not in context, try localStorage
            if (!brokerId) {
                brokerId = localStorage.getItem('brokerId');
            }

            console.log('Using broker ID for client creation:', brokerId);

            // Ensure broker ID is available
            if (!brokerId) {
                throw new Error('Broker ID not found. Please log in again.');
            }

            // Get the authentication token
            const token = localStorage.getItem('token');

            // Use the correct endpoint and data structure
            const response = await axios.post('http://localhost:5001/api/clients', {
                name: currentClient.name,
                email: currentClient.email,
                phone: currentClient.phone,
                address: currentClient.address,
                broker: {
                    brokerId: parseInt(brokerId)
                }
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });

            console.log('Client created successfully:', response.data);
            await fetchClients();
            resetForm();
            setIsAddingClient(false);
            setError(null);
        } catch (error) {
            console.error('Error adding client:', error);
            // Improved error handling
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                setError(error.response.data?.message || `Error: ${error.response.status}`);
            } else if (error.request) {
                // The request was made but no response was received
                setError('No response from server. Please try again.');
            } else {
                // Something happened in setting up the request that triggered an Error
                setError(error.message || 'Error adding client');
            }
        }
    };

    const updateClient = async () => {
        if (!currentClient.name || !currentClient.email || !currentClient.phone) {
            setError('Please fill all required fields');
            return;
        }

        try {
            // Validate client ID
            if (!currentClient.id) {
                throw new Error('Client ID is missing. Cannot update client.');
            }

            console.log('Updating client with ID:', currentClient.id);

            // Try to get broker ID from context first, then localStorage as fallback
            let brokerId = broker?.brokerId || broker?.id;

            // If not in context, try localStorage
            if (!brokerId) {
                brokerId = localStorage.getItem('brokerId');
            }

            console.log('Using broker ID for client update:', brokerId);

            // Ensure broker ID is available
            if (!brokerId) {
                throw new Error('Broker ID not found. Please log in again.');
            }

            // Get the authentication token
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Authentication token not found. Please log in again.');
            }

            // Use the correct endpoint and data structure
            const response = await axios.put(`http://localhost:5001/api/clients/${currentClient.id}`, {
                name: currentClient.name,
                email: currentClient.email,
                phone: currentClient.phone,
                address: currentClient.address,
                broker: {
                    brokerId: parseInt(brokerId)
                }
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log('Client updated successfully:', response.data);
            await fetchClients();
            resetForm();
            setIsEditingClient(false);
            setError(null);
        } catch (error) {
            console.error('Error updating client:', error);
            // Improved error handling
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                setError(error.response.data?.message || `Error: ${error.response.status}`);
            } else if (error.request) {
                // The request was made but no response was received
                setError('No response from server. Please try again.');
            } else {
                // Something happened in setting up the request that triggered an Error
                setError(error.message || 'Error updating client');
            }
        }
    };

    const deleteClient = async (id) => {
        if (window.confirm('Are you sure you want to delete this client?')) {
            try {
                // Get the authentication token
                const token = localStorage.getItem('token');

                // Use the correct API endpoint that matches the backend controller
                const response = await axios.delete(`http://localhost:5001/api/clients/${id}`, {
                    headers: {
                        'Authorization': token ? `Bearer ${token}` : ''
                    }
                });

                console.log('Client deleted successfully:', response.data);
                await fetchClients();
            } catch (error) {
                console.error('Error deleting client:', error);
                // Improved error handling
                if (error.response) {
                    setError(error.response.data?.message || `Error: ${error.response.status}`);
                } else if (error.request) {
                    setError('No response from server. Please try again.');
                } else {
                    setError(error.message || 'Error deleting client');
                }
            }
        }
    };

    const editClient = (client) => {
        setCurrentClient({ ...client });
        setIsEditingClient(true);
    };

    const resetForm = () => {
        setCurrentClient({
            id: null,
            name: '',
            email: '',
            phone: '',
            address: ''
        });
    };

    const cancelForm = () => {
        resetForm();
        setIsAddingClient(false);
        setIsEditingClient(false);
    };

    const filteredClients = (clients || []).filter(client => {
        return client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.phone.includes(searchTerm);
    });

    return (
        <div className="client-container">
            <div className="client-controls">
                <div className="client-search">
                    <input
                        type="text"
                        placeholder="Search clients..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>
                <button
                    onClick={() => setIsAddingClient(true)}
                    className="add-client-btn"
                >
                    Add New Client
                </button>
                <button
                    onClick={() => {
                        // Get broker ID from localStorage or context
                        const brokerId = broker?.brokerId || broker?.id || localStorage.getItem('brokerId');
                        if (!brokerId) {
                            setExportStatus({
                                success: false,
                                message: 'Broker ID not found. Please log in again.',
                                count: 0
                            });
                            return;
                        }

                        // Reset previous export status and start new export
                        setExportStatus({ success: false, message: 'Exporting clients...', count: 0 });
                        setIsExporting(true);
                    }}
                    className={`export-btn ${isExporting ? 'exporting' : ''}`}
                    disabled={isExporting}
                    aria-label="Export Clients"
                >
                    {isExporting ? (
                        <>
                            <span className="export-spinner"></span> Exporting...
                        </>
                    ) : (
                        <>
                            <FaFileExport /> Export
                        </>
                    )}
                </button>

                {/* Export status message */}
                {exportStatus.message && (
                    <div className={`export-status ${exportStatus.success ? 'success' : 'error'}`}>
                        {exportStatus.message}
                        {exportStatus.success && exportStatus.count > 0 && (
                            <span className="export-count">({exportStatus.count} clients exported)</span>
                        )}
                    </div>
                )}

                {/* Export component - only rendered when exporting is active */}
                {isExporting && (
                    <ExportClients 
                        brokerId={broker?.brokerId || broker?.id || localStorage.getItem('brokerId')} 
                        onExportComplete={(count) => {
                            setExportStatus({
                                success: true,
                                message: 'Export completed successfully!',
                                count: count
                            });
                            setIsExporting(false);
                            // Clear success message after 5 seconds
                            setTimeout(() => {
                                setExportStatus(prev => prev.success ? { success: false, message: '', count: 0 } : prev);
                            }, 5000);
                        }}
                        onExportError={(errorMessage) => {
                            setExportStatus({
                                success: false,
                                message: `Export failed: ${errorMessage}`,
                                count: 0
                            });
                            setIsExporting(false);
                            // Clear error message after 5 seconds
                            setTimeout(() => {
                                setExportStatus(prev => !prev.success ? { success: false, message: '', count: 0 } : prev);
                            }, 5000);
                        }}
                    />
                )}
            </div>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            <div className="clients-list">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Address</th>
                            <th>Joined</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredClients.map(client => (
                            <tr key={client.id}>
                                <td data-label="Name">{client.name}</td>
                                <td data-label="Email">{client.email}</td>
                                <td data-label="Phone">{client.phone}</td>
                                <td data-label="Address">{client.address}</td>
                                <td data-label="Joined">{client.joinDate ? new Date(client.joinDate).toLocaleDateString() : 'N/A'}</td>
                                <td data-label="Actions">
                                    <button
                                        onClick={() => editClient(client)}
                                        className="edit-btn"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => deleteClient(client.id)}
                                        className="delete-btn"
                                    >
                                        Delete
                                    </button>
                                    <button
                                        onClick={() => handleViewDetails(client)}
                                        className="view-btn"
                                    >
                                        View Details
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {/* Client Add/Edit Modal */}
            {(isAddingClient || isEditingClient) && (
                <div className="client-modal-overlay">
                    <div className="client-modal">
                        <button
                            className="modal-close-btn"
                            onClick={cancelForm}
                        >
                            &times;
                        </button>
                        <h2 className="modal-title">{isAddingClient ? 'Add New Client' : 'Edit Client'}</h2>
                        <form>
                            <div className="form-group">
                                <label>Name:</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={currentClient.name}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Email:</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={currentClient.email}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Phone:</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={currentClient.phone}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Address:</label>
                                <input
                                    type="text"
                                    name="address"
                                    value={currentClient.address}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className="form-buttons">
                                <button
                                    type="button"
                                    onClick={isAddingClient ? addClient : updateClient}
                                    className="submit-btn"
                                >
                                    {isAddingClient ? 'Add Client' : 'Update Client'}
                                </button>
                                <button
                                    type="button"
                                    onClick={cancelForm}
                                    className="cancel-btn"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Client Profile Modal */}
            {isProfileModalOpen && selectedClient && (
                <div className="client-profile-modal-overlay">
                    <div className="client-profile-modal">
                        <button
                            className="modal-close-btn"
                            onClick={() => setIsProfileModalOpen(false)}
                        >
                            &times;
                        </button>

                        <h2 className="modal-title">{selectedClient.name}'s Profile</h2>

                        {loadingDetails ? (
                            <div className="loading-indicator">Loading details...</div>
                        ) : errorDetails ? (
                            <div className="error-message">{errorDetails}</div>
                        ) : (
                            <>
                                <div className="client-info-section">
                                    <div className="info-item">
                                        <label>Email:</label>
                                        <p>{selectedClient.email}</p>
                                    </div>
                                    <div className="info-item">
                                        <label>Phone:</label>
                                        <p>{selectedClient.phone}</p>
                                    </div>
                                    <div className="info-item">
                                        <label>Address:</label>
                                        <p>{selectedClient.address || 'Not available'}</p>
                                    </div>
                                </div>
                                <div className="schedules-section">
                                    <h3>Scheduled Visits</h3>
                                    {clientSchedules.length > 0 ? (
                                        <div className="schedule-table">
                                            <div className="schedule-header" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', fontWeight: 'bold' }}>
                                                <span>Property</span>
                                                <span>Location</span>
                                                <span>Date</span>
                                                <span>Time</span>
                                                <span>Status</span>
                                            </div>
                                            {clientSchedules.map(schedule => (
                                                <div key={schedule.schedule_id} className="schedule-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', alignItems: 'center' }}>
                                                    <span>{schedule.property?.name || 'Property Name Unavailable'}</span>
                                                    <span>{schedule.property?.location || 'Location Unavailable'}</span>
                                                    <span>{new Date(schedule.date).toLocaleDateString()}</span>
                                                    <span>{schedule.time}</span>
                                                    <span className={`status-${schedule.status.toLowerCase()}`}>
                                                        {schedule.status}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="no-data">No scheduled visits found</p>
                                    )}
                                </div>

                                <div className="rentals-section">
                                    <h3>Rental Properties</h3>
                                    {clientRentals.length > 0 ? (
                                        <div className="rental-table">
                                            <div className="rental-header" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', fontWeight: 'bold' }}>
                                                <span>Property</span>
                                                <span>Start Date</span>
                                                <span>End Date</span>
                                                <span>Monthly Rent</span>
                                                <span>Actions</span>
                                            </div>
                                            {clientRentals.map(rental => {
                                                console.log('Rendering rental in client details:', rental);
                                                return (
                                                    <div key={rental.id} className="rental-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', alignItems: 'center' }}>
                                                        <span>{rental.propertyName || 'Unknown Property'}</span>
                                                        <span>{rental.formattedStartDate || 'N/A'}</span>
                                                        <span>{rental.formattedEndDate || 'N/A'}</span>
                                                        <span>{rental.formattedAmount || 'N/A'}</span>
                                                        <button
                                                            className="view-details-btn"
                                                            onClick={() => {
                                                                setSelectedRental(rental);
                                                                setIsRentalDetailsModalOpen(true);
                                                            }}
                                                        >
                                                            Show Details
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="no-data">No rental properties found</p>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Rental Details Modal */}
            {isRentalDetailsModalOpen && selectedRental && (
                <div className="rental-details-modal-overlay">
                    <div className="rental-details-modal">
                        <button
                            className="modal-close-btn"
                            onClick={() => setIsRentalDetailsModalOpen(false)}
                        >
                            &times;
                        </button>

                        <h2 className="modal-title">Rental Details: {selectedRental.propertyName}</h2>

                        <div className="rental-info-section">
                            <div className="detail-columns">
                                <div className="detail-column">
                                    <div className="info-item">
                                        <label>Property:</label>
                                        <p>{selectedRental.propertyName}</p>
                                    </div>
                                    <div className="info-item">
                                        <label>Start Date:</label>
                                        <p>{selectedRental.formattedStartDate}</p>
                                    </div>
                                    <div className="info-item">
                                        <label>End Date:</label>
                                        <p>{selectedRental.formattedEndDate}</p>
                                    </div>
                                </div>
                                <div className="detail-column">
                                    <div className="info-item">
                                        <label>Monthly Rent:</label>
                                        <p>{selectedRental.formattedAmount}</p>
                                    </div>
                                    <div className="info-item">
                                        <label>Status:</label>
                                        <p>{selectedRental.status}</p>
                                    </div>
                                    <div className="info-item">
                                        <label>Notes:</label>
                                        <p>{selectedRental.notes || 'No notes available'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="payment-history-section">
                            <h3>Payment History</h3>
                            <div className="payment-months">
                                {generatePaymentMonths(selectedRental)}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    // Function to generate payment months display - identical to Rental.jsx logic
    function generatePaymentMonths(rental) {
        if (!rental || !rental.start_date || !rental.end_date) return [];

        const startDate = new Date(rental.start_date);
        const endDate = new Date(rental.end_date);

        // Calculate total months between start and end dates - same as in Rental.jsx
        const totalMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
            (endDate.getMonth() - startDate.getMonth()) + 1;

        const months = [];

        for (let i = 0; i < totalMonths; i++) {
            // Create payment date for this month - exact same logic as Rental.jsx
            const paymentDate = new Date(startDate);
            paymentDate.setMonth(startDate.getMonth() + i);

            // Create payment end date (last day of month) - exact same logic as Rental.jsx
            const paymentEndDate = new Date(paymentDate);
            paymentEndDate.setMonth(paymentDate.getMonth() + 1);
            paymentEndDate.setDate(paymentEndDate.getDate() - 1);

            // Determine payment status based on current date - exact same logic as Rental.jsx
            const currentDate = new Date();
            let status = 'pending';

            if (paymentEndDate < currentDate) {
                status = 'overdue';
            } else if (paymentDate <= currentDate && paymentEndDate >= currentDate) {
                status = 'due';
            } else {
                status = 'upcoming';
            }

            // Check if this month has a paid payment by carefully checking the rent_payments table
            const isPaid = paidPayments.some(payment => {
                if (!payment) return false;

                // IMPORTANT: Check the due_date which represents which month's payment was for
                if (payment.due_date) {
                    // The due_date in rent_payments table shows which month the payment was for
                    const dueDate = new Date(payment.due_date);
                    return payment.rental_id === rental.id &&
                        dueDate.getMonth() === paymentDate.getMonth() &&
                        dueDate.getFullYear() === paymentDate.getFullYear();
                }

                // Check payment_for_month field if available (from our latest update)
                if (payment.payment_for_month) {
                    const paymentForDate = new Date(payment.payment_for_month);
                    return payment.rental_id === rental.id &&
                        paymentForDate.getMonth() === paymentDate.getMonth() &&
                        paymentForDate.getFullYear() === paymentDate.getFullYear();
                }

                // Last fallback: check if the month string matches
                if (payment.month && typeof payment.month === 'string') {
                    // Try to extract month and year from payment.month (e.g., "May 2025")
                    const parts = payment.month.split(' ');
                    if (parts.length === 2) {
                        const [monthName, yearStr] = parts;
                        const paymentYear = parseInt(yearStr);
                        const currentMonthName = paymentDate.toLocaleString('default', { month: 'long' });
                        return payment.rental_id === rental.id &&
                            monthName === currentMonthName &&
                            paymentYear === paymentDate.getFullYear();
                    }
                }

                return false;
            });

            // If payment exists in database, override status to 'paid'
            if (isPaid) {
                status = 'paid';
            }

            // Format month name - same as Rental.jsx
            const monthName = paymentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

            months.push({
                month: monthName.split(' ')[0], // Just the month name
                year: paymentDate.getFullYear(),
                status: status
            });
        }

        return (
            <div className="month-grid">
                {months.map((monthData, index) => (
                    <div key={index} className={`month-item month-${monthData.status}`}>
                        <div className="month-name">{monthData.month} {monthData.year}</div>
                        <div className="month-status">
                            {monthData.status === 'paid' && <span className="status-paid">Paid</span>}
                            {monthData.status === 'overdue' && <span className="status-overdue">Overdue</span>}
                            {monthData.status === 'due' && <span className="status-due">Due</span>}
                            {monthData.status === 'upcoming' && <span className="status-upcoming">Upcoming</span>}
                        </div>
                    </div>
                ))}
            </div>
        );
    }
};

export default Client;