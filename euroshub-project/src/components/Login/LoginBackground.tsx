export default function LoginBackground() {
  return (
    <div className="hidden lg:block relative w-0 flex-1">
      <div className="absolute inset-0 bg-gradient-to-br from-teal-600 via-teal-700 to-cyan-800 dark:from-teal-800 dark:via-teal-900 dark:to-cyan-900">
        <div className="absolute inset-0 bg-black/20 dark:bg-black/40"></div>
        
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-white/5 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-white/3 rounded-full blur-2xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-white/7 rounded-full blur-lg animate-pulse delay-500"></div>
        </div>
        
        <div className="relative h-full flex flex-col justify-center items-center text-white p-12">
          <div className="max-w-lg text-center space-y-8">
            {/* Logo placeholder for background */}
            <div className="mx-auto w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-sm">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
            </div>
            
            <div className="space-y-6">
              <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-white to-teal-100 bg-clip-text text-transparent">
                Welcome to EurosHub PM
              </h1>
              <p className="text-xl leading-relaxed opacity-90 text-teal-50">
                Your comprehensive project management solution for seamless collaboration and enhanced productivity.
              </p>
            </div>
            
            {/* Feature highlights */}
            <div className="mt-12 grid grid-cols-1 gap-4 text-left">
              <div className="flex items-center space-x-3 text-teal-100">
                <div className="w-2 h-2 bg-teal-300 rounded-full"></div>
                <span className="text-sm opacity-80">Real-time collaboration tools</span>
              </div>
              <div className="flex items-center space-x-3 text-teal-100">
                <div className="w-2 h-2 bg-teal-300 rounded-full"></div>
                <span className="text-sm opacity-80">Advanced project tracking</span>
              </div>
              <div className="flex items-center space-x-3 text-teal-100">
                <div className="w-2 h-2 bg-teal-300 rounded-full"></div>
                <span className="text-sm opacity-80">Secure team management</span>
              </div>
            </div>
            
            <div className="mt-8">
              <div className="flex justify-center space-x-2">
                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
