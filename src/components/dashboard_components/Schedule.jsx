import React, { useState, useEffect } from 'react';
import { Calendar, CheckSquare, Square, XSquare, Bell, Users, MapPin, Search, Clock, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import "../../style/Schedule.css";

const Schedule = () => {
    // Get auth context for API calls
    const { broker, api } = useAuth();

    const [activeView, setActiveView] = useState('list');
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedVisit, setSelectedVisit] = useState(null);
    const [clientName, setClientName] = useState('');
    const [showNewVisitForm, setShowNewVisitForm] = useState(false);
    const [visits, setVisits] = useState([]);
    const [properties, setProperties] = useState([]);
    const [clients, setClients] = useState([]);
    // Broker selection removed
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dashboardMetrics, setDashboardMetrics] = useState({
        totalScheduled: 0,
        completedThisMonth: 0,
        cancelledThisMonth: 0,
        conversionRate: 0
    });

    const [newVisitData, setNewVisitData] = useState({
        date: '',
        time: '',
        property_id: '',
        client_id: '',
        description: ''
        // broker_id is fixed to 1, so removed from state
    });

    // Check localStorage for property ID on component mount
    useEffect(() => {
        const scheduledPropertyId = localStorage.getItem('schedulePropertyId');
        if (scheduledPropertyId) {
            // Set the property ID in the new visit form data
            setNewVisitData(prev => ({
                ...prev,
                property_id: scheduledPropertyId
            }));

            // Open the new visit modal
            setShowNewVisitForm(true);

            // Clear the property ID from localStorage to prevent it from opening on refresh
            localStorage.removeItem('schedulePropertyId');
        }
    }, []);

    // Fetch schedules, properties, and clients for the current broker
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                // Get broker ID from context or localStorage
                const currentBrokerId = broker?.brokerId || localStorage.getItem('brokerId');
                console.log('Current broker ID:', currentBrokerId);

                if (!currentBrokerId) {
                    throw new Error('Broker ID not found. Please log in again.');
                }

                // Fetch schedules for the current broker using Spring Boot endpoint
                const schedulesResponse = await api.get(`/schedules/broker/${currentBrokerId}`);

                // Fetch properties for current broker using Spring Boot endpoint
                const propertiesResponse = await api.get(`/properties/broker/${currentBrokerId}`);
                console.log('Fetched properties for broker (raw response):', propertiesResponse.data);

                // Log the full structure to debug
                console.log('Properties response structure:', {
                    hasProperties: !!propertiesResponse.data?.properties,
                    isArray: Array.isArray(propertiesResponse.data),
                    isArrayOfProperties: Array.isArray(propertiesResponse.data?.properties),
                    dataKeys: Object.keys(propertiesResponse.data || {})
                });

                // Try to fetch clients using Spring Boot endpoint first
                let clientsResponse;
                try {
                    // Using GET endpoint for RESTful approach
                    clientsResponse = await api.get(`/clients/broker/${currentBrokerId}`);
                    console.log('Fetched clients using Spring Boot endpoint:', clientsResponse.data);
                } catch (error) {
                    console.warn('Error fetching clients with Spring Boot endpoint, trying fallback:', error);
                    // Fallback to original endpoint if Spring Boot endpoint fails
                    clientsResponse = await api.post('/client/getClientsByBroker', {
                        broker_id: currentBrokerId
                    });
                    console.log('Fetched clients using fallback endpoint:', clientsResponse.data);
                }

                // Transform schedule data to match the component's expected format
                const formattedSchedules = schedulesResponse.data.map(schedule => {
                    // Format the time properly from the LocalTime object
                    let formattedTime = 'No time';
                    try {
                        if (schedule.time) {
                            // Handle ISO time format or time string
                            const timeString = typeof schedule.time === 'string' ? schedule.time : schedule.time.toString();
                            // Parse time directly without combining with date
                            const timeParts = timeString.split(':');
                            if (timeParts.length >= 2) {
                                const hours = parseInt(timeParts[0]);
                                const minutes = parseInt(timeParts[1]);
                                const timeObj = new Date();
                                timeObj.setHours(hours, minutes, 0);
                                formattedTime = timeObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            }
                        }
                    } catch (error) {
                        console.error('Error formatting time:', error, schedule.time);
                    }

                    // Format the date properly from LocalDateTime
                    let formattedDate = 'Unknown Date';
                    try {
                        if (schedule.date) {
                            const dateObj = new Date(schedule.date);
                            if (!isNaN(dateObj.getTime())) {
                                formattedDate = dateObj.toISOString().split('T')[0];
                            }
                        }
                    } catch (error) {
                        console.error('Error formatting date:', error, schedule.date);
                    }

                    // Format client name from the Client object
                    // Spring Boot returns full objects with proper casing
                    const clientName = schedule.client
                        ? `${schedule.client.firstName || ''} ${schedule.client.lastName || ''}`.trim()
                        : 'Unknown Client';

                    return {
                        id: schedule.scheduleId, // Using camelCase as per Spring Boot naming
                        property: schedule.property ? schedule.property.name : 'Unknown Property',
                        property_id: schedule.property ? schedule.property.propertyId : null,
                        client: clientName,
                        client_id: schedule.client ? schedule.client.clientId : null,
                        client_name: clientName, // Set client_name directly
                        broker_id: schedule.broker ? schedule.broker.brokerId : null,
                        broker: schedule.broker ? `${schedule.broker.firstName || ''} ${schedule.broker.lastName || ''}`.trim() : 'Unknown Broker',
                        date: formattedDate,
                        time: formattedTime,
                        status: schedule.status ? schedule.status.toLowerCase() : 'pending',
                        contactNumber: schedule.client ? schedule.client.phone : '',
                        email: schedule.client ? schedule.client.email : '',
                        notes: schedule.description || ''
                    };
                });

                // Handle property response from Spring Boot
                // Spring Boot returns a direct array of Property objects
                const rawProperties = Array.isArray(propertiesResponse.data) ? propertiesResponse.data : [];
                console.log('Raw properties array:', rawProperties);

                // Format properties to match the component's expected structure
                const formattedProperties = rawProperties.map(property => ({
                    property_id: property.propertyId, // Using propertyId from Spring Boot
                    name: property.name || 'Unnamed Property'
                }));
                console.log(`Formatted properties for broker_id=${currentBrokerId}:`, formattedProperties);

                // Format clients data from Spring Boot response
                const clients = Array.isArray(clientsResponse.data) ? clientsResponse.data : [];
                console.log('Clients array:', clients);

                // No need to filter by broker_id as the endpoint already does that
                const formattedClients = clients.map(client => {
                    // Handle different possible client data structures
                    // Some APIs might return camelCase (Spring Boot) while others might use snake_case
                    const clientId = client.clientId || client.client_id;
                    const firstName = client.firstName || client.first_name || '';
                    const lastName = client.lastName || client.last_name || '';
                    const fullName = `${firstName} ${lastName}`.trim();

                    // If we don't have a proper name, use any available identifier
                    const displayName = fullName || client.name || client.email || `Client ${clientId}`;

                    return {
                        client_id: clientId,
                        name: displayName,
                        phone: client.phone,
                        email: client.email
                    };
                });

                console.log(`Formatted clients for broker_id=${currentBrokerId}:`, formattedClients);

                // Add debug info if no clients were found
                if (formattedClients.length === 0) {
                    console.warn('No clients were found or formatted. Original data:', clientsResponse.data);
                }

                setVisits(formattedSchedules);
                setProperties(formattedProperties); // Use the filtered properties array for rendering
                setClients(formattedClients); // Use the filtered clients array
                // No longer need to set brokers as we're using a fixed broker_id

                // Calculate dashboard metrics
                const currentDate = new Date();
                const currentMonth = currentDate.getMonth();
                const currentYear = currentDate.getFullYear();

                const scheduledVisits = formattedSchedules.filter(visit => visit.status === 'pending');
                const completedVisitsThisMonth = formattedSchedules.filter(visit => {
                    const visitDate = new Date(visit.date);
                    return visit.status === 'completed' &&
                        visitDate.getMonth() === currentMonth &&
                        visitDate.getFullYear() === currentYear;
                });
                const cancelledVisitsThisMonth = formattedSchedules.filter(visit => {
                    const visitDate = new Date(visit.date);
                    return visit.status === 'cancelled' &&
                        visitDate.getMonth() === currentMonth &&
                        visitDate.getFullYear() === currentYear;
                });

                // Calculate conversion rate (completed / total) * 100
                const totalVisitsThisMonth = completedVisitsThisMonth.length + cancelledVisitsThisMonth.length;
                const conversionRate = totalVisitsThisMonth > 0
                    ? Math.round((completedVisitsThisMonth.length / totalVisitsThisMonth) * 100)
                    : 0;

                setDashboardMetrics({
                    totalScheduled: scheduledVisits.length,
                    completedThisMonth: completedVisitsThisMonth.length,
                    cancelledThisMonth: cancelledVisitsThisMonth.length,
                    conversionRate: conversionRate
                });

                setLoading(false);
            } catch (error) {
                console.error('Error fetching data:', error);
                setError('Failed to load data. Please try again later.');
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Function to fetch client information by ID
    const fetchClientById = async (clientId) => {
        try {
            // Try Spring Boot endpoint first
            try {
                const response = await api.get(`/clients/${clientId}`);
                return response.data; // Return the client object from the response
            } catch (springBootError) {
                console.warn(`Error with Spring Boot endpoint for client ${clientId}, trying fallback:`, springBootError);

                // Fallback to original endpoint
                const fallbackResponse = await api.get(`/client/getOneClient/${clientId}`);

                // Handle different response structures
                return fallbackResponse.data.client || fallbackResponse.data;
            }
        } catch (error) {
            console.error(`Error fetching client with ID ${clientId}:`, error);
            return null;
        }
    };

    // Function to get client name from client ID
    const getClientName = async (clientId) => {
        try {
            const client = await fetchClientById(clientId);
            if (client) {
                // Handle different possible client data structures
                const firstName = client.firstName || client.first_name || '';
                const lastName = client.lastName || client.last_name || '';
                const fullName = `${firstName} ${lastName}`.trim();

                // If we don't have a proper name, use any available identifier
                return fullName || client.name || client.email || `Client ${clientId}` || 'Unknown Client';
            }
            return 'Unknown Client';
        } catch (error) {
            console.error(`Error fetching client name for ID ${clientId}:`, error);
            return 'Unknown Client';
        }
    };

    // Function to update visits with client names
    const updateVisitsWithClientNames = async () => {
        const updatedVisits = [...visits];
        let hasUpdates = false;

        for (let i = 0; i < updatedVisits.length; i++) {
            const visit = updatedVisits[i];

            if (visit.client_id && !visit.client_name) {
                try {
                    console.log(`Fetching client name for visit ${visit.id} with client_id ${visit.client_id}`);
                    const clientName = await getClientName(visit.client_id);

                    if (clientName && clientName !== 'Unknown Client') {
                        updatedVisits[i] = {
                            ...visit,
                            client_name: clientName
                        };
                        hasUpdates = true;
                    }
                } catch (error) {
                    console.error(`Error updating client name for visit ${visit.id}:`, error);
                }
            }
        }

        if (hasUpdates) {
            setVisits(updatedVisits);
        }
    };

    // Function to update visits with missing client information
    const updateVisitsWithClientInfo = async () => {
        const updatedVisits = [...visits];
        let hasUpdates = false;

        for (let i = 0; i < updatedVisits.length; i++) {
            const visit = updatedVisits[i];

            // Check if client information is missing or incomplete
            if (visit.client_id && (visit.client === 'undefined undefined' || visit.client === 'Unknown Client')) {
                try {
                    console.log(`Fetching client info for visit ${visit.id} with client_id ${visit.client_id}`);
                    const clientName = await getClientName(visit.client_id);

                    if (clientName && clientName !== 'Unknown Client') {
                        updatedVisits[i] = {
                            ...visit,
                            client: clientName
                        };
                        hasUpdates = true;
                    }
                } catch (error) {
                    console.error(`Error updating client info for visit ${visit.id}:`, error);
                }
            }

            // Check if time is invalid
            if (visit.time === 'Invalid Date') {
                try {
                    // Fetch the schedule directly to get the correct time
                    const response = await axios.get(`http://localhost:5001/api/schedule/${visit.id}`);
                    const schedule = response.data;

                    if (schedule && schedule.time) {
                        // Parse time directly
                        const timeParts = schedule.time.split(':');
                        if (timeParts.length >= 2) {
                            const hours = parseInt(timeParts[0]);
                            const minutes = parseInt(timeParts[1]);
                            const timeObj = new Date();
                            timeObj.setHours(hours, minutes, 0);
                            const formattedTime = timeObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                            updatedVisits[i] = {
                                ...visit,
                                time: formattedTime
                            };
                            hasUpdates = true;
                        }
                    }
                } catch (error) {
                    console.error(`Error updating time for visit ${visit.id}:`, error);
                }
            }
        }

        if (hasUpdates) {
            console.log('Updated visits with client and time information:', updatedVisits);
            setVisits(updatedVisits);
        }
    };

    // Call the update function after initial data fetch
    useEffect(() => {
        if (visits.length > 0 && !loading) {
            updateVisitsWithClientInfo();
        }
    }, [visits, loading]);

    // Update client names after visits are loaded
    useEffect(() => {
        if (visits.length > 0) {
            updateVisitsWithClientNames();
        }
    }, [visits]);

    // Filter visits based on status and search query
    const filteredVisits = visits.filter(visit => {
        const matchesStatus = filterStatus === 'all' || visit.status === filterStatus;
        const matchesSearch =
            (visit.property && visit.property.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (visit.client_name && visit.client_name.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesStatus && matchesSearch;
    });
    console.log('Filtered visits:', filteredVisits);

    // Function to get status class for styling
    const getStatusClass = (status) => {
        switch (status) {
            case 'scheduled': return 'status-scheduled';
            case 'completed': return 'status-completed';
            case 'cancelled': return 'status-cancelled';
            default: return '';
        }
    };

    // Function to format date
    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    // Handle status change
    const handleStatusChange = async (id, newStatus) => {
        try {
            console.log(`Changing visit ${id} status to ${newStatus}`);

            // Map frontend status to backend status format
            const statusMap = {
                'scheduled': 'Pending',
                'completed': 'Completed',
                'cancelled': 'Cancelled',
                'pending': 'Pending'
            };

            const backendStatus = statusMap[newStatus];
            console.log('Backend status:', backendStatus);

            if (!backendStatus) {
                throw new Error(`Invalid status: ${newStatus}`);
            }

            // Update status in the backend using Spring Boot endpoint
            // Using PUT for the entire resource update as per REST standards
            const response = await api.put(`/schedules/${id}`, {
                status: backendStatus
            });

            console.log('Status update response:', response.data);

            // Show success message
            alert(`Schedule status updated to ${newStatus}`);

            // Update local state
            setVisits(prevVisits =>
                prevVisits.map(visit =>
                    visit.id === id ? { ...visit, status: newStatus } : visit
                )
            );

            // If the selected visit is the one being updated, update it too
            if (selectedVisit && selectedVisit.id === id) {
                setSelectedVisit({ ...selectedVisit, status: newStatus });
            }

            // Recalculate dashboard metrics
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth();
            const currentYear = currentDate.getFullYear();

            const updatedVisits = visits.map(visit =>
                visit.id === id ? { ...visit, status: newStatus } : visit
            );

            const scheduledVisits = updatedVisits.filter(visit => visit.status === 'pending' || visit.status === 'scheduled');
            const completedVisitsThisMonth = updatedVisits.filter(visit => {
                const visitDate = new Date(visit.date);
                return visit.status === 'completed' &&
                    visitDate.getMonth() === currentMonth &&
                    visitDate.getFullYear() === currentYear;
            });
            const cancelledVisitsThisMonth = updatedVisits.filter(visit => {
                const visitDate = new Date(visit.date);
                return visit.status === 'cancelled' &&
                    visitDate.getMonth() === currentMonth &&
                    visitDate.getFullYear() === currentYear;
            });

            // Calculate conversion rate
            const totalVisitsThisMonth = completedVisitsThisMonth.length + cancelledVisitsThisMonth.length;
            const conversionRate = totalVisitsThisMonth > 0
                ? Math.round((completedVisitsThisMonth.length / totalVisitsThisMonth) * 100)
                : 0;

            setDashboardMetrics({
                totalScheduled: scheduledVisits.length,
                completedThisMonth: completedVisitsThisMonth.length,
                cancelledThisMonth: cancelledVisitsThisMonth.length,
                conversionRate: conversionRate
            });

        } catch (error) {
            console.error('Error updating visit status:', error);
            alert(`Failed to update visit status: ${error.message}`);
        }
    };

    // Handle visit selection
    const handleVisitSelect = async (visit) => {
        console.log('Selected visit:', visit);
        setSelectedVisit(visit);
        if (visit && visit.client_id) {
            const name = await getClientName(visit.client_id);
            setClientName(name);
        } else {
            setClientName('Unknown Client');
        }
    };

    // Handle new visit form input change
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewVisitData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle form submission
    const handleSubmitVisit = async (e) => {
        e.preventDefault();

        try {
            // Get broker ID from context or localStorage
            const currentBrokerId = broker?.brokerId || localStorage.getItem('brokerId');
            console.log('Using broker ID:', currentBrokerId);

            // Validate form data
            if (!newVisitData.date || !newVisitData.time || !newVisitData.property_id || !newVisitData.client_id) {
                alert('Please fill in all required fields');
                return;
            }

            // Log the data we're about to send for debugging
            console.log('Form data to be submitted:', newVisitData);

            // Get token for direct authentication
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Authentication token not found. Please log in again.');
                return;
            }

            // Format date and time for backend
            // The backend Schedule entity has date as LocalDateTime and time as LocalTime
            // Make sure date is in ISO-8601 format (YYYY-MM-DDThh:mm:ss)
            const dateStr = new Date(`${newVisitData.date}T${newVisitData.time}:00`).toISOString();
            // Time should be in hh:mm:ss format
            const timeStr = `${newVisitData.time}:00`;

            // Try the Spring Boot endpoint first
            try {
                // Format the data for the Spring Boot backend according to Schedule.java entity
                const scheduleData = {
                    // Create nested objects for relationships
                    property: {
                        propertyId: parseInt(newVisitData.property_id)
                    },
                    client: {
                        clientId: parseInt(newVisitData.client_id)
                    },
                    broker: {
                        brokerId: parseInt(currentBrokerId)
                    },
                    description: newVisitData.description || '',
                    date: dateStr,
                    time: timeStr,
                    status: 'Pending'
                };

                console.log('Sending data to Spring Boot endpoint:', scheduleData);

                // Make the request without authentication (since endpoint is now public)
                const response = await axios({
                    method: 'post',
                    url: 'http://localhost:5001/api/schedules',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data: scheduleData
                });

                console.log('Spring Boot endpoint response:', response.data);
                return handleSuccessfulSubmission(response);
            } catch (springBootError) {
                console.warn('Error with Spring Boot endpoint, trying fallback:', springBootError);

                // Fallback to original endpoint
                const fallbackData = {
                    property_id: parseInt(newVisitData.property_id),
                    client_id: parseInt(newVisitData.client_id),
                    broker_id: parseInt(currentBrokerId),
                    description: newVisitData.description || '',
                    date: dateStr,
                    time: timeStr,
                    status: 'Pending'
                };

                console.log('Sending data to fallback endpoint:', fallbackData);

                // Make the fallback request without authentication - use the correct endpoint URL
                const fallbackResponse = await axios({
                    method: 'post',
                    url: 'http://localhost:5001/api/schedules',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data: fallbackData
                });

                console.log('Fallback endpoint response:', fallbackResponse.data);
                return handleSuccessfulSubmission(fallbackResponse);
            }
        } catch (error) {
            // Handle API errors with appropriate messages
            if (error.response) {
                console.error('API error:', error.response.data);
                alert('Error creating schedule: ' + (error.response.data.message || 'Please check your input data and try again.'));
                // Optionally redirect to login page
                // window.location.href = '/login';
            } else {
                console.error('Error creating visit:', error);
                console.error('Error response data:', error.response?.data);
                let errorMessage = 'Failed to create visit. Please try again.';

                // Extract more detailed error message if available
                if (error.response && error.response.data && error.response.data.message) {
                    errorMessage = error.response.data.message;
                }

                alert(errorMessage);
            }
        }
    };

    // Helper function to handle successful submission response
    const handleSuccessfulSubmission = (response) => {
        // Extract the response data
        const responseData = response.data;

        // Determine field names based on response structure
        const scheduleId = responseData.scheduleId || responseData.schedule_id;
        const property = responseData.property || {};
        const client = responseData.client || {};
        const broker = responseData.broker || {};

        // Format the new visit to match the component's expected format
        const newVisit = {
            id: scheduleId,
            property: property.name || 'Unknown Property',
            property_id: property.propertyId || property.property_id || null,
            client: client.firstName && client.lastName ?
                `${client.firstName} ${client.lastName}` :
                (client.first_name && client.last_name ?
                    `${client.first_name} ${client.last_name}` : 'Unknown Client'),
            client_id: client.clientId || client.client_id || null,
            client_name: client.name || (client.firstName && client.lastName ?
                `${client.firstName} ${client.lastName}` :
                (client.first_name && client.last_name ?
                    `${client.first_name} ${client.last_name}` : '')),
            broker_id: broker.brokerId || broker.broker_id || null,
            broker: broker.firstName && broker.lastName ?
                `${broker.firstName} ${broker.lastName}` :
                (broker.first_name && broker.last_name ?
                    `${broker.first_name} ${broker.last_name}` : 'Unknown Broker'),
            date: responseData.date ? new Date(responseData.date).toISOString().split('T')[0] : newVisitData.date,
            time: responseData.time || newVisitData.time || 'No time',
            status: 'pending',
            contactNumber: client.phone || '',
            email: client.email || '',
            notes: responseData.description || ''
        };

        // Update visits state with the new visit
        setVisits(prevVisits => [...prevVisits, newVisit]);

        // Update dashboard metrics
        setDashboardMetrics(prev => ({
            ...prev,
            totalScheduled: prev.totalScheduled + 1
        }));

        // Show success message
        alert('Visit scheduled successfully!');

        // Close the form and reset the form data
        setShowNewVisitForm(false);
        setNewVisitData({
            date: '',
            time: '',
            property_id: '',
            client_id: '',
            description: ''
        });
    };

    // Dashboard metrics are now managed in state and calculated in the useEffect

    // Generate days for the calendar view
    const generateCalendarDays = () => {
        const days = [];
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
        }

        // Add cells for each day in the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentYear, currentMonth, day);
            const dateString = date.toISOString().split('T')[0];

            // Find visits on this day from filteredVisits instead of all visits
            const dayVisits = filteredVisits.filter(visit => {
                // Make sure we're comparing the date part only
                const visitDate = visit.date ? visit.date.split('T')[0] : null;
                return visitDate === dateString;
            });

            console.log(`Day ${day} visits:`, dayVisits); // Log day visits for debugging

            days.push(
                <div key={`day-${day}`} className={`calendar-day ${day === today.getDate() ? 'today' : ''}`}>
                    <div className="day-number">{day}</div>
                    {dayVisits.length > 0 && (
                        <div className="day-visits">
                            {dayVisits.map(visit => {
                                // Make sure we have valid data
                                const clientName = visit.client_name || 'Unknown Client';
                                const propertyName = visit.property || 'Unknown Property';
                                const visitTime = visit.time || 'No time';
                                const visitStatus = visit.status || 'unknown';

                                return (
                                    <div
                                        key={visit.id}
                                        className={`visit-pill ${getStatusClass(visitStatus)}`}
                                        onClick={() => handleVisitSelect(visit)}
                                    >
                                        {visitTime} - {clientName}
                                        <br />
                                        <br />
                                        {propertyName}
                                        <br />
                                        <br />
                                        {visitStatus}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            );
        }

        return days;
    };

    useEffect(() => {
        // Animation for dashboard numbers
        const counters = document.querySelectorAll('.metric-value');
        counters.forEach(counter => {
            const target = +counter.getAttribute('data-target');
            const count = +counter.innerText;
            const increment = target / 20;

            if (count < target) {
                counter.innerText = Math.ceil(count + increment);
                setTimeout(() => { }, 50);
            } else {
                counter.innerText = target;
            }
        });
    }, []);

    return (
        <div className="visit-scheduling">
            <div className="page-header">
                <div className="title-area">
                    <h1>Visit Scheduling</h1>
                </div>
                <div className="action-buttons">
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowNewVisitForm(true)}
                    >
                        <Calendar size={16} />
                        <span>Schedule New Visit</span>
                    </button>
                </div>
            </div>

            <div className="dashboard-overview">
                <div className="metric-card">
                    <div className="metric-icon scheduled-icon">
                        <Calendar size={24} />
                    </div>
                    <div className="metric-content">
                        <h3>Scheduled Visits</h3>
                        <p className="metric-value" data-target={dashboardMetrics.totalScheduled}>
                            {dashboardMetrics.totalScheduled}
                        </p>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-icon completed-icon">
                        <CheckCircle size={24} />
                    </div>
                    <div className="metric-content">
                        <h3>Completed This Month</h3>
                        <p className="metric-value" data-target={dashboardMetrics.completedThisMonth}>
                            {dashboardMetrics.completedThisMonth}
                        </p>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-icon cancelled-icon">
                        <XCircle size={24} />
                    </div>
                    <div className="metric-content">
                        <h3>Cancelled This Month</h3>
                        <p className="metric-value" data-target={dashboardMetrics.cancelledThisMonth}>
                            {dashboardMetrics.cancelledThisMonth}
                        </p>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-icon conversion-icon">
                        <Users size={24} />
                    </div>
                    <div className="metric-content">
                        <h3>Conversion Rate</h3>
                        <p className="metric-value" data-target={dashboardMetrics.conversionRate}>
                            {dashboardMetrics.conversionRate}%
                        </p>
                    </div>
                </div>
            </div>

            <div className="view-toggle">
                <button
                    className={`toggle-btn ${activeView === 'list' ? 'active' : ''}`}
                    onClick={() => setActiveView('list')}
                >
                    <Square size={16} />
                    <span>List View</span>
                </button>
                <button
                    className={`toggle-btn ${activeView === 'calendar' ? 'active' : ''}`}
                    onClick={() => setActiveView('calendar')}
                >
                    <Calendar size={16} />
                    <span>Calendar View</span>
                </button>
            </div>

            <div className="content-area">
                {activeView === 'list' && (
                    <div className="list-view">
                        <div className="filter-controls">
                            <div className="search-box">
                                <Search size={18} />
                                <input
                                    type="text"
                                    placeholder="Search by property or client"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="status-filters">
                                <button
                                    className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
                                    onClick={() => setFilterStatus('all')}
                                >
                                    All
                                </button>
                                <button
                                    className={`filter-btn ${filterStatus === 'scheduled' ? 'active' : ''}`}
                                    onClick={() => setFilterStatus('scheduled')}
                                >
                                    Scheduled
                                </button>
                                <button
                                    className={`filter-btn ${filterStatus === 'completed' ? 'active' : ''}`}
                                    onClick={() => setFilterStatus('completed')}
                                >
                                    Completed
                                </button>
                                <button
                                    className={`filter-btn ${filterStatus === 'cancelled' ? 'active' : ''}`}
                                    onClick={() => setFilterStatus('cancelled')}
                                >
                                    Cancelled
                                </button>
                            </div>
                        </div>

                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Property</th>
                                        <th>Client</th>
                                        <th>Date</th>
                                        <th>Time</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredVisits.map(visit => (
                                        <tr key={visit.id} onClick={() => handleVisitSelect(visit)}>
                                            <td data-label="Property">{visit.property}</td>
                                            <td data-label="Client">{visit.client_name}</td>
                                            <td data-label="Date">{formatDate(visit.date)}</td>
                                            <td data-label="Time">{visit.time}</td>
                                            <td data-label="Status">
                                                <span className={`status-badge ${getStatusClass(visit.status)}`}>
                                                    {visit.status === 'scheduled' && <CheckSquare size={14} />}
                                                    {visit.status === 'completed' && <CheckCircle size={14} />}
                                                    {visit.status === 'cancelled' && <XSquare size={14} />}
                                                    {visit.status.charAt(0).toUpperCase() + visit.status.slice(1)}
                                                </span>
                                            </td>
                                            <td data-label="Actions">
                                                <div className="action-buttons-container">
                                                    {(visit.status === 'scheduled' || visit.status === 'pending') && (
                                                        <>
                                                            <button
                                                                className="action-btn complete-btn"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleStatusChange(visit.id, 'completed');
                                                                }}
                                                            >
                                                                Complete
                                                            </button>
                                                            <button
                                                                className="action-btn cancel-btn"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleStatusChange(visit.id, 'cancelled');
                                                                }}
                                                            >
                                                                Cancel
                                                            </button>
                                                        </>
                                                    )}
                                                    {(visit.status === 'completed' || visit.status === 'cancelled') && (
                                                        <button
                                                            className="action-btn reschedule-btn"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setNewVisitData({
                                                                    ...newVisitData,
                                                                    property: visit.property,
                                                                    client: visit.client,
                                                                    contactNumber: visit.contactNumber,
                                                                    email: visit.email,
                                                                    notes: visit.notes
                                                                });
                                                                setShowNewVisitForm(true);
                                                            }}
                                                        >
                                                            Reschedule
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {selectedVisit && (
                            <div className="detail-panel">
                                <div className="detail-header">
                                    <h3>Visit Details</h3>
                                    <button className="close-btn" onClick={() => setSelectedVisit(null)}>×</button>
                                </div>
                                <div className="detail-content">
                                    <div className="detail-columns">
                                        <div className="detail-column">
                                            <div className="detail-section">
                                                <h4>Property Information</h4>
                                                <p><strong>Property:</strong> {selectedVisit.property}</p>
                                                <p><strong>Address:</strong> 123 Example Street, Cityville</p>
                                                <p><strong>Type:</strong> Residential</p>
                                                <p><strong>Price:</strong> $450,000</p>
                                            </div>

                                            <div className="detail-section">
                                                <h4>Client Information</h4>
                                                <p><strong>Name:</strong> {clientName}</p>
                                                <p><strong>Phone:</strong> {selectedVisit.contactNumber}</p>
                                                <p><strong>Email:</strong> {selectedVisit.email}</p>
                                            </div>
                                        </div>

                                        <div className="detail-column">
                                            <div className="detail-section">
                                                <h4>Visit Details</h4>
                                                <p><strong>Date:</strong> {formatDate(selectedVisit.date)}</p>
                                                <p><strong>Time:</strong> {selectedVisit.time}</p>
                                                <p><strong>Status:</strong>
                                                    <span className={`status-text ${getStatusClass(selectedVisit.status)}`}>
                                                        {selectedVisit.status.charAt(0).toUpperCase() + selectedVisit.status.slice(1)}
                                                    </span>
                                                </p>
                                            </div>

                                            <div className="detail-section">
                                                <h4>Notes</h4>
                                                <div className="notes-area">
                                                    <p>{selectedVisit.notes}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="detail-actions">
                                        <button className="btn btn-outline">
                                            <Bell size={14} />
                                            <span>Send Reminder</span>
                                        </button>
                                        <button className="btn btn-outline">
                                            <Calendar size={14} />
                                            <span>Add to Calendar</span>
                                        </button>
                                        <button className="btn btn-primary">
                                            <span>Edit Visit</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeView === 'calendar' && (
                    <div className="calendar-view">
                        <div className="calendar-header">
                            <h3>November 2023</h3>
                            <div className="calendar-nav">
                                <button className="btn btn-outline">
                                    <span>Previous</span>
                                </button>
                                <button className="btn btn-outline">
                                    <span>Today</span>
                                </button>
                                <button className="btn btn-outline">
                                    <span>Next</span>
                                </button>
                            </div>
                        </div>
                        <div className="calendar-days-header">
                            <div>Sun</div>
                            <div>Mon</div>
                            <div>Tue</div>
                            <div>Wed</div>
                            <div>Thu</div>
                            <div>Fri</div>
                            <div>Sat</div>
                        </div>
                        <div className="calendar-grid">
                            {generateCalendarDays()}
                        </div>
                    </div>
                )}
            </div>

            {showNewVisitForm && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Schedule New Visit</h3>
                            <button className="close-btn" onClick={() => setShowNewVisitForm(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmitVisit}>
                            <div className="form-grid">
                                <div className="form-column">
                                    <div className="form-group">
                                        <label>Date</label>
                                        <input
                                            type="date"
                                            name="date"
                                            value={newVisitData.date}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Time</label>
                                        <input
                                            type="time"
                                            name="time"
                                            value={newVisitData.time}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Property</label>
                                        <select
                                            name="property_id"
                                            value={newVisitData.property_id}
                                            onChange={handleInputChange}
                                            required
                                        >
                                            <option value="">Select Property</option>
                                            {properties.map((property) => (
                                                <option key={property.property_id} value={property.property_id}>
                                                    {property.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="form-column">
                                    <div className="form-group">
                                        <label>Client</label>
                                        <select
                                            name="client_id"
                                            value={newVisitData.client_id}
                                            onChange={handleInputChange}
                                            required
                                        >
                                            <option value="">Select Client</option>
                                            {clients.length > 0 ? (
                                                clients.map((client) => (
                                                    <option key={client.client_id} value={client.client_id}>
                                                        {client.name}
                                                    </option>
                                                ))
                                            ) : (
                                                <option value="" disabled>No clients available</option>
                                            )}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Broker selection removed as requested */}

                            <div className="form-group">
                                <label>Notes & Instructions</label>
                                <textarea
                                    name="description"
                                    value={newVisitData.description}
                                    onChange={handleInputChange}
                                    placeholder="Add any details about the visit or client preferences"
                                    rows="4"
                                ></textarea>
                            </div>

                            {/* <div className="reminder-settings">
                                <h4>Notification Settings</h4>
                                <div className="reminder-toggle">
                                    <span>Send email reminder to client (24h before)</span>
                                    <label className="switch">
                                        <input type="checkbox" />
                                        <span className="slider"></span>
                                    </label>
                                </div>
                                <div className="reminder-toggle">
                                    <span>Send SMS reminder to client (2h before)</span>
                                    <label className="switch">
                                        <input type="checkbox" />
                                        <span className="slider"></span>
                                    </label>
                                </div>
                            </div> */}

                            <div className="form-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowNewVisitForm(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Schedule Visit
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Schedule;
