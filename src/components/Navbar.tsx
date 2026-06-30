export default function Navbar({ onLoginClick }: { onLoginClick: () => void }) {
  return (
    <nav className="bg-white-800 px-4 py-3 relative z-10">
      <div className="container mx-auto flex items-center justify-between">
        <div className="text-base sm:text-lg font-semibold">Bukang Web</div>
        <div className="hidden sm:flex items-center gap-4">
          <a href="#" className="text-gray-700 hover:text-gray-900 text-sm" onClick={() => {}}>Capture</a>
          <a href="#" className="text-gray-700 hover:text-gray-900 text-sm" onClick={() => {}}>Result</a>
        </div>
        <button
          className="bg-blue-500 text-white text-sm sm:text-base px-3 sm:px-4 py-1.5 sm:py-2 rounded hover:bg-blue-600"
          onClick={onLoginClick}
        >
          Login
        </button>
      </div>
    </nav>
  )
}
