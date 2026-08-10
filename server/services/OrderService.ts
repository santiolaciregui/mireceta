import { OrderRepository } from '../repositories/OrderRepository.js';
import { auditLogService } from './AuditLogService.js';
import { notificationService } from './NotificationService.js';
import { chatService } from './ChatService.js';
import { addAuditLogEntry } from '../utils/orderUtils.js';
import { cleanDni } from '../utils/formatters.js';
import { generateOrderId } from '../utils/idGenerator.js';

export class OrderService {
  private orderRepo: OrderRepository;

  constructor() {
    this.orderRepo = new OrderRepository();
  }

  async getOrdersForUser(currentUser: any) {
    const tenantId = currentUser?.tenantId || 'TEN-0001';
    const allOrders = await this.orderRepo.findByTenant(tenantId);

    if (currentUser?.role === 'paciente') {
      const patientDniClean = cleanDni(currentUser.identifier);
      const dependentDnis = (currentUser.dependents || [])
        .map((d: any) => cleanDni(d.dni || d.identifier))
        .filter(Boolean);

      return allOrders.filter((o: any) => {
        const orderDniClean = cleanDni(o.patientDni);
        return orderDniClean === patientDniClean || dependentDnis.includes(orderDniClean);
      });
    }

    return allOrders;
  }

  async createOrder(orderData: any, currentUser: any) {
    if (currentUser?.role === 'admin') {
      throw new Error('Los administradores no tienen permiso para crear solicitudes, solo pueden visualizarlas.');
    }

    const newId = generateOrderId();
    const finalPaymentId = orderData.paymentId || `MP-${Math.floor(10000000 + Math.random() * 90000000)}`;

    const newOrder: any = {
      ...orderData,
      id: newId,
      patientName: orderData.patientName || currentUser?.name || 'Paciente',
      patientLastName: orderData.patientLastName || currentUser?.lastName || '',
      patientDni: orderData.patientDni || currentUser?.identifier || '',
      patientEmail: orderData.patientEmail || currentUser?.email || '',
      tenantId: currentUser?.tenantId || orderData.tenantId || 'TEN-0001',
      paymentId: finalPaymentId,
      status: orderData.status || 'Pendiente',
      createdAt: new Date().toISOString(),
      auditLog: [],
      notificationsSent: [],
      messages: orderData.messages || []
    };

    let creatorName = 'Paciente (Autogestión)';
    if (currentUser?.role === 'colaborador') {
      newOrder.createdByOperatorId = currentUser.id;
      newOrder.createdByOperatorName = `${currentUser.name || ''} ${currentUser.lastName || ''}`.trim();
      creatorName = `Colaborador ${currentUser.name || ''} ${currentUser.lastName || ''}`.trim();
    } else if (currentUser?.role === 'medico') {
      newOrder.createdByOperatorId = currentUser.id;
      newOrder.createdByOperatorName = `${currentUser.name || ''} ${currentUser.lastName || ''} (Médico)`.trim();
      creatorName = `Médico ${currentUser.name || ''} ${currentUser.lastName || ''}`.trim();
    }

    addAuditLogEntry(
      newOrder,
      'Creada',
      creatorName,
      `Solicitud de renovación ingresada para paciente ${newOrder.patientName} ${newOrder.patientLastName}`
    );

    if (newOrder.paymentStatus === 'approved') {
      addAuditLogEntry(
        newOrder,
        'Pago aprobado',
        'Sistema (Mercado Pago)',
        `Se acreditó el pago de $${newOrder.paymentAmount} con código de operación ${newOrder.paymentId}`
      );
    }

    const createdOrder = await this.orderRepo.create(newOrder);

    await auditLogService.log({
      tenantId: newOrder.tenantId,
      currentUser,
      action: 'ORDER_CREATE',
      entity: 'Order',
      entityId: newId,
      details: `Creada receta ${newId} para paciente ${newOrder.patientName} ${newOrder.patientLastName}`
    });

    return createdOrder;
  }

