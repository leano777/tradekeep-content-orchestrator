export default function SimplePage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Simple Test Page</h1>
      <p>If you can see this, Next.js is working!</p>
      <hr />
      <h2>Application URLs:</h2>
      <ul>
        <li>Frontend: http://localhost:3001</li>
        <li>Backend API: http://localhost:9000</li>
      </ul>
    </div>
  );
}