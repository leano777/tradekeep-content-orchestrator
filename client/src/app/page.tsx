export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">TradeKeep Content Orchestrator</h1>
        <p className="text-xl text-gray-400 mb-8">Content management system ready</p>
        <div className="space-y-4">
          <a 
            href="/content/create" 
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Create Content
          </a>
          <br />
          <a 
            href="/assets" 
            className="inline-block bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Manage Assets
          </a>
        </div>
      </div>
    </div>
  );
}