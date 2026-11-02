import { request } from './client';
import type { SkiCustomer, SkiCustomerCreate, SkiCustomerUpdate } from '../types/customer';

export function createCustomer(payload: SkiCustomerCreate) {
  return request<SkiCustomer>('/ski_customer', 'POST', payload);
}

export function getCustomers(search = '') {
  return request<SkiCustomer[]>(`/ski_customer?q=${encodeURIComponent(search)}`);
}

export function getCustomer(id: string) {
  return request<SkiCustomer>(`/ski_customer/${encodeURIComponent(id)}`);
}

export function uploadCustomerPhoto(id: string, imageBase64: string) {
  return request<SkiCustomer>(`/ski_customer/${encodeURIComponent(id)}/photo`, 'POST', { image_base64: imageBase64 });
}

export function updateCustomer(id: string, payload: SkiCustomerUpdate) {
  return request<SkiCustomer>(`/ski_customer/${encodeURIComponent(id)}`, 'PATCH', payload);
}
