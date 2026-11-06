import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from 'app/store';

export const emptyApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    timeout: 20000,
    baseUrl: process.env.REACT_APP_API_BASE_URL || (process.env.NODE_ENV==='production'?'https://scheduler-api.vaderwhiteout.com':'/'),
    prepareHeaders: (headers, {getState}) => {
      // Adapted from
      // https://github.com/reduxjs/redux-toolkit/blob/master/examples/query/react/authentication/src/app/services/auth.ts
      const token = (getState() as RootState).authentication.token;
      if (token && !headers.has('authorization')) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  endpoints: builder => ({}),
});
