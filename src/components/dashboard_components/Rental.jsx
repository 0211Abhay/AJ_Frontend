import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, XCircle, Upload, FileText, Search, Bell, DollarSign, Clock, AlertTriangle } from 'lucide-react';
import axios from 'axios';
// import { toast } from 'react-toastify'; // Commented out since it's not properly configured
import "../../style/Rental.css";
const Rental = () => {
    const [activeTab, setActiveTab] = useState('payments');
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [showRentalModal, setShowRentalModal] = useState(false);

    // State for broker data
    const [currentBrokerId, setCurrentBrokerId] = useState(null);
    const [properties, setProperties] = useState([]);
    const [clients, setClients] = useState([]);
    const [loadingData, setLoadingData] = useState(false);

    // State for notification preferences
    const [notificationPrefs, setNotificationPrefs] = useState({
        emailNotification: true,
        smsNotification: false,
        calendarReminder: true,
        documentReminder: true,
        paymentReminder: true,
        leaseReminder: false
    });

    // Function to handle checkbox changes
    const handleCheckboxChange = (prefName) => {
        setNotificationPrefs(prev => ({
            ...prev,
            [prefName]: !prev[prefName]
        }));
    };

    const [newRental, setNewRental] = useState({
        broker_id: 1, // Will be updated with current broker ID
        client_id: '',
        property_id: '',
        start_date: '',
        end_date: '',
        rent_amount: '',
        status: 'Active',
        notes: ''
    });

    // Get current broker ID from localStorage on component mount
    useEffect(() => {
        try {
            // Get broker ID directly from localStorage
            const brokerId = localStorage.getItem('brokerId');
            console.log('Current broker ID for rental component:', brokerId);

            if (!brokerId) {
                console.error('No broker ID found in localStorage');
                setError('Broker ID not found. Please log in again.');
                return;
            }

            setCurrentBrokerId(brokerId);
            setNewRental(prev => ({
                ...prev,
                broker_id: brokerId
            }));

            // Fetch rentals when component mounts
            fetchRentals();
            fetchDocuments();
        } catch (error) {
            console.error('Error getting broker info from localStorage:', error);
            setError('Error loading broker information. Please refresh and try again.');
            setNewRental(prev => ({
                ...prev,
                broker_id: ''
            }));
        }
    }, []);

    // Fetch properties and clients when modal is opened
    useEffect(() => {
        if (showRentalModal && currentBrokerId) {
            fetchPropertiesAndClients();
        }
    }, [showRentalModal, currentBrokerId]);

    // Function to fetch properties and clients for the current broker
    const fetchPropertiesAndClients = async () => {
        if (!currentBrokerId) return;

        setLoadingData(true);
        try {
            // Fetch properties for this broker
            let propertiesData = [];
            try {
                const propertiesResponse = await axios.get(`http://localhost:5001/api/property/getPropertiesByBroker/${currentBrokerId}`);
                if (propertiesResponse.data) {
                    propertiesData = propertiesResponse.data.properties || [];
                    console.log('Broker properties:', propertiesData);
                }
            } catch (propError) {
                console.error('Error fetching broker properties:', propError);
            }

            // If no properties found for this broker, fetch all properties as fallback
            if (!propertiesData || propertiesData.length === 0) {
                try {
                    const allPropertiesResponse = await axios.get('http://localhost:5001/api/property/getAllProperty');
                    if (allPropertiesResponse.data && allPropertiesResponse.data.properties) {
                        // Filter properties by broker_id if possible, otherwise show all
                        propertiesData = allPropertiesResponse.data.properties.filter(property =>
                            !currentBrokerId || property.broker_id.toString() === currentBrokerId.toString()
                        );
                        console.log('All properties filtered for broker:', propertiesData);
                    }
                } catch (allPropError) {
                    console.error('Error fetching all properties:', allPropError);
                }
            }

            setProperties(propertiesData || []);

            // Similar approach for clients
            let clientsData = [];
            try {
                // Use axios for consistent API calls and POST request for getClientsByBroker
                const clientsResponse = await axios.post('http://localhost:5001/api/client/getClientsByBroker', {
                    broker_id: currentBrokerId
                });

                if (clientsResponse.data) {
                    clientsData = clientsResponse.data;
                    console.log('Broker clients:', clientsData);
                }
            } catch (clientError) {
                console.error('Error fetching broker clients:', clientError);
            }

            // If no clients found for this broker, fetch all clients as fallback
            if (!clientsData || clientsData.length === 0) {
                try {
                    const allClientsResponse = await axios.get('http://localhost:5001/api/client/getAllClient');
                    if (allClientsResponse.data) {
                        // Filter clients by broker_id if possible, otherwise show all
                        clientsData = allClientsResponse.data.filter(client =>
                            !currentBrokerId || client.broker_id.toString() === currentBrokerId.toString()
                        );
                        console.log('All clients filtered for broker:', clientsData);
                    }
                } catch (allClientError) {
                    console.error('Error fetching all clients:', allClientError);
                }
            }

            setClients(clientsData || []);

        } catch (error) {
            console.error('Error in fetchPropertiesAndClients:', error);
            // Show error state instead of using mock data
            setProperties([]);
            setClients([]);
            // Display an error message to the user
            alert('Failed to load properties and clients. Please try again later.');
            // You could also set an error state here if you want to show a specific error UI
        } finally {
            setLoadingData(false);
        }
    };

    // State for rental data
    const [rentals, setRentals] = useState([]);
    const [leases, setLeases] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [monthlyPayments, setMonthlyPayments] = useState([]);
    const [selectedRental, setSelectedRental] = useState(null);

    // State for storing paid payments from the rent_payments table
    const [paidPayments, setPaidPayments] = useState([]);

    // Dashboard metrics state
    const [dashboardMetrics, setDashboardMetrics] = useState({
        activeRentals: 0,
        paidRentals: 0,
        overduePayments: 0,
        expiringLeases: 0
    });

    // Helper function to map rental status to payment status
    const mapRentalStatusToPaymentStatus = (rentalStatus) => {
        switch (rentalStatus) {
            case 'Active':
                return 'Pending';
            case 'Completed':
                return 'Paid';
            case 'Terminated':
                return 'Overdue';
            default:
                return 'Unknown';
        }
    };

    // Helper function to determine lease status based on end date and rental status
    const getLeaseStatus = (endDate, rentalStatus) => {
        if (rentalStatus === 'Terminated') {
            return 'Terminated';
        }

        const today = new Date();
        const leaseEndDate = new Date(endDate);

        if (leaseEndDate < today) {
            return 'Expired';
        } else if (rentalStatus === 'Completed') {
            return 'Completed';
        } else {
            // Calculate days remaining
            const daysRemaining = Math.ceil((leaseEndDate - today) / (1000 * 60 * 60 * 24));

            if (daysRemaining <= 30) {
                return 'Expiring Soon';
            } else {
                return 'Active';
            }
        }
    };

    // Function to fetch documents (using mock data since API endpoint doesn't exist yet)
    const fetchDocuments = async () => {
        try {
            setLoadingData(true);

            // Get broker ID from localStorage
            const currentBrokerId = localStorage.getItem('brokerId');

            // Use mock data for now since the API endpoint doesn't exist
            // This will be replaced with a real API call once the endpoint is implemented
            const mockDocuments = [
                { id: 1, name: 'Lease Agreement Template', type: 'PDF', date: '2023-10-15', size: '245 KB' },
                { id: 2, name: 'Rental Application Form', type: 'DOCX', date: '2023-09-22', size: '180 KB' },
                { id: 3, name: 'Property Inspection Checklist', type: 'PDF', date: '2023-11-05', size: '320 KB' }
            ];

            // Filter by broker ID if needed
            const filteredDocuments = currentBrokerId
                ? mockDocuments.filter(doc => doc.broker_id === parseInt(currentBrokerId) || !doc.broker_id)
                : mockDocuments;

            setDocuments(filteredDocuments);
            console.log('Using mock documents data:', filteredDocuments);
        } catch (error) {
            console.error('Error in document handling:', error);
            setDocuments([]);
        } finally {
            setLoadingData(false);
        }
    };

    // Fetch documents on component mount
    useEffect(() => {
        fetchDocuments();
    }, []);

    // Function to fetch rentals from the backend
    const fetchRentals = async () => {
        try {
            setLoadingData(true);
            // Get broker ID directly from localStorage
            const currentBrokerId = localStorage.getItem('brokerId');
            console.log('Using broker ID for rentals:', currentBrokerId);
            
            if (!currentBrokerId) {
                console.error('No broker ID found in localStorage');
                setError('Broker ID not found. Please log in again.');
                setLoadingData(false);
                return;
            }

            // Fetch rentals from the API using the broker-specific endpoint
            const rentalResponse = await axios.get(`http://localhost:5001/api/rental/getRentalsByBroker/${currentBrokerId}`);

            // Fetch paid payments filtered by broker ID
            const paidPaymentsResponse = await axios.get(`http://localhost:5001/api/payment/getAllPaidPayments/${currentBrokerId}`);
            const fetchedPaidPayments = paidPaymentsResponse.data?.payments || [];

            // Store the paid payments separately for the Paid section
            setPaidPayments(fetchedPaidPayments);
            console.log(`Fetched ${fetchedPaidPayments.length} paid payments for broker ID: ${currentBrokerId}`);

            if (rentalResponse.data && rentalResponse.data.rentals) {
                // Map the rental data for the Due and Overdue sections
                const formattedRentals = rentalResponse.data.rentals.map(rental => {
                    // Get client name (tenant)
                    const tenant = rental.client ? rental.client.name : 'Unknown Client';

                    // Get property name
                    const property = rental.property ? rental.property.name : 'Unknown Property';

                    // Get current date for comparison (remove time portion for accurate date comparison)
                    const today = new Date();
                    today.setHours(0, 0, 0, 0); // Set to beginning of day for accurate comparison

                    // Parse the due date and normalize it as well
                    const dueDate = new Date(rental.end_date);
                    dueDate.setHours(0, 0, 0, 0);

                    // Check if this rental has a paid payment in the rent_payments table
                    const hasPaidPayment = fetchedPaidPayments.some(payment =>
                        payment.rental_id === rental.rental_id && payment.status.toLowerCase() === 'paid'
                    );

                    // Determine payment status based on new criteria:
                    // Due: Payment due date is approaching (within the next 7 days)
                    // Overdue: Payment due date is more than 7 days past
                    // Paid: Payments that have already been paid
                    let status;

                    if (hasPaidPayment) {
                        // Skip rentals that have been paid (they'll be in the paidPayments list)
                        status = 'paid';
                    } else {
                        // Calculate the difference in days between today and the due date
                        const diffTime = dueDate.getTime() - today.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));

                        console.log(`Rental ${rental.rental_id}: Due in ${diffDays} days`);

                        if (diffDays < -7) {
                            // More than 7 days past due date - mark as overdue
                            status = 'overdue';
                            console.log(`Overdue rental: ${rental.rental_id} (${Math.abs(diffDays)} days late)`);
                        } else {
                            // Any other payment not overdue - mark as due
                            // This includes payments due soon and payments due in the future
                            status = 'due';
                            console.log(`Due rental: ${rental.rental_id} (Due ${diffDays < 0 ? 'was ' + Math.abs(diffDays) + ' days ago' : 'in ' + diffDays + ' days'})`);
                        }
                    }

                    return {
                        id: rental.rental_id,
                        property: property,
                        tenant: tenant,
                        dueDate: rental.end_date,
                        amount: parseFloat(rental.rent_amount),
                        status: status,
                        paymentDate: status === 'paid' ? (rental.updated_at || new Date().toISOString().split('T')[0]) : '',
                        method: status === 'paid' ? 'Bank Transfer' : '',
                        property_id: rental.property_id,
                        client_id: rental.client_id,
                        start_date: rental.start_date,
                        end_date: rental.end_date,
                        notes: rental.notes || ''
                    };
                });

                setRentals(formattedRentals);

                // Update dashboard metrics based on our categories (Due, Overdue, Paid)
                const paidCount = fetchedPaidPayments.length; // Count directly from the rent_payments table
                const dueCount = formattedRentals.filter(r => r.status === 'due').length;
                const overdueCount = formattedRentals.filter(r => r.status === 'overdue').length;

                // Count leases expiring within 30 days
                const expiringLeases = formattedRentals.filter(r => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const endDate = new Date(r.end_date);
                    endDate.setHours(0, 0, 0, 0);
                    const diffDays = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
                    return diffDays > 0 && diffDays <= 30; // Leases expiring within 30 days
                }).length;

                setDashboardMetrics({
                    activeRentals: dueCount + overdueCount, // Only due and overdue are considered active
                    paidRentals: paidCount,
                    overduePayments: overdueCount,
                    expiringLeases
                });

                console.log('Dashboard metrics updated:', {
                    activeRentals: dueCount + overdueCount,
                    paidRentals: paidCount,
                    overduePayments: overdueCount,
                    expiringLeases
                });

                // We'll keep this for now but will implement the lease agreement section later
                const formattedLeases = [];
                setLeases(formattedLeases);
            } else {
                setRentals([]);
                setLeases([]);
            }
        } catch (error) {
            console.error('Error fetching rentals:', error);
            setRentals([]);
            setLeases([]);
            alert('Failed to load rentals. Please try again later.');
        } finally {
            setLoadingData(false);
        }
    };
    // Function to create rental records from the paid payments in the rent_payments table
    const getPaidRentalRecords = () => {
        return paidPayments.map(payment => {
            // Find the original rental to get property and tenant info
            const relatedRental = rentals.find(r => r.id === payment.rental_id);

            return {
                id: payment.payment_id,
                rental_id: payment.rental_id,
                property: relatedRental?.property || 'Unknown Property',
                tenant: relatedRental?.tenant || 'Unknown Tenant',
                dueDate: payment.due_date,
                amount: parseFloat(payment.amount_paid || 0),
                status: 'paid',
                paymentDate: payment.payment_date,
                method: 'Bank Transfer',
                notes: payment.notes || '',
                // This is from the rent_payments table
                isPaidFromTable: true
            };
        });
    };

    // Count rentals in each category for debugging
    const dueRentals = rentals.filter(r => r.status === 'due');
    const overdueRentals = rentals.filter(r => r.status === 'overdue');

    console.log('Rental counts by status:');
    console.log('- Due:', dueRentals.length);
    console.log('- Overdue:', overdueRentals.length);
    console.log('- Paid:', paidPayments.length);
    console.log('Current filter selected:', filterStatus);

    // Filtered rentals based on status and search criteria
    const filteredRentals = filterStatus === 'paid'
        ? getPaidRentalRecords().filter(rental => {
            // For paid status, use records from rent_payments table
            const matchesSearch = rental.property?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                rental.tenant?.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesSearch;
        })
        : filterStatus === 'due'
            ? rentals.filter(rental => {
                // For due status, filter rentals marked as due
                const isDue = rental.status === 'due';
                const matchesSearch = rental.property?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    rental.tenant?.toLowerCase().includes(searchQuery.toLowerCase());
                return isDue && matchesSearch;
            })
            : filterStatus === 'overdue'
                ? rentals.filter(rental => {
                    // For overdue status, filter rentals with overdue status
                    // We use the same logic that marks a rental as overdue
                    let isOverdue = rental.status === 'overdue';

                    // If a rental has an end_date that's more than 7 days past, it should show in overdue
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    const dueDate = new Date(rental.end_date);
                    dueDate.setHours(0, 0, 0, 0);

                    const diffTime = dueDate.getTime() - today.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));

                    // If diffDays < -7, the rental is more than 7 days past due
                    isOverdue = isOverdue || diffDays < -7;

                    const matchesSearch = rental.property?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        rental.tenant?.toLowerCase().includes(searchQuery.toLowerCase());
                    return isOverdue && matchesSearch;
                })
                // All status - show everything except paid
                : rentals.filter(rental => {
                    // For 'all' status, show everything except paid (which come from a different list)
                    const matchesSearch = rental.property?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        rental.tenant?.toLowerCase().includes(searchQuery.toLowerCase());
                    return matchesSearch;
                });

    // Function to get status class for styling
    const getStatusClass = (status) => {
        switch (status) {
            case 'paid':
                return 'status-paid';
            case 'due':
                return 'status-due';
            case 'overdue':
                return 'status-overdue';
            case 'active':
                return 'status-active';
            case 'expiring-soon':
                return 'status-expiring';
            case 'expired':
                return 'status-expired';
            default:
                return '';
        }
    };

    // Function to format date
    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    // Function to calculate monthly payments between start and end dates
    const calculateMonthlyPayments = (rental) => {
        if (!rental || !rental.start_date || !rental.end_date) return [];

        const startDate = new Date(rental.start_date);
        const endDate = new Date(rental.end_date);

        // Calculate total months between start and end dates
        const totalMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
            (endDate.getMonth() - startDate.getMonth()) + 1;

        const payments = [];

        for (let i = 0; i < totalMonths; i++) {
            const paymentDate = new Date(startDate);
            paymentDate.setMonth(startDate.getMonth() + i);

            const paymentEndDate = new Date(paymentDate);
            paymentEndDate.setMonth(paymentDate.getMonth() + 1);
            paymentEndDate.setDate(paymentEndDate.getDate() - 1);

            // Determine payment status based on current date
            const currentDate = new Date();
            let status = 'pending';

            if (paymentEndDate < currentDate) {
                status = 'overdue';
            } else if (paymentDate <= currentDate && paymentEndDate >= currentDate) {
                status = 'due';
            }

            // Format month name
            const monthName = paymentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

            payments.push({
                id: i + 1,
                rental_id: rental.id,
                month: monthName,
                start_date: paymentDate.toISOString().split('T')[0],
                end_date: paymentEndDate.toISOString().split('T')[0],
                due_date: paymentEndDate.toISOString().split('T')[0],
                amount: rental.amount,
                amount_due: rental.amount,
                amount_paid: 0,
                status: status,
                payment_date: null
            });
        }

        return payments;
    };

    // Function to fetch payment history from the database
    const fetchRentalPayments = async (rentalId) => {
        try {
            const response = await axios.get(`http://localhost:5001/api/payment/getRentalPayments/${rentalId}`);
            return response.data.payments || [];
        } catch (error) {
            console.error('Error fetching payment history:', error);
            return [];
        }
    };

    // Function to fetch all paid payments directly from rent_payments table
    const fetchAllPaidPayments = async () => {
        try {
            const response = await axios.get('http://localhost:5001/api/payment/getAllPaidPayments');
            return response.data.payments || [];
        } catch (error) {
            console.error('Error fetching paid payments:', error);
            return [];
        }
    };

    // Function to handle showing rental details
    const handleShowDetails = async (rental, e) => {
        e.stopPropagation();
        setSelectedRental(rental);

        // Calculate monthly payments
        const calculatedPayments = calculateMonthlyPayments(rental);

        try {
            // Fetch actual payment records from the database
            const paymentHistory = await fetchRentalPayments(rental.id);

            // Update calculated payments with actual payment data from database
            if (paymentHistory && paymentHistory.length > 0) {
                const updatedPayments = calculatedPayments.map(payment => {
                    // Find if this month's payment exists in the database by matching the month name
                    const existingPayment = paymentHistory.find(p =>
                        p.month === payment.month
                    );

                    if (existingPayment) {
                        // Update payment with database record
                        return {
                            ...payment,
                            status: existingPayment.status || 'paid',
                            payment_date: existingPayment.payment_date,
                            amount_paid: parseFloat(existingPayment.amount_paid) || payment.amount,
                            payment_id: existingPayment.payment_id,
                            notes: existingPayment.notes
                        };
                    }

                    return payment;
                });

                setMonthlyPayments(updatedPayments);
            } else {
                setMonthlyPayments(calculatedPayments);
            }
        } catch (error) {
            console.error('Error processing payment data:', error);
            setMonthlyPayments(calculatedPayments);
        }
    };

    // Function to mark a monthly payment as paid
    const handleMarkMonthlyPaymentAsPaid = async (payment) => {
        try {
            // Prepare payment data for the database - always store in rent_payments table
            const paymentData = {
                rental_id: payment.rental_id,
                payment_date: new Date().toISOString().split('T')[0],
                amount: payment.amount,
                month: payment.month,
                due_date: payment.due_date,
                payment_for_month: payment.start_date,
                payment_period_end: payment.end_date,
                payment_period_display: payment.month
            };

            // Save payment to the database
            const response = await axios.post('http://localhost:5001/api/payment/addRentPayment', paymentData);

            if (response.data && response.data.success) {
                // Update the payment status locally after successful database update
                const updatedPayments = monthlyPayments.map(p =>
                    p.id === payment.id ?
                        {
                            ...p,
                            status: 'paid',
                            payment_date: paymentData.payment_date,
                            amount_paid: paymentData.amount,
                            payment_id: response.data.payment_id // Store the payment ID from the database
                        } :
                        p
                );

                setMonthlyPayments(updatedPayments);

                // Show success message
                alert('Payment recorded successfully!');

                // Refresh both the rentals list and paid payments list to reflect the updated payment status
                fetchRentals();

                // VERY IMPORTANT: Refresh the paid payments too by directly calling the API
                const paidPaymentsResponse = await axios.get('http://localhost:5001/api/payment/getAllPaidPayments');
                setPaidPayments(paidPaymentsResponse.data?.payments || []);
            } else {
                alert('Failed to record payment in the database');
            }
        } catch (error) {
            console.error('Error recording payment:', error);
            
            // Handle specific error cases for duplicate payments
            if (error.response?.data?.error === 'Duplicate payment') {
                alert(`${error.response.data.message}\n${error.response.data.details}`);
            } else {
                alert('Failed to record payment: ' + (error.response?.data?.error || error.message));
            }
        }
    };

    // Function to handle adding a new rental
    const handleAddRental = async () => {
        try {
            // Validate form
            if (!newRental.client_id || !newRental.property_id || !newRental.start_date ||
                !newRental.end_date || !newRental.rent_amount) {
                alert('Please fill in all required fields');
                return;
            }

            // Get client and property details for display - handle different API data structures
            const selectedClient = clients.find(c => {
                const clientId = c.client_id || c.id;
                return clientId && clientId.toString() === newRental.client_id.toString();
            });

            const selectedProperty = properties.find(p => {
                const propertyId = p.property_id || p.id;
                return propertyId && propertyId.toString() === newRental.property_id.toString();
            });

            if (!selectedClient || !selectedProperty) {
                alert('Invalid client or property selection');
                return;
            }

            // Prepare data for API request
            const rentalData = {
                broker_id: parseInt(newRental.broker_id),
                client_id: parseInt(newRental.client_id),
                property_id: parseInt(newRental.property_id),
                start_date: newRental.start_date,
                end_date: newRental.end_date,
                rent_amount: parseFloat(newRental.rent_amount),
                status: newRental.status,
                notes: newRental.notes
            };

            // Show loading state
            setLoadingData(true);

            const response = await axios.post('http://localhost:5001/api/rental/createRental', rentalData);
            
            // If successful, refresh the rentals data to show the new entry
            if (response.data && response.data.rental) {
                // Create a new rental entry for the Rent Payment section
                const newRentalEntry = {
                    id: response.data.rental.rental_id,
                    property: selectedProperty.name || selectedProperty.property_name || 'Unknown Property',
                    tenant: selectedClient.name || selectedClient.client_name || 'Unknown Client',
                    dueDate: newRental.end_date,
                    amount: parseFloat(newRental.rent_amount),
                    status: mapRentalStatusToPaymentStatus(newRental.status),
                    paymentDate: newRental.status === 'Completed' ? new Date().toISOString() : '',
                    method: newRental.status === 'Completed' ? 'Bank Transfer' : '',
                    property_id: parseInt(newRental.property_id),
                    client_id: parseInt(newRental.client_id),
                    start_date: newRental.start_date,
                    end_date: newRental.end_date,
                    notes: newRental.notes
                };

                // Add the new rental to the rentals state to immediately display it
                setRentals(prevRentals => [newRentalEntry, ...prevRentals]);

                // Also fetch updated rental data to ensure we have the latest information
                fetchRentals();

                // Reset form and close modal
                setNewRental({
                    broker_id: currentBrokerId,
                    client_id: '',
                    property_id: '',
                    start_date: '',
                    end_date: '',
                    rent_amount: '',
                    status: 'Active',
                    notes: ''
                });

                setShowRentalModal(false);

                // Set active tab to payments to ensure the user sees the new rental
                setActiveTab('payments');

                // Show success message
                alert('Rental agreement added successfully!');
            }
        } catch (error) {
            console.error('Error adding rental:', error);
            
            // Handle specific error cases including redundancy check
            if (error.response?.data?.error === 'Redundant rental entry') {
                alert(`${error.response.data.message}\n${error.response.data.details}`);
            } else {
                alert('Failed to add rental agreement: ' + (error.response?.data?.error || error.message));
            }
        } finally {
            setLoadingData(false);
        }
    };

    const handleMarkAsPaid = (id) => {
        // Update the rental status to paid
        setRentals(prevRentals =>
            prevRentals.map(rental =>
                rental.id === id
                    ? { ...rental, status: 'paid', paymentDate: new Date().toISOString().split('T')[0], method: 'Bank Transfer' }
                    : rental
            )
        );

        // Also update the lease status
        setLeases(prevLeases =>
            prevLeases.map(lease =>
                lease.id === id
                    ? { ...lease, status: 'expired' }
                    : lease
            )
        );

        // In a real app, you would call an API to update the status
        // axios.patch(`/api/rental/changeRentalStatus/${id}`, { status: 'Completed' });

        alert('Rental marked as paid successfully!');
    };

    const handleUploadDocument = () => {
        // Create a file input element
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.pdf,.doc,.docx';

        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Create a new document entry
            const newDocId = documents.length > 0 ? Math.max(...documents.map(d => d.id)) + 1 : 1;
            const newDocument = {
                id: newDocId,
                name: file.name,
                property: selectedProperty || 'General',
                type: file.name.toLowerCase().includes('lease') ? 'Lease Agreement' :
                    file.name.toLowerCase().includes('id') ? 'Tenant ID' : 'Document',
                uploadDate: new Date().toISOString().split('T')[0]
            };

            // Add to documents state
            setDocuments(prevDocs => [newDocument, ...prevDocs]);

            alert('Document uploaded successfully!');
        };

        fileInput.click();
    };

    const handlePropertySelect = (property) => {
        setSelectedProperty(property);
    };

    // Initial dashboard metrics setup already defined in useState above

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
        <div className="rental-management">
            <div className="page-header">
                <div className="title-area">
                    <h1>Rental Management</h1>
                    {/* <p>Efficiently manage your rental properties, tenants, and payments</p> */}
                </div>
                <div className="action-buttons">
                    <button className="btn btn-primary" onClick={() => setShowRentalModal(true)}>
                        <span>Add New Rental</span>
                    </button>
                    <button className="btn btn-secondary" onClick={handleUploadDocument}>
                        <Upload size={16} />
                        <span>Upload Document</span>
                    </button>
                </div>
            </div>

            <div className="dashboard-overview">
                <div className="metric-card">
                    <div className="metric-icon properties-icon">
                        <FileText size={24} />
                    </div>
                    <div className="metric-content">
                        <h3>Active Rentals</h3>
                        <p className="metric-value" data-target={dashboardMetrics.activeRentals}>
                            {dashboardMetrics.activeRentals}
                        </p>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-icon upcoming-icon">
                        <CheckCircle size={24} />
                    </div>
                    <div className="metric-content">
                        <h3>Paid Rentals</h3>
                        <p className="metric-value" data-target={dashboardMetrics.paidRentals}>
                            {dashboardMetrics.paidRentals}
                        </p>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-icon expiring-icon">
                        <AlertTriangle size={24} />
                    </div>
                    <div className="metric-content">
                        <h3>Expiring Leases</h3>
                        <p className="metric-value" data-target={dashboardMetrics.expiringLeases}>
                            {dashboardMetrics.expiringLeases}
                        </p>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-icon overdue-icon">
                        <XCircle size={24} />
                    </div>
                    <div className="metric-content">
                        <h3>Overdue Payments</h3>
                        <p className="metric-value" data-target={dashboardMetrics.overduePayments}>
                            {dashboardMetrics.overduePayments}
                        </p>
                    </div>
                </div>
            </div>

            <div className="content-tabs">
                <button
                    className={`tab-button ${activeTab === 'payments' ? 'active' : ''}`}
                    onClick={() => setActiveTab('payments')}
                >
                    <DollarSign size={18} />
                    <span>Rent Payments</span>
                </button>
                <button
                    className={`tab-button ${activeTab === 'leases' ? 'active' : ''}`}
                    onClick={() => setActiveTab('leases')}
                >
                    <Calendar size={18} />
                    <span>Lease Agreements</span>
                </button>
                <button
                    className={`tab-button ${activeTab === 'documents' ? 'active' : ''}`}
                    onClick={() => setActiveTab('documents')}
                >
                    <FileText size={18} />
                    <span>Documents</span>
                </button>
                <button
                    className={`tab-button ${activeTab === 'reminders' ? 'active' : ''}`}
                    onClick={() => setActiveTab('reminders')}
                >
                    <Bell size={18} />
                    <span>Reminders</span>
                </button>
            </div>

            <div className="content-area">
                {activeTab === 'payments' && (
                    <div className="payments-tab">
                        <div className="filter-controls">
                            <div className="search-box">
                                <Search size={18} />
                                <input
                                    type="text"
                                    placeholder="Search by property or tenant"
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
                                    className={`filter-btn ${filterStatus === 'paid' ? 'active' : ''}`}
                                    onClick={() => setFilterStatus('paid')}
                                    style={{
                                        backgroundColor: filterStatus === 'paid' ? '#4CAF50' : '',
                                        color: filterStatus === 'paid' ? 'white' : ''
                                    }}
                                >
                                    Paid
                                </button>
                                <button
                                    className={`filter-btn ${filterStatus === 'due' ? 'active' : ''}`}
                                    onClick={() => setFilterStatus('due')}
                                    style={{
                                        backgroundColor: filterStatus === 'due' ? '#FF9800' : '',
                                        color: filterStatus === 'due' ? 'white' : ''
                                    }}
                                >
                                    Due
                                </button>
                                <button
                                    className={`filter-btn ${filterStatus === 'overdue' ? 'active' : ''}`}
                                    style={{
                                        backgroundColor: filterStatus === 'overdue' ? '#f44336' : '',
                                        color: filterStatus === 'overdue' ? 'white' : '',
                                        fontWeight: 'bold',
                                        position: 'relative',
                                    }}
                                    onClick={() => {
                                        console.log('Setting filter status to overdue');
                                        setFilterStatus('overdue');
                                    }}
                                >
                                    Overdue
                                </button>
                                {/* Upcoming section removed as requested */}
                            </div>
                        </div>

                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Property</th>
                                        <th>Tenant</th>
                                        <th>Due Date</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRentals.map(rental => (
                                        <tr
                                            key={rental.id}
                                            onClick={() => handlePropertySelect(rental)}
                                            className={rental.isPaidFromTable ? 'from-database' : ''}>
                                            <td data-label="Property">{rental.property}</td>
                                            <td data-label="Tenant">{rental.tenant}</td>
                                            <td data-label="Due Date">{formatDate(rental.dueDate)}</td>
                                            <td data-label="Amount">${(rental.amount || 0).toLocaleString()}</td>
                                            <td data-label="Status">
                                                <span className={`status-badge ${getStatusClass(rental.status)}`}>
                                                    {rental.status === 'paid' && <CheckCircle size={14} />}
                                                    {rental.status === 'due' && <Clock size={14} />}
                                                    {rental.status === 'overdue' && <XCircle size={14} />}
                                                    {rental.status.charAt(0).toUpperCase() + rental.status.slice(1)}
                                                </span>
                                                {rental.isPaidFromTable && (
                                                    <span className="payment-badge" title="Payment record from rent_payments table">
                                                        DB Record
                                                    </span>
                                                )}
                                            </td>
                                            <td data-label="Actions">
                                                {!rental.isPaidFromTable ? (
                                                    <>
                                                        <button
                                                            className="action-btn details-btn"
                                                            onClick={(e) => handleShowDetails(rental, e)}
                                                        >
                                                            Show Details
                                                        </button>
                                                        {rental.status !== 'paid' && (
                                                            <button
                                                                className="action-btn mark-paid-btn"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleMarkAsPaid(rental.id);
                                                                }}
                                                            >
                                                                Mark as Paid
                                                            </button>
                                                        )}
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="payment-info">
                                                            <strong>Payment Date:</strong> {formatDate(rental.paymentDate)}<br />
                                                            <strong>Amount Paid:</strong> ${rental.amount.toLocaleString()}
                                                        </span>
                                                        <button className="action-btn view-receipt-btn">
                                                            View Receipt
                                                        </button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {selectedRental && (
                            <div className="modal-overlay" style={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                zIndex: 1000
                            }}>
                                <div className="payment-details-modal" style={{
                                    position: 'relative',
                                    width: '90%',
                                    maxWidth: '800px',
                                    maxHeight: '90vh',
                                    overflowY: 'auto',
                                    backgroundColor: 'white',
                                    padding: '20px',
                                    boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
                                    borderRadius: '5px',
                                    zIndex: 1001
                                }}>
                                    <div className="modal-header" style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '20px',
                                        borderBottom: '1px solid #eee',
                                        paddingBottom: '10px',
                                        position: 'relative'
                                    }}>
                                        <h3 style={{ margin: 0, padding: 0 }}>Monthly Payment Details</h3>
                                        <button
                                            onClick={() => setSelectedRental(null)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                fontSize: '24px',
                                                cursor: 'pointer',
                                                position: 'absolute',
                                                right: '0',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                padding: '0 5px',
                                                margin: 0,
                                                lineHeight: 1
                                            }}
                                        >&times;</button>
                                    </div>

                                    <div style={{ marginBottom: '20px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: '10px', gap: '10px' }}>
                                            <div>
                                                <p><strong>Property:</strong> {selectedRental.property}</p>
                                                <p><strong>Tenant:</strong> {selectedRental.tenant}</p>
                                            </div>
                                            <div>
                                                <p><strong>Start Date:</strong> {formatDate(selectedRental.start_date)}</p>
                                                <p><strong>End Date:</strong> {formatDate(selectedRental.end_date)}</p>
                                                <p><strong>Monthly Rent:</strong> ${selectedRental.amount.toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <p><strong>Total Duration:</strong> {monthlyPayments.length} months</p>
                                    </div>

                                    <div className="monthly-payments-table">
                                        <table className="data-table responsive-table">
                                            <thead>
                                                <tr>
                                                    <th>Month</th>
                                                    <th>Start Date</th>
                                                    <th>End Date</th>
                                                    <th>Amount</th>
                                                    <th>Status</th>
                                                    <th>Payment Date</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {monthlyPayments.map((payment) => (
                                                    <tr key={payment.id}>
                                                        <td data-label="Month">Month {payment.id}</td>
                                                        <td data-label="Start Date">{formatDate(payment.start_date)}</td>
                                                        <td data-label="End Date">{formatDate(payment.end_date)}</td>
                                                        <td data-label="Amount">${payment.amount.toLocaleString()}</td>
                                                        <td data-label="Status">
                                                            <span style={{
                                                                backgroundColor:
                                                                    payment.status === 'paid' ? '#4CAF50' :
                                                                        payment.status === 'due' ? '#FF9800' :
                                                                            payment.status === 'overdue' ? '#F44336' : '#9E9E9E'
                                                            }}>
                                                                {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                                                            </span>
                                                        </td>
                                                        <td data-label="Payment Date">
                                                            {payment.payment_date ? formatDate(payment.payment_date) : '-'}
                                                        </td>
                                                        <td data-label="Actions">
                                                            {payment.status !== 'paid' && (
                                                                <button
                                                                    onClick={() => handleMarkMonthlyPaymentAsPaid(payment)}
                                                                    style={{ backgroundColor: '#4CAF50' }}
                                                                >
                                                                    Mark as Paid
                                                                </button>
                                                            )}
                                                            {payment.status === 'paid' && (
                                                                <button
                                                                    style={{ backgroundColor: '#2196F3' }}
                                                                >
                                                                    View Receipt
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'leases' && (
                    <div className="leases-tab">
                        <div className="filter-controls">
                            <div className="search-box">
                                <Search size={18} />
                                <input
                                    type="text"
                                    placeholder="Search by property or tenant"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Property</th>
                                        <th>Tenant</th>
                                        <th>Start Date</th>
                                        <th>End Date</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leases.map(lease => (
                                        <tr key={lease.id}>
                                            <td>{lease.property}</td>
                                            <td>{lease.tenant}</td>
                                            <td>{formatDate(lease.startDate)}</td>
                                            <td>{formatDate(lease.endDate)}</td>
                                            <td>
                                                <span className={`status-badge ${getStatusClass(lease.status)}`}>
                                                    {lease.status === 'active' && <CheckCircle size={14} />}
                                                    {lease.status === 'expiring-soon' && <AlertTriangle size={14} />}
                                                    {lease.status === 'expired' && <XCircle size={14} />}
                                                    {lease.status === 'active' && 'Active'}
                                                    {lease.status === 'expiring-soon' && 'Expiring Soon'}
                                                    {lease.status === 'expired' && 'Expired'}
                                                </span>
                                            </td>
                                            <td>
                                                <button className="action-btn view-btn">
                                                    View
                                                </button>
                                                <button className="action-btn renew-btn">
                                                    Renew
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'documents' && (
                    <div className="documents-tab">
                        <div className="filter-controls">
                            <div className="search-box">
                                <Search size={18} />
                                <input
                                    type="text"
                                    placeholder="Search documents"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <button className="btn btn-primary" onClick={handleUploadDocument}>
                                <Upload size={16} />
                                <span>Upload Document</span>
                            </button>
                        </div>

                        <div className="documents-grid">
                            {documents.map(doc => (
                                <div className="document-card" key={doc.id}>
                                    <div className="document-icon">
                                        <FileText size={32} />
                                    </div>
                                    <div className="document-info">
                                        <h4>{doc.name}</h4>
                                        <p>{doc.property}</p>
                                        <p className="document-type">{doc.type}</p>
                                        <p className="document-date">Uploaded: {formatDate(doc.uploadDate)}</p>
                                    </div>
                                    <div className="document-actions">
                                        <button className="action-btn view-btn">
                                            View
                                        </button>
                                        <button className="action-btn download-btn">
                                            Download
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'reminders' && (
                    <div className="reminders-tab">
                        <div className="reminders-header">
                            <h2>Manage Reminders</h2>
                            <button className="btn btn-primary">
                                <Bell size={16} />
                                <span>Create New Reminder</span>
                            </button>
                        </div>

                        <div className="reminders-grid">
                            <div className="reminder-card">
                                <div className="reminder-header">
                                    <h3>Rent Payment Due</h3>
                                    <span className="reminder-badge">Automated</span>
                                </div>
                                <p>Reminder for Emily Rodriguez's rent payment</p>
                                <p className="reminder-date">
                                    <Clock size={14} />
                                    Scheduled for: Nov 8, 2023
                                </p>
                                <div className="reminder-settings">
                                    <div className="reminder-toggle">
                                        <span>Email Notification</span>
                                        <label className="switch">
                                            <input type="checkbox" defaultChecked={true} />
                                            <span className="slider"></span>
                                        </label>
                                    </div>
                                    <div className="reminder-toggle">
                                        <span>SMS Notification</span>
                                        <label className="switch">
                                            <input type="checkbox" defaultChecked={false} />
                                            <span className="slider"></span>
                                        </label>
                                    </div>
                                </div>
                                <div className="reminder-actions">
                                    <button className="action-btn edit-btn">
                                        Edit
                                    </button>
                                    <button className="action-btn delete-btn">
                                        Delete
                                    </button>
                                </div>
                            </div>

                            <div className="reminder-card">
                                <div className="reminder-header">
                                    <h3>Lease Expiration</h3>
                                    <span className="reminder-badge">Automated</span>
                                </div>
                                <p>Reminder for James Wilson's lease expiration</p>
                                <p className="reminder-date">
                                    <Clock size={14} />
                                    Scheduled for: Nov 25, 2023
                                </p>
                                <div className="reminder-settings">
                                    <div className="reminder-toggle">
                                        <span>Email Notification</span>
                                        <label className="switch">
                                            <input type="checkbox" defaultChecked={true} />
                                            <span className="slider"></span>
                                        </label>
                                    </div>
                                    <div className="reminder-toggle">
                                        <span>SMS Notification</span>
                                        <label className="switch">
                                            <input type="checkbox" defaultChecked={true} />
                                            <span className="slider"></span>
                                        </label>
                                    </div>
                                </div>
                                <div className="reminder-actions">
                                    <button className="action-btn edit-btn">
                                        Edit
                                    </button>
                                    <button className="action-btn delete-btn">
                                        Delete
                                    </button>
                                </div>
                            </div>

                            <div className="reminder-card">
                                <div className="reminder-header">
                                    <h3>Property Inspection</h3>
                                    <span className="reminder-badge">Custom</span>
                                </div>
                                <p>Annual inspection for Riverside House</p>
                                <p className="reminder-date">
                                    <Clock size={14} />
                                    Scheduled for: Dec 15, 2023
                                </p>
                                <div className="reminder-settings">
                                    <div className="reminder-toggle">
                                        <span>Email Notification</span>
                                        <label className="switch">
                                            <input type="checkbox" defaultChecked={true} />
                                            <span className="slider"></span>
                                        </label>
                                    </div>
                                    <div className="reminder-toggle">
                                        <span>SMS Notification</span>
                                        <label className="switch">
                                            <input type="checkbox" defaultChecked={false} />
                                            <span className="slider"></span>
                                        </label>
                                    </div>
                                </div>
                                <div className="reminder-actions">
                                    <button className="action-btn edit-btn">
                                        Edit
                                    </button>
                                    <button className="action-btn delete-btn">
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* Add New Rental Modal */}
            {showRentalModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Add New Rental</h2>
                            <button className="close-btn" onClick={() => setShowRentalModal(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                // Create a new rental
                                handleAddRental();
                            }}>
                                <div className="form-group">
                                    <label htmlFor="client-id">Client</label>
                                    {loadingData ? (
                                        <div className="loading-text">Loading clients...</div>
                                    ) : (
                                        <select
                                            id="client-id"
                                            value={newRental.client_id}
                                            onChange={(e) => setNewRental({ ...newRental, client_id: e.target.value })}
                                            required
                                        >
                                            <option value="">Select Client</option>
                                            {clients.map(client => (
                                                <option key={client.client_id || client.id} value={client.client_id || client.id}>
                                                    {client.name || client.client_name || `Client #${client.client_id || client.id}`}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label htmlFor="property-id">Property</label>
                                    {loadingData ? (
                                        <div className="loading-text">Loading properties...</div>
                                    ) : (
                                        <select
                                            id="property-id"
                                            value={newRental.property_id}
                                            onChange={(e) => setNewRental({ ...newRental, property_id: e.target.value })}
                                            required
                                        >
                                            <option value="">Select Property</option>
                                            {properties.map(property => (
                                                <option key={property.property_id || property.id} value={property.property_id || property.id}>
                                                    {property.name || property.property_name || `Property #${property.property_id || property.id}`}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label htmlFor="start-date">Start Date</label>
                                    <input
                                        type="date"
                                        id="start-date"
                                        value={newRental.start_date}
                                        onChange={(e) => setNewRental({ ...newRental, start_date: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="end-date">End Date</label>
                                    <input
                                        type="date"
                                        id="end-date"
                                        value={newRental.end_date}
                                        onChange={(e) => setNewRental({ ...newRental, end_date: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="rent-amount">Rent Amount</label>
                                    <input
                                        type="number"
                                        id="rent-amount"
                                        value={newRental.rent_amount}
                                        onChange={(e) => setNewRental({ ...newRental, rent_amount: e.target.value })}
                                        required
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="status">Status</label>
                                    <select
                                        id="status"
                                        value={newRental.status}
                                        onChange={(e) => setNewRental({ ...newRental, status: e.target.value })}
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Completed">Completed</option>
                                        <option value="Terminated">Terminated</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="notes">Notes</label>
                                    <textarea
                                        id="notes"
                                        value={newRental.notes}
                                        onChange={(e) => setNewRental({ ...newRental, notes: e.target.value })}
                                        rows="3"
                                    ></textarea>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowRentalModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary">Add Rental</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Rental;