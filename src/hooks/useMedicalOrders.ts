/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { MedicalOrder, OrderStatus, SystemUser, UserRole } from '../types';

export function useMedicalOrders() {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('mi-receta-jwt') || null;
  });

  const [currentUser, setCurrentUser] = useState<SystemUser | null>(() => {
    const saved = localStorage.getItem('mi-receta-user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [orders, setOrders] = useState<MedicalOrder[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Derive activeRole and currentPatientDni from authenticated session
  const activeRole: UserRole = currentUser?.role || 'paciente';
  const currentPatientDni = currentUser?.role === 'paciente' ? currentUser.identifier : '';

  // Header helpers
  const fetchHeaders = () => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  // Check backend session validation on startup
  useEffect(() => {
    if (token) {
      setIsLoading(true);
      fetch('/api/auth/me', { headers: fetchHeaders() })
        .then(async (res) => {
          if (!res.ok) {
            throw new Error('Sesión expirada o inválida');
          }
          const userData = await res.json();
          setCurrentUser(userData);
          localStorage.setItem('mi-receta-user', JSON.stringify(userData));
        })
        .catch(() => {
          // session expired
          logout();
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [token]);

  // Synchronize orders and users whenever token or role changes
  useEffect(() => {
    if (!token) {
      setOrders([]);
      setUsers([]);
      return;
    }

    const headers = fetchHeaders();

    // Fetch orders
    fetch('/api/orders', { headers })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Error al cargar órdenes');
      })
      .then((data) => setOrders(data))
      .catch((err) => console.error(err));

    // Fetch users (if admin, superadmin, medico or colaborador)
    if (currentUser?.role === 'admin' || currentUser?.role === 'superadmin' || currentUser?.role === 'medico' || currentUser?.role === 'colaborador') {
      fetch('/api/users', { headers })
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error('Error al cargar usuarios');
        })
        .then((data) => setUsers(data))
        .catch((err) => console.error(err));
    }
  }, [token, currentUser?.role]);

  // Handle Authentication login
  const login = async (identifier: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error de credenciales');
      }

      setToken(data.token);
      setCurrentUser(data.user);
      localStorage.setItem('mi-receta-jwt', data.token);
      localStorage.setItem('mi-receta-user', JSON.stringify(data.user));
      return { success: true };
    } catch (err: any) {
      const errorStr = err.message || 'Error al conectar con el servidor';
      setErrorMsg(errorStr);
      return { success: false, error: errorStr };
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Authentication registration
  const register = async (userData: any): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error en el registro');
      }

      setToken(data.token);
      setCurrentUser(data.user);
      localStorage.setItem('mi-receta-jwt', data.token);
      localStorage.setItem('mi-receta-user', JSON.stringify(data.user));
      return { success: true };
    } catch (err: any) {
      const errorStr = err.message || 'Error al registrarse';
      setErrorMsg(errorStr);
      return { success: false, error: errorStr };
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Authentication forgot password
  const forgotPassword = async (identifier: string, email: string): Promise<{ success: boolean; data?: any; error?: string }> => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error en recuperación');
      }

      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Authentication logout
  const logout = () => {
    setToken(null);
    setCurrentUser(null);
    setOrders([]);
    setUsers([]);
    localStorage.removeItem('mi-receta-jwt');
    localStorage.removeItem('mi-receta-user');
  };

  const refreshOrders = () => {
    if (!token) return;
    fetch('/api/orders', { headers: fetchHeaders() })
      .then((res) => res.ok && res.json())
      .then((data) => data && setOrders(data))
      .catch((err) => console.error(err));
  };

  const refreshUsers = () => {
    if (!token || (currentUser?.role !== 'admin' && currentUser?.role !== 'superadmin' && currentUser?.role !== 'medico')) return;
    fetch('/api/users', { headers: fetchHeaders() })
      .then((res) => res.ok && res.json())
      .then((data) => data && setUsers(data))
      .catch((err) => console.error(err));
  };

  // Create a new medical request order
  const createOrder = async (orderData: any): Promise<string> => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: fetchHeaders(),
      body: JSON.stringify(orderData),
    });
    
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Error al guardar la solicitud en el servidor. Verifique su conexión o autenticación.');
    }
    
    const newOrder = await res.json();
    
    // Update state locally and trigger bg refresh
    setOrders((prev) => [newOrder, ...prev]);
    return newOrder.id;
  };

  // Update photos on order
  const updateOrderPhotos = async (
    orderId: string,
    updates: Partial<Pick<MedicalOrder, 'medicationPhotoUrl' | 'medicationPhotoName' | 'paymentReceiptUrl' | 'paymentReceiptName'>>
  ) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: fetchHeaders(),
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update order status/notes (doctor)
  const updateOrderStatus = async (
    orderId: string,
    newStatus: OrderStatus,
    doctorNotes?: string,
    recipePdfUrl?: string,
    recipePdfName?: string
  ) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: fetchHeaders(),
        body: JSON.stringify({
          status: newStatus,
          doctorNotes,
          recipePdfUrl,
          recipePdfName,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Resend recipe link via WhatsApp, Email, or Both
  const sendRecipeLink = async (
    orderId: string,
    channel: 'whatsapp' | 'email' | 'both'
  ): Promise<{
    success: boolean;
    channel: 'whatsapp' | 'email' | 'both';
    whatsapp?: { success: boolean; error?: string };
    email?: { success: boolean; error?: string };
    message: string;
  }> => {
    try {
      const res = await fetch(`/api/orders/${orderId}/send-link`, {
        method: 'POST',
        headers: fetchHeaders(),
        body: JSON.stringify({ channel }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al enviar el link de la receta.');
      }
      return data;
    } catch (err: any) {
      console.error('Error enviando link de receta:', err);
      return {
        success: false,
        channel,
        message: err.message || 'Error de conexión al enviar el enlace.',
      };
    }
  };

  // Delete/Cancel medical order
  const deleteOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
        headers: fetchHeaders(),
      });
      if (res.ok) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create user (Admin)
  const createUser = async (userData: Omit<SystemUser, 'id'>): Promise<string> => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: fetchHeaders(),
        body: JSON.stringify(userData),
      });
      if (!res.ok) throw new Error('Error al registrar usuario');
      const newUser = await res.json();
      setUsers((prev) => [...prev, newUser]);
      return newUser.id;
    } catch (err) {
      console.error(err);
      return `USR-${Math.floor(10 + Math.random() * 90)}`;
    }
  };

  // Update user (Admin)
  const updateUser = async (userId: string, updates: Partial<SystemUser>) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: fetchHeaders(),
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete user (Admin)
  const deleteUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: fetchHeaders(),
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Reset demo databases
  const resetToBaseline = async () => {
    try {
      const res = await fetch('/api/reset', {
        method: 'POST',
        headers: fetchHeaders(),
      });
      if (res.ok) {
        refreshOrders();
        refreshUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const clearAllOrders = () => {
    // Standard simulation helper
    setOrders([]);
  };

  const sendChatMessage = async (dniOrOrderId: string, message: any) => {
    try {
      const cleanTargetDni = (dniOrOrderId || '').replace(/\D/g, '');
      const matchingOrders = orders.filter(
        (o) => o.id === dniOrOrderId || (cleanTargetDni && (o.patientDni || '').replace(/\D/g, '') === cleanTargetDni)
      );

      // Optimistic update across all matching orders for this patient
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id === dniOrOrderId || (cleanTargetDni && (o.patientDni || '').replace(/\D/g, '') === cleanTargetDni)) {
            const currentMessages = o.messages || [];
            return {
              ...o,
              messages: [...currentMessages, message],
              lastPatientWhatsAppInteractionAt: new Date().toISOString()
            };
          }
          return o;
        })
      );

      // 1. Try unified patient chat endpoint /api/chat/:dni
      const chatEndpoint = cleanTargetDni ? `/api/chat/${cleanTargetDni}` : `/api/chat/${dniOrOrderId}`;
      const res = await fetch(chatEndpoint, {
        method: 'POST',
        headers: fetchHeaders(),
        body: JSON.stringify(message),
      });

      if (res.ok) {
        const chatData = await res.json();
        if (chatData?.messages) {
          setOrders((prev) =>
            prev.map((o) => {
              if (o.id === dniOrOrderId || (cleanTargetDni && (o.patientDni || '').replace(/\D/g, '') === cleanTargetDni)) {
                return { ...o, messages: chatData.messages };
              }
              return o;
            })
          );
        }
      } else {
        // 2. Fallback to order-level chat endpoint /api/orders/:id/chat
        const orderIdToCall = matchingOrders[0]?.id || dniOrOrderId;
        const orderRes = await fetch(`/api/orders/${orderIdToCall}/chat`, {
          method: 'POST',
          headers: fetchHeaders(),
          body: JSON.stringify(message),
        });

        if (orderRes.ok) {
          const updated = await orderRes.json();
          setOrders((prev) => prev.map((o) => (o.id === orderIdToCall ? updated : o)));
        }
      }
    } catch (err) {
      console.error('Error sending chat message:', err);
    }
  };

  const addDependent = (newDep: any) => {
    if (!currentUser) return;
    const existingDeps = currentUser.dependents || [];
    const updatedUser = {
      ...currentUser,
      dependents: [...existingDeps, newDep],
    };
    setCurrentUser(updatedUser);
    localStorage.setItem('mi-receta-user', JSON.stringify(updatedUser));
  };

  const removeDependent = (depId: string) => {
    if (!currentUser || !currentUser.dependents) return;
    const updatedUser = {
      ...currentUser,
      dependents: currentUser.dependents.filter((d: any) => d.id !== depId),
    };
    setCurrentUser(updatedUser);
    localStorage.setItem('mi-receta-user', JSON.stringify(updatedUser));
  };

  return {
    currentUser,
    token,
    isLoading,
    errorMsg,
    login,
    register,
    forgotPassword,
    logout,
    orders,
    users,
    activeRole,
    currentPatientDni,
    createOrder,
    updateOrderPhotos,
    updateOrderStatus,
    sendRecipeLink,
    deleteOrder,
    createUser,
    updateUser,
    deleteUser,
    resetToBaseline,
    clearAllOrders,
    sendChatMessage,
    addDependent,
    removeDependent,
  };
}
