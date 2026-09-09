import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import PageWrapper from '../components/PageWrapper';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <PageWrapper>
      <Navbar />
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <div className="glass max-w-md w-full p-10 rounded-3xl shadow-card-lg animate-scale-in">
          <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center text-4xl shadow-glow mx-auto mb-6">
            🔍
          </div>
          <h1 className="text-6xl font-display font-black gradient-text mb-3">404</h1>
          <h2 className="text-2xl font-bold text-white mb-2">Page Not Found</h2>
          <p className="text-white/50 text-sm mb-8">
            The page you are looking for doesn't exist or has been moved.
          </p>
          <button
            onClick={() => navigate('/')}
            className="btn-primary w-full py-3 text-base"
          >
            Back to Home
          </button>
        </div>
      </div>
    </PageWrapper>
  );
};

export default NotFound;