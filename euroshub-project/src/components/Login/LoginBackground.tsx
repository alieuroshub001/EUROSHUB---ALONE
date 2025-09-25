export default function LoginBackground() {
  return (
    <div className="hidden lg:block relative w-0 flex-1">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative h-full flex flex-col justify-center items-center text-white p-12">
          <div className="max-w-md text-center">
            <h1 className="text-4xl font-bold mb-6">Welcome to EurosHub PM</h1>
            <p className="text-xl leading-relaxed opacity-90">
              Your comprehensive project management solution for seamless collaboration and productivity.
            </p>
            <div className="mt-8">
              <div className="flex justify-center space-x-4">
                <div className="w-3 h-3 bg-white rounded-full opacity-50"></div>
                <div className="w-3 h-3 bg-white rounded-full"></div>
                <div className="w-3 h-3 bg-white rounded-full opacity-50"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}