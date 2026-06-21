/**
 * Authenticated fetch helpers for machinery-financial API.
 */
export function useFinancialApi(authStore, selectedBarangayIdRef, isAdminFn) {
  const authHeaders = (withJson = false) => {
    const token = authStore.token || localStorage.getItem('token');
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (withJson) headers['Content-Type'] = 'application/json';
    return headers;
  };

  const buildParams = (extra = {}) => {
    const params = new URLSearchParams();
    Object.entries(extra).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    });
    if (authStore.currentUser?.id) {
      params.set('user_id', String(authStore.currentUser.id));
    }
    if (isAdminFn?.() && selectedBarangayIdRef?.value) {
      params.set('barangay_id', String(selectedBarangayIdRef.value));
    }
    return params;
  };

  const financialGet = (path, extraParams = {}) =>
    fetch(`${path}?${buildParams(extraParams)}`, { headers: authHeaders() });

  const financialPost = (path, body = {}) =>
    fetch(path, {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({ user_id: authStore.currentUser?.id, ...body })
    });

  const financialPut = (path, body = {}) =>
    fetch(path, {
      method: 'PUT',
      headers: authHeaders(true),
      body: JSON.stringify({ user_id: authStore.currentUser?.id, ...body })
    });

  const financialDelete = (path, body = {}) =>
    fetch(path, {
      method: 'DELETE',
      headers: authHeaders(true),
      body: JSON.stringify({ user_id: authStore.currentUser?.id, ...body })
    });

  return { authHeaders, buildParams, financialGet, financialPost, financialPut, financialDelete };
}
