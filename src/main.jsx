import React, { Suspense, lazy, useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import Portfolio from './Portfolio'

const BlogPostPage = lazy(() => import('./BlogPostPage'))
const FIRECalculator = lazy(() => import('./FIRECalculator'))
const EstatePlanner = lazy(() => import('./EstatePlanner'))
const CommandCenter = lazy(() => import('./CommandCenter'))

function RouteFallback() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0f',
        color: '#64ffda',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '0.85rem',
        letterSpacing: '0.05em',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      loading…
    </div>
  )
}

function App() {
  const [page, setPage] = useState(window.location.hash);

  useEffect(() => {
    const onHash = () => setPage(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  let routed = null;
  if (page === '#/blog/rebuilding-legacy-pipeline') {
    routed = (
      <BlogPostPage
        onBack={() => {
          window.location.hash = '';
          setPage('');
        }}
      />
    );
  } else if (page === '#/fire') {
    routed = <FIRECalculator />;
  } else if (page === '#/estate') {
    routed = <EstatePlanner />;
  } else if (page === '#/command-center') {
    routed = <CommandCenter />;
  }

  if (routed) {
    return <Suspense fallback={<RouteFallback />}>{routed}</Suspense>;
  }
  return <Portfolio />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