  async getOrderById(id: string) {
    return this.orderRepo.findById(id);
  }

  async updateOrder(id: string, updateData: any, currentUser: any) {
    const order: any = await this.orderRepo.findById(id);
    if (!order) throw new Error('Pedido no encontrado.');

    // 1. Patient permissions and updates
    if (currentUser.role === 'paciente') {
      const patientDniClean = cleanDni(currentUser.identifier);
      const orderDniClean = cleanDni(order.patientDni);
      if (patientDniClean !== orderDniClean) throw new Error('Acceso no autorizado a este pedido.');

      if (updateData.status === 'Cancelada' && (order.status === 'Pendiente' || order.status === 'En revisión')) {
        order.status = 'Cancelada';
        addAuditLogEntry(order, 'Cancelada por paciente', 'Paciente (Autogestión)', 'El paciente canceló la solicitud antes de su aprobación.');

        await auditLogService.log({
          tenantId: order.tenantId || 'TEN-0001',
          currentUser,
          action: 'ORDER_CANCEL',
          entity: 'Order',
          entityId: id,
          details: `Cancelada solicitud ${id} por el paciente`
        });

        return this.orderRepo.update(id, order);
      } else if (updateData.messages) {
        order.messages = updateData.messages;
        order.lastPatientWhatsAppInteractionAt = new Date().toISOString();

        const lastMsg = updateData.messages[updateData.messages.length - 1];
        addAuditLogEntry(
          order,
          'Mensaje recibido del paciente',
          `${order.patientName} ${order.patientLastName} (Paciente)`,
          lastMsg?.text || (lastMsg?.fileType === 'audio' ? 'Nota de voz adjunta' : 'Foto adjunta')
        );

        await auditLogService.log({
          tenantId: order.tenantId || 'TEN-0001',
          currentUser,
          action: 'ORDER_CHAT_MESSAGE',
          entity: 'Order',
          entityId: id,
          details: `Mensaje del paciente en receta ${id}: "${(lastMsg?.text || '').substring(0, 50)}"`
        });

        return this.orderRepo.update(id, order);
      } else {
        throw new Error('Los pacientes solo pueden cancelar pedidos pendientes o enviar mensajes al equipo médico.');
      }
    }

    // 2. Admin restrictions
    if (currentUser?.role === 'admin') {
      if (updateData.messages) {
        order.messages = updateData.messages;
        const lastMsg = updateData.messages[updateData.messages.length - 1];
        addAuditLogEntry(
          order,
          'Mensaje del administrador',
          `${currentUser.name} ${currentUser.lastName} (Admin)`,
          lastMsg?.text || (lastMsg?.fileType === 'audio' ? 'Nota de voz' : 'Archivo adjunto')
        );
        return this.orderRepo.update(id, order);
      }
      if (updateData.status && updateData.status !== order.status) {
        throw new Error('Los administradores no tienen permiso para modificar el estado de solicitudes, solo pueden visualizarlas.');
      }
    }

    // 3. Medic & Collaborator modifications
    const operatorName = `${currentUser.name} ${currentUser.lastName} (${currentUser.role})`;

    if (updateData.status && updateData.status !== order.status) {
      addAuditLogEntry(order, `Cambio de estado: ${updateData.status}`, operatorName, updateData.doctorNotes);
      order.status = updateData.status;

      await auditLogService.log({
        tenantId: order.tenantId || 'TEN-0001',
        currentUser,
        action: 'ORDER_STATUS_UPDATE',
        entity: 'Order',
        entityId: id,
        details: `Cambio de estado a "${updateData.status}" por ${operatorName}`
      });
    }

    if (updateData.doctorNotes) order.doctorNotes = updateData.doctorNotes;
    if (updateData.recipePdfUrl) {
      order.recipePdfUrl = updateData.recipePdfUrl;
      order.recipePdfName = updateData.recipePdfName;
      addAuditLogEntry(order, 'Receta adjuntada', operatorName, `Se adjuntó el documento: ${updateData.recipePdfName}`);

      await auditLogService.log({
        tenantId: order.tenantId || 'TEN-0001',
        currentUser,
        action: 'ORDER_PDF_ATTACH',
        entity: 'Order',
        entityId: id,
        details: `Adjuntado PDF de receta: ${updateData.recipePdfName}`
      });
    }

    // 4. Auto-dispatch WhatsApp notification when recipe is issued
    if ((updateData.status === 'Emitida' || updateData.status === 'Enviada') && order.patientPhone) {
      const host = process.env.PUBLIC_URL || 'https://mireceta.com';
      const recipeLink = `${host}/api/orders/public/${order.id}/pdf`;

      notificationService.sendRecipeIssuedWhatsApp({
        tenantId: order.tenantId || 'TEN-0001',
        patientPhone: order.patientPhone,
        patientName: order.patientName,
        orderId: order.id,
        recipeLink,
        interactionRecord: order
      }).catch((err) => console.error('Error enviando WhatsApp de receta emitida:', err));
    }

    // 5. If messages are updated by doctor, dispatch WhatsApp notification
    if (updateData.messages) {
      order.messages = updateData.messages;
      const lastMsg = updateData.messages[updateData.messages.length - 1];

      if (lastMsg && (lastMsg.sender === 'medico' || lastMsg.sender === 'colaborador' || lastMsg.sender === 'admin') && order.patientPhone) {
        notificationService.sendDoctorInquiryWhatsApp({
          tenantId: order.tenantId || 'TEN-0001',
          patientPhone: order.patientPhone,
          patientName: `${order.patientName} ${order.patientLastName}`.trim(),
          doctorName: lastMsg.senderName || `${currentUser.name} ${currentUser.lastName}`.trim(),
          orderId: order.id,
          messageText: lastMsg.text || 'Nuevo archivo adjunto en la consulta',
          interactionRecord: order
        }).catch((err) => console.error('Error enviando WhatsApp de consulta médica:', err));
      }
    }

    return this.orderRepo.update(id, order);
  }

