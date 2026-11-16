import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from '@/App';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import '@/index.css';
import { initI18n } from '@/i18n';
import { captureDeskRef } from '@/lib/deskRef';
import { captureAuthToken } from '@/lib/urlAuthToken';

// Read before anything renders. The referral arrives on the first link a
// prospect follows, and a redirect could unmount whatever tried to read it
// later. The CRM token has to be in the cookie before AuthProvider asks
// who is signed in, or the first request goes out anonymous.
captureDeskRef();
captureAuthToken();

// Translations are fetched before the first render, so no screen ever paints
// raw keys. Previously i18n awaited at module scope, which dev tolerated and
// the production build rejected.
initI18n().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ThemeProvider>
        {/* AuthProvider sits inside the router because it navigates when the
            server refuses a session. */}
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </React.StrictMode>
  );
});
