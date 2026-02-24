import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import LoginForm from '@/components/auth/LoginForm';

export default async function LoginPage() {
  const session = await auth();

  if (session) {
    redirect('/tasks');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 sm:px-6 lg:px-8">
      <LoginForm />
    </div>
  );
}