  /**
   * Delegates chat messages directly to unified chatService.
   */
  async addChatMessage(id: string, messageData: any, currentUser: any) {
    return chatService.sendMessage(id, messageData, currentUser);
  }

  async deleteOrder(id: string, currentUser: any) {
    const order: any = await this.orderRepo.findById(id);
    if (!order) {
      throw new Error('Solicitud no encontrada.');
    }

    // Tenant check
    if (currentUser?.role !== 'superadmin' && order.tenantId && currentUser?.tenantId && order.tenantId !== currentUser.tenantId) {
      throw new Error('No tiene permisos para eliminar solicitudes de otro centro médico.');
    }

    // Patient check: can only delete/cancel their own order
    if (currentUser?.role === 'paciente') {
      const patientDniClean = cleanDni(currentUser.identifier);
      const dependentDnis = (currentUser.dependents || [])
        .map((d: any) => cleanDni(d.dni || d.identifier))
        .filter(Boolean);
      const orderDniClean = cleanDni(order.patientDni);

      const isOwner = orderDniClean === patientDniClean || dependentDnis.includes(orderDniClean) || (order.patientEmail && order.patientEmail === currentUser.email);
      if (!isOwner) {
        throw new Error('No tiene permiso para eliminar esta solicitud.');
      }
    }

    const result = await this.orderRepo.delete(id);

    await auditLogService.log({
      tenantId: order.tenantId || currentUser?.tenantId || 'TEN-0001',
      currentUser,
      action: 'ORDER_DELETE',
      entity: 'Order',
      entityId: id,
      details: `Eliminó la orden ${id} del paciente ${order.patientName || ''} ${order.patientLastName || ''} (DNI: ${order.patientDni || ''})`
    });

    return { success: result, id };
  }
}

