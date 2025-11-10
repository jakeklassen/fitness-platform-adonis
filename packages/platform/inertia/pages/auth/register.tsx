import { Head, useForm } from '@inertiajs/react';

export default function Register() {
  const { data, setData, post, processing, errors } = useForm({
    fullName: '',
    email: '',
    password: '',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    post('/register');
  }

  return (
    <>
      <Head title="Register" />

      <div className="min-h-screen flex items-center justify-center bg-sand-2">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
          <div>
            <h2 className="text-center text-3xl font-bold text-sand-12">Create your account</h2>
            <p className="mt-2 text-center text-sm text-sand-11">
              Already have an account?{' '}
              <a href="/login" className="font-medium text-primary hover:opacity-80">
                Sign in
              </a>
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-sand-12">
                  Full Name (optional)
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={data.fullName}
                  onChange={(e) => setData('fullName', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-sand-7 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                />
                {errors.fullName && <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-sand-12">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={data.email}
                  onChange={(e) => setData('email', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-sand-7 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-sand-12">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={data.password}
                  onChange={(e) => setData('password', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-sand-7 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                />
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={processing}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
              >
                {processing ? 'Creating account...' : 'Create account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
