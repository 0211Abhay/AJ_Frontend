
// import { Users, Mail, Linkedin } from 'lucide-react';
// import { FaGithub } from 'react-icons/fa';
// import '../style/Aboutus.css';

// const AboutUs = () => {
//     const teamMembers = [
//         {
//             name: "Abhay Nathwani",
//             role: "Co-Founder & Developer",
//             description: "Passionate about creating innovative solutions and building great user experiences.",
//             email: "alice@example.com",
//             github: "https://github.com/alice",
//             linkedin: "https://linkedin.com/in/alice",
//             photo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQHHqCdfHbbksZFYPDTOQZUyOIpJNnwfhemGA&s",
//             skills: ["React", "Node.js", "CSS", "UI/UX"]
//         },
//         {
//             name: "Krish Mamtora",
//             role: "Co-Founder & Designer",
//             description: "Creative professional focused on crafting beautiful and intuitive interfaces.",
//             email: "bob@example.com",
//             github: "https://github.com/bob",
//             linkedin: "https://linkedin.com/in/bob",
//             photo: "https://yt3.googleusercontent.com/ytc/AIdro_krv40fPSZ2UDcfAgx-mvf86wIm52oBZnuMLiaju9oxvQ=s900-c-k-c0x00ffffff-no-rj",
//             skills: ["Figma", "Illustrator", "Typography", "Branding"]
//         }
//     ];

//     return (
//         <div className="about-container">
//             <div className="about-header">
//                 <Users className="team-icon" size={40} />
//                 <h1>About Us</h1>
//                 <p className="header-description">
//                     "Lorem ipsum dolor sit amet consectetur adipisicing elit. Est ea incidunt impedit unde iusto! Beatae doloremque odio facilis quae. Maxime corporis quisquam, quis corrupti molestiae excepturi illo dignissimos temporibus quia harum accusantium ab doloribus culpa? Velit eaque in veniam similique.
//                     Lorem ipsum dolor, sit amet consectetur adipisicing elit. Illo provident deserunt explicabo est. Porro nihil, quo repellat dolorem cupiditate, accusantium impedit velit a et quos eaque ad. Iste repellat totam facilis quos dignissimos eligendi voluptate sint quod earum? Impedit, fugit".
//                 </p>
//             </div>

//             <h2 className="team-heading">Meet Our Team</h2>

//             <div className="team-section">
//                 {teamMembers.map((member, index) => (
//                     <div key={index} className="team-member">
//                         <img src={member.photo} alt={member.name} className="member-photo" />
//                         <div className="member-content">
//                             <h2>{member.name}</h2>
//                             <h3>{member.role}</h3>
//                             <p>{member.description}</p>

//                             <h4>Skills:</h4>

//                             <ul className="skills-list">
//                                 {member.skills.map((skill, i) => (
//                                     <li key={i} className="skill-item">{skill}</li>
//                                 ))}
//                             </ul>

//                             <div className="social-links">
//                                 <a href={`mailto:${member.email}`} className="social-link">
//                                     <Mail size={20} />
//                                 </a>
//                                 <a href={member.github} target="_blank" rel="noopener noreferrer" className="social-link">
//                                     <FaGithub size={20} />
//                                 </a>
//                                 <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="social-link">
//                                     <Linkedin size={20} />
//                                 </a>
//                             </div>
//                         </div>
//                     </div>
//                 ))}
//             </div>

//             <div className="mission-section">
//                 <h2>Our Mission</h2>
//                 <p>
//                     To deliver innovative and high-quality web solutions that help businesses
//                     grow and succeed in the digital world. We believe in combining creativity
//                     with technical excellence to create meaningful experiences.
//                 </p>
//             </div>
//         </div>
//     );
// };

// export default AboutUs;

import { Users, Mail, Linkedin } from 'lucide-react';
import { FaGithub } from 'react-icons/fa';
import '../style/Aboutus.css';

const AboutUs = () => {
    const teamMembers = [
        {
            name: "Abhay Nathwani",
            role: "Co-Founder & Developer",
            description: "Passionate about creating innovative solutions and building great user experiences.",
            email: "alice@example.com",
            github: "https://github.com/alice",
            linkedin: "https://linkedin.com/in/alice",
            photo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQHHqCdfHbbksZFYPDTOQZUyOIpJNnwfhemGA&s",
            skills: ["React", "Node.js", "CSS", "UI/UX"]
        },
        {
            name: "Krish Mamtora",
            role: "Co-Founder & Designer",
            description: "Creative professional focused on crafting beautiful and intuitive interfaces.",
            email: "bob@example.com",
            github: "https://github.com/bob",
            linkedin: "https://linkedin.com/in/bob",
            photo: "https://yt3.googleusercontent.com/ytc/AIdro_krv40fPSZ2UDcfAgx-mvf86wIm52oBZnuMLiaju9oxvQ=s900-c-k-c0x00ffffff-no-rj",
            skills: ["Figma", "Illustrator", "Typography", "Branding"]
        }
    ];

    return (
        <div className="about-container">
            <div className="about-header">
                <Users className="team-icon" size={40} />
                <h1>About Us</h1>
                <p className="header-description">
                    We are passionate innovators committed to building cutting-edge digital solutions.
                </p>
            </div>
        </div>
    );
};

export default AboutUs;
