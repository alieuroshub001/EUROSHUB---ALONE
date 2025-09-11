import LoginForm from '@/components/Login/LoginForm';
import LoginBackground from '@/components/Login/LoginBackground';

export default function Home() {
  return (
    <div className="min-h-screen flex">
      <LoginBackground />
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <LoginForm />
      </div>
    </div>
  );
}
