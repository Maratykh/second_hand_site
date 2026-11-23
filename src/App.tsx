import React, { useCallback, useEffect, useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Footer } from './components/Footer';
import { Header, type AppRoute } from './components/Header';
import { StoreProvider, useStore } from './context/StoreContext';
import { AboutPage } from './pages/AboutPage';
import { AdminPage } from './pages/AdminPage';
import { CartPage } from './pages/CartPage';
import { CatalogPage } from './pages/CatalogPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { FittingsPage } from './pages/FittingsPage';
import { HomePage } from './pages/HomePage';
import { ProductDetailPage } from './pages/ProductDetailPage';

function parseHashToRoute(): AppRoute {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [pathPart, queryPart] = raw.split('?');
  const segments = pathPart.split('/').filter(Boolean);

  if (segments.length === 0) return { page: 'home' };
  const [first, second] = segments;

  if (first === 'catalog') {
    const params = new URLSearchParams(queryPart || '');
    return { page: 'catalog', category: params.get('category') || undefined };
  }
  if (first === 'product' && second) {
    return { page: 'product', productId: decodeURIComponent(second) };
  }
  if (first === 'fittings') {
    const params = new URLSearchParams(queryPart || '');
    const tab = params.get('tab') === 'favorites' ? 'favorites' : 'fittings';
    return { page: 'fittings', tab };
  }
  if (first === 'favorites') return { page: 'fittings', tab: 'favorites' };
  if (first === 'cart') return { page: 'cart' };
  if (first === 'checkout') return { page: 'checkout' };
  if (first === 'about') return { page: 'about' };
  if (first === 'admin') return { page: 'admin' };
  return { page: 'home' };
}

function routeToHash(route: AppRoute): string {
  switch (route.page) {
    case 'home':
      return '#/';
    case 'catalog':
      return route.category
        ? `#/catalog?category=${encodeURIComponent(route.category)}`
        : '#/catalog';
    case 'product':
      return `#/product/${encodeURIComponent(route.productId)}`;
    case 'fittings':
      return route.tab === 'favorites' ? '#/fittings?tab=favorites' : '#/fittings';
    case 'cart':
      return '#/cart';
    case 'checkout':
      return '#/checkout';
    case 'about':
      return '#/about';
    case 'admin':
      return '#/admin';
  }
}

const AppShell: React.FC = () => {
  const [route, setRoute] = useState<AppRoute>(() => parseHashToRoute());
  const { toastMessage } = useStore();

  useEffect(() => {
    const onHashChange = () => {
      setRoute(parseHashToRoute());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [route]);

  const navigate = useCallback((next: AppRoute) => {
    const targetHash = routeToHash(next);
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    } else {
      setRoute(next);
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#09090B] text-[#F4F4F5]">
      <Header currentPage={route.page} onNavigate={navigate} />

      <main className="flex-1">
        {route.page === 'home' && <HomePage onNavigate={navigate} />}
        {route.page === 'catalog' && (
          <CatalogPage
            key={route.category || 'all'}
            initialCategory={route.category}
            onNavigate={navigate}
          />
        )}
        {route.page === 'product' && (
          <ProductDetailPage productId={route.productId} onNavigate={navigate} />
        )}
        {route.page === 'fittings' && (
          <FittingsPage
            key={route.tab || 'fittings'}
            initialTab={route.tab}
            onNavigate={navigate}
          />
        )}
        {route.page === 'cart' && <CartPage onNavigate={navigate} />}
        {route.page === 'checkout' && <CheckoutPage onNavigate={navigate} />}
        {route.page === 'about' && <AboutPage />}
        {route.page === 'admin' && <AdminPage />}
      </main>

      <Footer onNavigate={navigate} />

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 max-w-sm bg-[#18181B] border border-[#A3E635] text-zinc-100 px-4 py-3 text-xs font-medium shadow-xl"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <AppShell />
      </StoreProvider>
    </ErrorBoundary>
  );
}
