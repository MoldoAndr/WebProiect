import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';

function SignUpPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('User');
  const { signup } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await signup(name, email, password, role);
      navigate('/dashboard');
    } catch (error) {
      console.error('Signup failed', error);
    }
  }

  return (
    <div 
      className="min-h-screen flex justify-center items-center 
                 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 
                 p-4 transition-colors duration-500"
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 
                   w-full max-w-md transform transition duration-500 hover:scale-105"
      >
        <h2 className="text-3xl text-gray-800 dark:text-gray-100 font-extrabold mb-6">
          Sign Up
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="name" className="font-medium text-gray-700 dark:text-gray-200">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="border border-gray-300 dark:border-gray-700 
                         rounded p-2 focus:outline-none 
                         focus:ring-2 focus:ring-purple-500 
                         transition-colors duration-200"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="font-medium text-gray-700 dark:text-gray-200">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="border border-gray-300 dark:border-gray-700 
                         rounded p-2 focus:outline-none 
                         focus:ring-2 focus:ring-purple-500 
                         transition-colors duration-200"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="font-medium text-gray-700 dark:text-gray-200">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="border border-gray-300 dark:border-gray-700 
                         rounded p-2 focus:outline-none 
                         focus:ring-2 focus:ring-purple-500 
                         transition-colors duration-200"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="role" className="font-medium text-gray-700 dark:text-gray-200">
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={e => setRole(e.target.value)}
              required
              className="border border-gray-300 dark:border-gray-700 
                         rounded p-2 focus:outline-none 
                         focus:ring-2 focus:ring-purple-500 
                         transition-colors duration-200"
            >
              <option value="User">User</option>
              <option value="Administrator">Administrator</option>
              <option value="Technician">Technician</option>
            </select>
          </div>

          <button
            type="submit"
            className="bg-purple-600 text-white rounded py-2 px-4 
                       hover:bg-purple-700 transition-all duration-300 
                       focus:outline-none focus:ring-2 focus:ring-purple-500 
                       font-semibold"
          >
            Sign Up
          </button>
        </form>
      </div>
    </div>
  );
}

export default SignUpPage;