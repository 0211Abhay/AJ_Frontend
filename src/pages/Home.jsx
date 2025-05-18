import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building, Users, Calendar, BarChart2, Shield } from 'lucide-react';
import '../style/Home.css';

const Home = () => {
    const [activeTestimonial, setActiveTestimonial] = useState(0);

    const testimonials = [
        {
            id: 1,
            name: 'Sarah Johnson',
            role: 'Real Estate Agent',
            content: 'EstateMATE has completely transformed how I manage my client relationships. The intuitive interface and powerful features have helped me close 30% more deals this year.',
            avatar: 'https://randomuser.me/api/portraits/women/32.jpg'
        },
        {
            id: 2,
            name: 'Michael Chen',
            role: 'Property Manager',
            content: 'As a property manager handling over 50 properties, EstateMATE has been a game-changer. The scheduling and property tracking features save me hours every week.',
            avatar: 'https://randomuser.me/api/portraits/men/54.jpg'
        },
        {
            id: 3,
            name: 'Priya Patel',
            role: 'Broker',
            content: 'The analytics and reporting features in EstateMATE give me insights I never had before. I can make data-driven decisions that have increased our agency revenue by 25%.',
            avatar: 'https://randomuser.me/api/portraits/women/68.jpg'
        }
    ];

    const features = [
        {
            icon: <Users size={64} />,
            title: 'Client Management',
            description: 'Easily manage all your client relationships, track interactions, and never miss a follow-up.'
        },
        {
            icon: <Building size={64} />,
            title: 'Property Tracking',
            description: 'Keep detailed records of all properties, including photos, documents, and transaction history.'
        },
        {
            icon: <Calendar size={64} />,
            title: 'Smart Scheduling',
            description: 'Organize viewings, meetings, and follow-ups with an intelligent calendar system.'
        },
        {
            icon: <BarChart2 size={64} />,
            title: 'Performance Analytics',
            description: 'Gain insights into your business performance with detailed reports and analytics.'
        },
        {
            icon: <Shield size={64} />,
            title: 'Secure & Reliable',
            description: 'Your data is protected with enterprise-grade security and regular backups.'
        }
    ];

    const nextTestimonial = () => {
        setActiveTestimonial((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
    };

    const prevTestimonial = () => {
        setActiveTestimonial((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));
    };

    return (
        <div className="home-container">
            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-content">
                    <h1>Manage Your Real Estate Business with Confidence</h1>
                    <p>EstateMATE is the all-in-one CRM solution designed specifically for real estate professionals.</p>
                    <div className="hero-buttons">
                        <Link to="/signup" className="btn btn-primary">Get Started</Link>
                        <Link to="/login" className="btn btn-secondary">Log In</Link>
                    </div>
                </div>
                <div className="hero-image">
                    <img src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1073&q=80" alt="Real Estate Dashboard" />
                </div>
            </section>

            {/* Features Section */}
            <section className="features-section">
                <div className="section-header">
                    <h2>Powerful Features for Real Estate Professionals</h2>
                    <p>Everything you need to grow your business and delight your clients</p>
                </div>
                <div className="features-grid">
                    {features.map((feature, index) => (
                        <div className="feature-card" key={index}>
                            <div className="feature-icon">{feature.icon}</div>
                            <div className="feature-text">
                                <h3>{feature.title}</h3>
                                <p>{feature.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Testimonials Section */}
            <section className="testimonials-section">
                <div className="section-header">
                    <h2>Trusted by Real Estate Professionals</h2>
                    <p>See what our users have to say about EstateMATE</p>
                </div>
                <div className="testimonial-carousel">
                    <button className="carousel-arrow prev" onClick={prevTestimonial}>&lt;</button>
                    <div className="testimonial-card">
                        <div className="testimonial-avatar">
                            <img src={testimonials[activeTestimonial].avatar} alt={testimonials[activeTestimonial].name} />
                        </div>
                        <div className="testimonial-content">
                            <p>"{testimonials[activeTestimonial].content}"</p>
                            <div className="testimonial-author">
                                <h4>{testimonials[activeTestimonial].name}</h4>
                                <p>{testimonials[activeTestimonial].role}</p>
                            </div>
                        </div>
                    </div>
                    <button className="carousel-arrow next" onClick={nextTestimonial}>&gt;</button>
                </div>
                <div className="testimonial-indicators">
                    {testimonials.map((_, index) => (
                        <button 
                            key={index} 
                            className={`indicator ${index === activeTestimonial ? 'active' : ''}`}
                            onClick={() => setActiveTestimonial(index)}
                        />
                    ))}
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-section">
                <div className="cta-content">
                    <h2>Ready to Transform Your Real Estate Business?</h2>
                    <p>Join thousands of real estate professionals who trust EstateMATE to grow their business.</p>
                    <Link to="/signup" className="btn btn-primary">Start Your Free Trial</Link>
                </div>
            </section>
        </div>
    );
};

export default Home;
