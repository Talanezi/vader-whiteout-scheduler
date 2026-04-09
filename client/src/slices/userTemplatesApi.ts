import { api } from './api';

export type TemplateSlot = {
  weekday: number;
  hour: number;
  minute: number;
};

export type UserTemplateResponse = {
  id: string;
  name: string;
  slots: TemplateSlot[];
  createdAt: string;
  updatedAt: string;
};

export const userTemplatesApi = api.injectEndpoints({
  endpoints: (build) => ({
    getMyTemplates: build.query<UserTemplateResponse[], void>({
      query: () => '/api/me/templates',
    }),
    createMyTemplate: build.mutation<
      UserTemplateResponse,
      { name: string; slots: TemplateSlot[] }
    >({
      query: (body) => ({
        url: '/api/me/templates',
        method: 'POST',
        body,
      }),
    }),
    updateMyTemplate: build.mutation<
      UserTemplateResponse,
      { id: string; name?: string; slots?: TemplateSlot[] }
    >({
      query: ({ id, ...body }) => ({
        url: `/api/me/templates/${id}`,
        method: 'PATCH',
        body,
      }),
    }),
    deleteMyTemplate: build.mutation<{ ok: true }, { id: string }>({
      query: ({ id }) => ({
        url: `/api/me/templates/${id}`,
        method: 'DELETE',
      }),
    }),
  }),
});

export const {
  useGetMyTemplatesQuery,
  useCreateMyTemplateMutation,
  useUpdateMyTemplateMutation,
  useDeleteMyTemplateMutation,
} = userTemplatesApi;
