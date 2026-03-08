// Placeholder App shell — routes and screens will be added in subsequent iterations
export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-md">
        {/* Logo mark */}
        <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto">
          <span className="text-white text-2xl font-bold">O</span>
        </div>

        <h1 className="text-3xl font-bold text-gray-900">Orbit</h1>
        <p className="text-gray-500 text-lg">Your money, on autopilot.</p>

        <div className="pt-4 space-y-2">
          <button className="w-full bg-blue-600 text-white rounded-lg py-3 px-6 font-medium hover:bg-blue-700 transition-colors">
            Get started
          </button>
          <button className="w-full border border-gray-200 text-gray-700 rounded-lg py-3 px-6 font-medium hover:bg-gray-50 transition-colors">
            Sign in
          </button>
        </div>

        <p className="text-xs text-gray-400 pt-4">
          MVP scaffold — implementation in progress
        </p>
      </div>
    </div>
  );
}
