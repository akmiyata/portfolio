import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import Portfolio from './Portfolio'
import BlogPostPage from './BlogPostPage'
import FIRECalculator from './FIRECalculator'
import EstatePlanner from './EstatePlanner'
import CommandCenter from './CommandCenter'

function App() {
  const [page, setPage] = useState(window.location.hash);

  useEffect(() => {
    const onHash = () => setPage(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (page === '#/blog/rebuilding-legacy-pipeline') {
    return (
      <BlogPostPage
        onBack={() => {
          window.location.hash = '';
          setPage('');
        }}
      />
    );
  }

  if (page === '#/fire') {
    return <FIRECalculator />;
  }

  if (page === '#/estate') {
    return <EstatePlanner />;
  }

  if (page === '#/command-center') {
    return <CommandCenter />;
  }

  return <Portfolio />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
