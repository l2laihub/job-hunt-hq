import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './src/lib/supabase';
import { AppWrapper } from './src/components/auth';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <AppWrapper>
        <App />
      </AppWrapper>
    </AuthProvider>
  </React.StrictMode>
);