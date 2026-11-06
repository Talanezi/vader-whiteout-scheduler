import {setupListeners} from '@reduxjs/toolkit/query';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { setupStore } from 'app/store';
import { Provider } from 'react-redux';
import { ToastProvider } from 'components/Toast';

const store=setupStore();
setupListeners(store.dispatch);
const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </Provider>
  </React.StrictMode>
);
