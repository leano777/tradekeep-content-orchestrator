export default function HomePage() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#f0f0f0',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
        🚀 TK Content Orchestrator
      </h1>
      <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>
        Welcome to your content management system
      </p>
      <div style={{ 
        backgroundColor: 'white', 
        padding: '2rem', 
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h2>Quick Links:</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ marginBottom: '0.5rem' }}>
            <a href="/auth" style={{ color: '#0070f3' }}>Login Page</a>
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            <a href="/simple" style={{ color: '#0070f3' }}>Simple Test Page</a>
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            <a href="/test" style={{ color: '#0070f3' }}>Test Page</a>
          </li>
        </ul>
        <hr style={{ margin: '1rem 0' }} />
        <p><strong>Backend API:</strong> http://localhost:9000</p>
        <p><strong>Frontend:</strong> http://localhost:3001</p>
      </div>
    </div>
  );
}