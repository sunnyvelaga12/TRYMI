import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUser, FaMapMarkerAlt, FaEnvelope, FaPhone, FaFire } from 'react-icons/fa';

const About = () => {
  const [hoveredSection, setHoveredSection] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const toggleMenu = () => setMenuOpen(!menuOpen);
  const closeMenu = () => setMenuOpen(false);

  const styles = {
    page: {
      fontFamily: "'Cormorant Garamond', 'Georgia', serif",
      backgroundColor: '#FAFAFA',
      margin: 0,
      padding: 0,
    },
    topBanner: {
      backgroundColor: '#000000',
      color: '#FFFFFF',
      padding: '10px 60px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '11px',
      letterSpacing: '1.8px',
      fontWeight: '300',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
    },
    bannerLeft: {
      display: 'flex',
      gap: '40px',
    },
    bannerLink: {
      color: '#FFFFFF',
      textDecoration: 'none',
      transition: 'opacity 0.3s ease',
      textTransform: 'uppercase',
    },
    navbar: {
      backgroundColor: 'rgba(255,255,255,0.98)',
      padding: '20px 60px',
      borderBottom: '1px solid #E8E8E8',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backdropFilter: 'blur(20px)',
    },
    navContainer: {
      maxWidth: '1600px',
      margin: '0 auto',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    logo: {
      fontSize: '32px',
      fontWeight: '300',
      color: '#000000',
      letterSpacing: '8px',
      margin: 0,
      transition: 'letter-spacing 0.4s ease',
    },
    navMenu: {
      display: 'flex',
      listStyle: 'none',
      gap: '40px',
      margin: 0,
      padding: 0,
    },
    navLink: {
      textDecoration: 'none',
      color: '#4A4A4A',
      fontSize: '12px',
      fontWeight: '400',
      letterSpacing: '2px',
      textTransform: 'uppercase',
      transition: 'color 0.3s ease',
    },
    navLinkActive: {
      textDecoration: 'none',
      color: '#000000',
      fontSize: '12px',
      fontWeight: '500',
      letterSpacing: '2px',
      textTransform: 'uppercase',
    },
    heroSection: {
      background: 'linear-gradient(180deg, #FFFFFF 0%, #F5F5F5 100%)',
      padding: '120px 60px',
      textAlign: 'center',
      borderBottom: '1px solid #E8E8E8',
    },
    heroTitle: {
      fontSize: '72px',
      fontWeight: '300',
      color: '#000000',
      letterSpacing: '-1px',
      marginBottom: '25px',
      lineHeight: '1',
    },
    heroSubtitle: {
      fontSize: '16px',
      color: '#666666',
      letterSpacing: '3px',
      textTransform: 'uppercase',
      fontWeight: '300',
    },
    mainContent: {
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '100px 60px',
    },
    storySection: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '100px',
      marginBottom: '150px',
      alignItems: 'center',
    },
    storyImage: {
      width: '100%',
      height: '600px',
      objectFit: 'cover',
      filter: 'grayscale(20%)',
    },
    storyContent: {
      maxWidth: '500px',
    },
    sectionLabel: {
      fontSize: '11px',
      letterSpacing: '3px',
      textTransform: 'uppercase',
      color: '#999999',
      marginBottom: '30px',
      display: 'block',
    },
    sectionTitle: {
      fontSize: '42px',
      fontWeight: '300',
      color: '#000000',
      letterSpacing: '-1px',
      marginBottom: '30px',
      lineHeight: '1.2',
    },
    sectionText: {
      fontSize: '15px',
      color: '#666666',
      lineHeight: '1.9',
      letterSpacing: '0.3px',
      marginBottom: '20px',
    },
    valuesSection: {
      backgroundColor: '#FFFFFF',
      padding: '100px 0',
      borderTop: '1px solid #E8E8E8',
      borderBottom: '1px solid #E8E8E8',
    },
    valuesGrid: {
      maxWidth: '1400px',
      margin: '60px auto 0',
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '2px',
      backgroundColor: '#E8E8E8',
    },
    valueCard: {
      backgroundColor: '#FAFAFA',
      padding: '80px 50px',
      textAlign: 'center',
      transition: 'background-color 0.3s ease',
    },
    valueIcon: {
      fontSize: '36px',
      marginBottom: '30px',
    },
    valueTitle: {
      fontSize: '18px',
      fontWeight: '500',
      letterSpacing: '2px',
      textTransform: 'uppercase',
      marginBottom: '20px',
      color: '#000000',
    },
    valueText: {
      fontSize: '14px',
      color: '#666666',
      lineHeight: '1.8',
      letterSpacing: '0.5px',
    },
    manifestoSection: {
      maxWidth: '900px',
      margin: '150px auto',
      textAlign: 'center',
    },
    manifestoQuote: {
      fontSize: '32px',
      fontWeight: '300',
      color: '#000000',
      lineHeight: '1.6',
      fontStyle: 'italic',
      marginBottom: '40px',
      letterSpacing: '0.5px',
    },
    manifestoAuthor: {
      fontSize: '13px',
      letterSpacing: '2px',
      textTransform: 'uppercase',
      color: '#999999',
    },
    teamSection: {
      backgroundColor: '#FFFFFF',
      padding: '100px 60px',
      borderTop: '1px solid #E8E8E8',
    },
    teamContent: {
      maxWidth: '1400px',
      margin: '0 auto',
      textAlign: 'center',
    },
    teamGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '60px',
      marginTop: '80px',
    },
    teamCard: {
      textAlign: 'center',
    },
    teamImage: {
      width: '250px',
      height: '250px',
      borderRadius: '50%',
      objectFit: 'cover',
      objectPosition: 'center 15%', // Adjusted to show face clearly
      marginBottom: '30px',
      filter: 'grayscale(100%)',
      border: '1px solid #E8E8E8',
      boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
      transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
      cursor: 'pointer',
    },
    teamImageHover: {
      filter: 'grayscale(0%)',
      transform: 'scale(1.03)',
      boxShadow: '0 15px 45px rgba(0,0,0,0.1)',
    },
    teamName: {
      fontSize: '24px',
      fontWeight: '300',
      letterSpacing: '2px',
      color: '#000000',
      marginBottom: '8px',
      textTransform: 'uppercase',
    },
    teamRole: {
      fontSize: '11px',
      letterSpacing: '3px',
      textTransform: 'uppercase',
      color: '#999999',
      marginBottom: '20px',
      fontWeight: '400',
    },
    teamEmail: {
      fontSize: '12px',
      color: '#666666',
      textDecoration: 'none',
      letterSpacing: '1px',
      transition: 'color 0.3s ease',
      borderBottom: '1px solid transparent',
    },
    teamEmailHover: {
      color: '#000000',
      borderBottom: '1px solid #000000',
    },
    footer: {
      backgroundColor: '#000000',
      color: '#FFFFFF',
      padding: '100px 60px 40px',
    },
    footerContent: {
      maxWidth: '1400px',
      margin: '0 auto',
    },
    footerGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '80px',
      marginBottom: '100px',
      paddingBottom: '60px',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
    },
    footerSection: {
      color: '#E5E5E5',
    },
    footerTitle: {
      fontSize: '12px',
      fontWeight: '500',
      letterSpacing: '3px',
      textTransform: 'uppercase',
      marginBottom: '35px',
      color: '#FFFFFF',
    },
    footerText: {
      fontSize: '13px',
      lineHeight: '2',
      color: '#A0A0A0',
      letterSpacing: '0.5px',
      marginBottom: '15px',
      fontWeight: '300',
    },
    footerLink: {
      color: '#A0A0A0',
      textDecoration: 'none',
      fontSize: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '15px',
      transition: 'all 0.3s ease',
      letterSpacing: '1px',
    },
    footerBottom: {
      textAlign: 'center',
      paddingTop: '40px',
    },
    socialLinks: {
      display: 'flex',
      justifyContent: 'center',
      gap: '50px',
      marginBottom: '40px',
    },
    socialLink: {
      color: '#666666',
      fontSize: '11px',
      letterSpacing: '2px',
      textTransform: 'uppercase',
      textDecoration: 'none',
      transition: 'color 0.3s ease',
    },
    copyright: {
      fontSize: '10px',
      letterSpacing: '2px',
      textTransform: 'uppercase',
      color: '#444444',
      marginTop: '20px',
    },
  };

  return (
    <div style={styles.page}>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&display=swap');

          * {
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }

          ::selection {
            background-color: #000000;
            color: #FFFFFF;
          }

          @keyframes navBounce {
            0% { transform: translateY(0) scale(1); }
            100% { transform: translateY(-3px) scale(1.1); }
          }
          @media (max-width: 768px) {
            .nav-menu { display: none !important; }
            .nav-menu.active {
              display: flex !important; flex-direction: column !important; position: absolute !important;
              top: 100% !important; left: 0 !important; width: 100% !important; background: white !important;
              padding: 20px !important; box-shadow: 0 4px 6px rgba(0,0,0,0.1) !important;
              z-index: 100 !important; align-items: flex-start !important; gap: 15px !important;
            }
            .nav-menu.active li { width: 100% !important; border-bottom: 1px solid #f0f0f0 !important; padding: 10px 0 !important; }
            .nav-toggle-btn { display: block !important; background: transparent !important; border: none !important;
              font-size: 24px !important; cursor: pointer !important; color: #1a1a1a !important; margin-left: auto; }
            .navbar-container { flex-direction: row !important; width: 100% !important; }
            .hero-section { padding: 60px 20px !important; }
            .hero-title { font-size: 42px !important; }
            .hero-subtitle { font-size: 13px !important; }
            .story-section { grid-template-columns: 1fr !important; gap: 40px !important; margin-bottom: 60px !important; text-align: center; direction: ltr !important; }
            .story-image { height: 300px !important; }
            .values-grid { grid-template-columns: 1fr !important; }
            .value-card { padding: 40px 20px !important; }
            .team-grid { grid-template-columns: 1fr !important; margin-top: 40px !important; }
            .team-image { width: 150px !important; height: 150px !important; }
            .footer-grid { grid-template-columns: 1fr !important; gap: 40px !important; text-align: center; }
            .contact-section { align-items: center !important; }
            .contact-section a { justify-content: center !important; }
            .social-links { gap: 20px !important; }
            .top-banner { display: none !important; }
          }
        `}
      </style>

      {/* Top Banner */}
      <div style={styles.topBanner} className="top-banner">
        <div style={styles.bannerLeft}>
          <a
            href="#"
            style={styles.bannerLink}
            onMouseEnter={(e) => e.target.style.opacity = '0.6'}
            onMouseLeave={(e) => e.target.style.opacity = '1'}
          >
            TRYMI
          </a>
          <button
            style={{ ...styles.bannerLink, background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => navigate("/profile", { state: { activeTab: "feedback" } })}
            onMouseEnter={(e) => e.target.style.opacity = '0.6'}
            onMouseLeave={(e) => e.target.style.opacity = '1'}
          >
            Drop Feedback!
          </button>
        </div>
        <div style={{ display: 'flex', gap: '30px' }}>
          <button
            onClick={() => {
              setShowUserMenu(false);
              navigate("/profile");
            }}
            style={{ ...styles.bannerLink, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <FaUser style={{ fontSize: '10px' }} /> Account
          </button>

        </div>
      </div>

      {/* Navbar */}
      <nav style={styles.navbar} className="navbar">
        <div style={styles.navContainer} className="navbar-container">
          <h1
            style={styles.logo}
            className="logo"
            onMouseEnter={(e) => e.target.style.letterSpacing = '12px'}
            onMouseLeave={(e) => e.target.style.letterSpacing = '8px'}
          >
            TRYMI
          </h1>

          <button 
            className="nav-toggle-btn"
            onClick={toggleMenu}
            style={{ display: 'none' }}
          >
            ☰
          </button>

          <ul style={styles.navMenu} className={`nav-menu ${menuOpen ? "active" : ""}`}>
            <li>
              <Link
                to="/outfit-predictor"
                style={styles.navLink}
                onClick={closeMenu}
                onMouseEnter={(e) => e.target.style.color = '#000000'}
                onMouseLeave={(e) => e.target.style.color = '#4A4A4A'}
              >
                Home
              </Link>
            </li>
            <li>
              <Link to="/about" style={styles.navLinkActive} onClick={closeMenu}>About</Link>
            </li>
            {['Collections', 'Virtual Try', 'Studio'].map((item, index) => (
              <li key={index} style={{ position: 'relative' }}>
                <Link
                  to={`/${item.toLowerCase().replace(' ', '-')}`}
                  style={styles.navLink}
                  onClick={closeMenu}
                  onMouseEnter={(e) => e.target.style.color = '#000000'}
                  onMouseLeave={(e) => e.target.style.color = '#4A4A4A'}
                >
                  {item}
                  {item === 'Studio' && (
                    <span style={{
                      position: 'absolute',
                      top: '-12px',
                      right: '-15px',
                      color: '#FF4444',
                      fontSize: '12px',
                      animation: 'navBounce 0.8s infinite alternate ease-in-out',
                      display: 'flex',
                      alignItems: 'center',
                    }}>
                      <FaFire />
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={styles.heroSection} className="hero-section">
        <h1 style={styles.heroTitle} className="hero-title">Our Story</h1>
        <p style={styles.heroSubtitle} className="hero-subtitle">Where Technology Meets Timeless Style</p>
      </section>

      {/* Main Content */}
      <main style={styles.mainContent}>
        {/* Story Section */}
        <div style={styles.storySection} className="story-section">
          <img
            src="https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=700&h=600&fit=crop"
            alt="TRYMI Fashion"
            style={styles.storyImage}
            className="story-image"
          />
          <div style={styles.storyContent}>
            <span style={styles.sectionLabel}>Our Beginning</span>
            <h2 style={styles.sectionTitle}>The Vision Behind TRYMI</h2>
            <p style={styles.sectionText}>
              TRYMI was born from a singular vision: to revolutionize the way individuals experience fashion through the seamless integration of artificial intelligence and timeless design principles.
            </p>
            <p style={styles.sectionText}>
              We recognized a fundamental disconnect between the rapid evolution of technology and the intimate, personal nature of style. Our mission became clear—to bridge this gap, creating an experience that honors individual expression while leveraging cutting-edge innovation.
            </p>
          </div>
        </div>

        {/* Reversed Story Section */}
        <div style={{ ...styles.storySection, gridTemplateColumns: '1fr 1fr', direction: 'rtl' }} className="story-section">
          <img
            src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=700&h=600&fit=crop"
            alt="Craftsmanship"
            style={styles.storyImage}
            className="story-image"
          />
          <div style={{ ...styles.storyContent, direction: 'ltr' }}>
            <span style={styles.sectionLabel}>Our Approach</span>
            <h2 style={styles.sectionTitle}>Intelligence Meets Elegance</h2>
            <p style={styles.sectionText}>
              Each recommendation, every suggestion, is meticulously crafted through sophisticated algorithms that understand not just trends, but the nuanced language of personal style.
            </p>
            <p style={styles.sectionText}>
              TRYMI doesn't simply predict outfits—we curate experiences. Our platform learns, adapts, and evolves with each interaction, ensuring that the relationship between technology and taste remains as refined as the garments themselves.
            </p>
          </div>
        </div>
      </main>

      {/* Values Section */}
      <section style={styles.valuesSection}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <span style={styles.sectionLabel}>Our Principles</span>
          <h2 style={{ ...styles.sectionTitle, textAlign: 'center' }}>What Defines Us</h2>
        </div>

        <div style={styles.valuesGrid} className="values-grid">
          {[
            {
              icon: '✦',
              title: 'Precision',
              text: 'Every algorithmic decision reflects meticulous attention to detail and unwavering commitment to accuracy.'
            },
            {
              icon: '◆',
              title: 'Innovation',
              text: 'Pioneering the intersection of artificial intelligence and haute couture with groundbreaking technology.'
            },
            {
              icon: '◇',
              title: 'Elegance',
              text: 'Maintaining timeless sophistication in every interaction, recommendation, and visual presentation.'
            }
          ].map((value, index) => (
            <div
              key={index}
              style={{
                ...styles.valueCard,
                backgroundColor: hoveredSection === index ? '#FFFFFF' : '#FAFAFA'
              }}
              className="value-card"
              onMouseEnter={() => setHoveredSection(index)}
              onMouseLeave={() => setHoveredSection(null)}
            >
              <div style={styles.valueIcon}>{value.icon}</div>
              <h3 style={styles.valueTitle}>{value.title}</h3>
              <p style={styles.valueText}>{value.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Manifesto Section */}
      <section style={styles.manifestoSection}>
        <p style={styles.manifestoQuote}>
          "Fashion transcends mere garments. It is the silent language through which we communicate our innermost selves to the world."
        </p>
        <span style={styles.manifestoAuthor}>— The TRYMI Philosophy</span>
      </section>

      {/* Team Section */}
      <section style={styles.teamSection}>
        <div style={styles.teamContent}>
          <span style={styles.sectionLabel}>Our Visionaries</span>
          <h2 style={{ ...styles.sectionTitle, textAlign: 'center' }}>The Minds Behind TRYMI</h2>

          <div style={styles.teamGrid} className="team-grid">
            <div style={styles.teamCard}>
              <img
                src="/sai-chandu.jpg"
                alt="Sai Chandu Velaga"
                style={styles.teamImage}
                className="team-image"
                onMouseEnter={(e) => {
                  Object.assign(e.currentTarget.style, styles.teamImageHover);
                }}
                onMouseLeave={(e) => {
                  Object.assign(e.currentTarget.style, styles.teamImage);
                }}
              />
              <h3 style={styles.teamName}>Sai Chandu Velaga</h3>
              <p style={styles.teamRole}>Founder & Creative Director</p>
              <a
                href="mailto:sunnyvelaga219@gmail.com"
                style={styles.teamEmail}
                onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.teamEmailHover)}
                onMouseLeave={(e) => Object.assign(e.currentTarget.style, styles.teamEmail)}
              >
                sunnyvelaga219@gmail.com
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer} className="footer">
        <div style={styles.footerContent}>
          <div style={styles.footerGrid} className="footer-grid">
            <div style={styles.footerSection} className="contact-section">
              <h4 style={styles.footerTitle}>Contact</h4>
              <a
                href="mailto:trymi@fashion.com"
                style={styles.footerLink}
                onMouseEnter={(e) => e.target.style.color = '#FFFFFF'}
                onMouseLeave={(e) => e.target.style.color = '#A0A0A0'}
              >
                <FaEnvelope /> trymi@fashion.com
              </a>
              <a
                href="tel:+91xxxxxxxxxx"
                style={styles.footerLink}
                onMouseEnter={(e) => e.target.style.color = '#FFFFFF'}
                onMouseLeave={(e) => e.target.style.color = '#A0A0A0'}
              >
                <FaPhone /> +91 XXXXXXXXXX
              </a>
            </div>

            <div style={styles.footerSection}>
              <h4 style={styles.footerTitle}>Services</h4>
              <p style={styles.footerText}>
                AI-Powered Style Consultation
              </p>
              <p style={styles.footerText}>
                Virtual Try-On Technology
              </p>
              <p style={styles.footerText}>
                Personal Wardrobe Curation
              </p>
            </div>

            <div style={styles.footerSection}>
              <h4 style={styles.footerTitle}>Philosophy</h4>
              <p style={styles.footerText}>
                TRYMI represents the convergence of technological innovation and sartorial excellence, offering bespoke experiences for the modern connoisseur.
              </p>
            </div>
          </div>

          <div style={styles.footerBottom}>
            <div style={styles.socialLinks} className="social-links">
              {['Instagram', 'Twitter', 'LinkedIn'].map((platform, index) => (
                <a
                  key={index}
                  href="#"
                  style={styles.socialLink}
                  onMouseEnter={(e) => e.target.style.color = '#FFFFFF'}
                  onMouseLeave={(e) => e.target.style.color = '#666666'}
                >
                  {platform}
                </a>
              ))}
            </div>
            <p style={styles.copyright}>A PERSONAL CREATIVE VISION BY SAI CHANDU VELAGA</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default About;


