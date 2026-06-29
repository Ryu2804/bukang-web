export default function Navbar() {
  return (
    <nav className="bg-white-800 p-4">
      <div className="container mx-auto flex items-center justify-between">
        <div className="text-lg font-semibold">Bukang Web</div>
        <div className="space-x-4">
          <a href="#" className="text-gray-700 hover:text-gray-900">Capture</a>
          <a href="#" className="text-gray-700 hover:text-gray-900">Result</a>
        </div>
        <div className="space-x-4">
          <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Login</button>
        </div>
      </div>
    </nav>
  )
}
