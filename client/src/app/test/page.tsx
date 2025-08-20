export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <h1 className="text-4xl font-bold text-white">Test Page</h1>
      <p className="text-gray-400 mt-4">If you can see this, Next.js is working!</p>
      <div className="mt-8 p-6 bg-gray-800 rounded-lg">
        <h2 className="text-2xl text-blue-400">Tailwind Test</h2>
        <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Test Button
        </button>
      </div>
    </div>
  );
}