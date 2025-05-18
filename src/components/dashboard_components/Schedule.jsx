import React, { useState, useEffect } from 'react';
import { Calendar, CheckSquare, Square, XSquare, Bell, Users, MapPin, Search, Clock, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';
import "../../style/Schedule.css";

const Schedule = () => {
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
                // Get broker ID from localStorage
                const currentBrokerId = localStorage.getItem('brokerId');
                console.log('Current broker ID from localStorage:', currentBrokerId);

                if (!currentBrokerId) {
                    throw new Error('Broker ID not found. Please log in again.');
                }

                // Fetch schedules for the current broker
                const schedulesResponse = await axios.get(`http://localhost:5001/api/schedule/broker/${currentBrokerId}`);

                // Fetch properties for current broker
                const propertiesResponse = await axios.get(`http://localhost:5001/api/property/getPropertiesByBroker/${currentBrokerId}`);
                console.log('Fetched properties for broker (raw response):', propertiesResponse.data);

                // Log the full structure to debug
                console.log('Properties response structure:', {
                    hasProperties: !!propertiesResponse.data?.properties,
                    isArray: Array.isArray(propertiesResponse.data),
                    isArrayOfProperties: Array.isArray(propertiesResponse.data?.properties),
                    dataKeys: Object.keys(propertiesResponse.data || {})
                });

                // Fetch clients for current broker
                const clientsResponse = await axios.post('http://localhost:5001/api/client/getClientsByBroker', {
                    broker_id: currentBrokerId
                });
                console.log('Fetched clients for broker:', clientsResponse.data);

                // Transform schedule data to match the component's expected format
                const formattedSchedules = schedulesResponse.data.map(schedule => {
                    // Format the date and time properly
                    let formattedTime = 'No time';
                    try {
                        if (schedule.time) {
                            // Parse time directly without combining with date
                            const timeParts = schedule.time.split(':');
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

                    // Format the date properly
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

                    // Format client name
                    const clientName = schedule.client
                        ? `${schedule.client.first_name || ''} ${schedule.client.last_name || ''}`.trim()
                        : 'Unknown Client';

                    return {
                        id: schedule.schedule_id,
                        property: schedule.property ? schedule.property.name : 'Unknown Property',
                        property_id: schedule.property_id,
                        client: clientName,
                        client_id: schedule.client_id,
                        client_name: '', // Initialize client_name field
                        broker_id: schedule.broker_id,
                        broker: schedule.broker ? `${schedule.broker.first_name || ''} ${schedule.broker.last_name || ''}`.trim() : 'Unknown Broker',
                        date: formattedDate,
                        time: formattedTime,
                        status: schedule.status.toLowerCase(),
                        contactNumber: schedule.client ? schedule.client.phone : '',
                        email: schedule.client ? schedule.client.email : '',
                        notes: schedule.description || ''
                    };
                });

                // Handle different possible property response structures
                let rawProperties = [];

                // Check if response is in the format {properties: [...]} or direct array [...]
                if (propertiesResponse.data && propertiesResponse.data.properties) {
                    // Response has {properties: [...]} format
                    rawProperties = propertiesResponse.data.properties;
                } else if (Array.isArray(propertiesResponse.data)) {
                    // Response is a direct array
                    rawProperties = propertiesResponse.data;
                } else {
                    console.error('Unexpected property response format:', propertiesResponse.data);
                }

                console.log('Raw properties array:', rawProperties);

                // No need to filter by broker_id since the endpoint already filters by broker
                const formattedProperties = rawProperties.map(property => ({
                    property_id: property.property_id,
                    name: property.name || property.title || 'Unnamed Property'
                }));
                console.log(`Filtered properties for broker_id=${currentBrokerId}:`, formattedProperties);

                // Format clients data for broker_id from localStorage
                // clientsResponse.data is already an array based on the console log
                const clients = clientsResponse.data || [];
                console.log('Clients array:', clients);

                const formattedClients = clients
                    .filter(client => client.broker_id === parseInt(currentBrokerId))
                    .map(client => ({
                        client_id: client.client_id,
                        name: client.name,
                        phone: client.phone,
                        email: client.email
                    }));
                console.log('Filtered clients for broker_id=1:', formattedClients);

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
            const response = await axios.get(`http://localhost:5001/api/client/getOneClient/${clientId}`);
            return response.data.client || response.data; // Return the client object from the response
        } catch (error) {
            console.error(`Error fetching client with ID ${clientId}:`, error);
            return null;
        }
    };

    // Function to get client name from client ID
    const getClientName = async (clientId) => {
        try {
            const response = await axios.get(`http://localhost:5001/api/client/getClientName/${clientId}`);
            return response.data.clientName || 'Unknown Client';
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

            // Update status in the backend
            const response = await axios.patch(`http://localhost:5001/api/schedule/${id}/status`, {
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
            // Get broker ID from localStorage
            const currentBrokerId = localStorage.getItem('brokerId');
            console.log('Using broker ID from localStorage:', currentBrokerId);

            // Format the data for the backend
            const scheduleData = {
                property_id: parseInt(newVisitData.property_id),
                client_id: parseInt(newVisitData.client_id),
                broker_id: parseInt(currentBrokerId), // Broker ID from localStorage
                description: newVisitData.description,
                date: newVisitData.date,
                time: newVisitData.time,
                status: 'Pending' // Default status for new visits
            };

            // Send data to the backend
            const response = await axios.post('http://localhost:5001/api/schedule', scheduleData);

            // Format the new visit to match the component's expected format
            const newVisit = {
                id: response.data.schedule_id,
                property: response.data.property ? response.data.property.name : 'Unknown Property',
                property_id: response.data.property_id,
                client: response.data.client ? `${response.data.client.first_name} ${response.data.client.last_name}` : 'Unknown Client',
                client_id: response.data.client_id,
                client_name: '', // Initialize client_name field
                broker_id: response.data.broker_id,
                broker: response.data.broker ? `${response.data.broker.first_name} ${response.data.broker.last_name}` : 'Unknown Broker',
                date: new Date(response.data.date).toISOString().split('T')[0],
                time: new Date(response.data.date + ' ' + response.data.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: 'pending',
                contactNumber: response.data.client ? response.data.client.phone : '',
                email: response.data.client ? response.data.client.email : '',
                notes: response.data.description || ''
            };

            // Update visits state with the new visit
            setVisits(prevVisits => [...prevVisits, newVisit]);

            // Update dashboard metrics
            setDashboardMetrics(prev => ({
                ...prev,
                totalScheduled: prev.totalScheduled + 1
            }));

            // Close the form and reset the form data
            setShowNewVisitForm(false);
            setNewVisitData({
                date: '',
                time: '',
                property_id: '',
                client_id: '',
                description: ''
                // broker_id is fixed to 1, so removed from state
            });

        } catch (error) {
            console.error('Error creating visit:', error);
            alert('Failed to create visit. Please try again.');
        }
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
                                            {clients.map((client) => (
                                                <option key={client.client_id} value={client.client_id}>
                                                    {client.name}
                                                </option>
                                            ))}
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
