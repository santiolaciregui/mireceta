import { OrderRepository } from '../repositories/OrderRepository.js';
import { auditLogService } from './AuditLogService.js';
import { notificationService } from './NotificationService.js';
import { chatService } from './ChatService.js';
import { storageService } from './storage/StorageService.js';
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

    const isExempt = orderData.obraSocial === 'PAMI (Inssjp)' || 
      orderData.paymentMethod === 'bonificado' || 
      String(orderData.paymentAmount) === '0' ||
      orderData.paymentStatus === 'exempt';

    const calculatedPaymentStatus = isExempt ? 'exempt' : (orderData.paymentStatus || 'pending');

    const newOrder: any = {
      ...orderData,
      id: newId,
      patientName: orderData.patientName || currentUser?.name || 'Paciente',
      patientLastName: orderData.patientLastName || currentUser?.lastName || '',
      patientDni: orderData.patientDni || currentUser?.identifier || '',
      patientEmail: orderData.patientEmail || currentUser?.email || '',
      tenantId: currentUser?.tenantId || orderData.tenantId || 'TEN-0001',
      paymentId: finalPaymentId,
      paymentStatus: calculatedPaymentStatus,
      paymentAmount: isExempt ? '0' : (orderData.paymentAmount || '10000'),
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
    } else if (newOrder.paymentStatus === 'exempt') {
      addAuditLogEntry(
        newOrder,
        'Arancel exento',
        'Sistema (Convenio / PAMI)',
        `Solicitud registrada como exenta / bonificada (arancel $0).`
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
        
        if (order.paymentStatus === 'approved') {
          order.paymentStatus = 'refunded';
          addAuditLogEntry(
            order,
            'En devolución (Reembolso iniciado)',
            'Sistema (Reembolso)',
            `Cancelación de orden paga. Se inició proceso de reintegro por $${order.paymentAmount || '0'}.`
          );
        }

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
      const isBeingRejected = updateData.status === 'Rechazada';
      if (isBeingRejected && order.paymentStatus === 'approved') {
        order.paymentStatus = 'refunded';
        addAuditLogEntry(
          order,
          'En devolución (Reembolso iniciado)',
          operatorName,
          `Solicitud rechazada en revisión médica. Se inició automáticamente el proceso de reembolso de los $${order.paymentAmount || '0'} abonados.`
        );
      }

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

    if (updateData.paymentStatus && updateData.paymentStatus !== order.paymentStatus) {
      order.paymentStatus = updateData.paymentStatus;
      addAuditLogEntry(
        order,
        `Estado de pago actualizado: ${updateData.paymentStatus}`,
        operatorName,
        `El estado del pago fue modificado a "${updateData.paymentStatus}".`
      );
    }

    if (updateData.doctorNotes) order.doctorNotes = updateData.doctorNotes;
    if (updateData.recipePdfUrl) {
      // If the PDF is sent as Base64 from the client, persist it to storage
      if (updateData.recipePdfUrl.startsWith('data:') || updateData.recipePdfUrl.length > 500) {
        try {
          const fileName = updateData.recipePdfName || `receta_${order.id}.pdf`;
          const savedUrl = await storageService.saveRecipePdf(fileName, updateData.recipePdfUrl);
          order.recipePdfUrl = savedUrl;
        } catch (storageErr) {
          console.error('[OrderService] Error guardando PDF en almacenamiento, utilizando URL directa:', storageErr);
          order.recipePdfUrl = updateData.recipePdfUrl;
        }
      } else {
        order.recipePdfUrl = updateData.recipePdfUrl;
      }
      
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

    // 4. Auto-dispatch notifications when recipe is issued
    if (updateData.status === 'Emitida' || updateData.status === 'Enviada') {
      const host = process.env.PUBLIC_URL || 'https://mireceta.com';
      const recipeLink = `${host}/api/orders/public/${order.id}/pdf`;
      const deliveryMethod = order.deliveryMethod || 'whatsapp';

      if ((deliveryMethod === 'whatsapp' || deliveryMethod === 'both' || !order.patientEmail) && order.patientPhone) {
        notificationService.sendRecipeIssuedWhatsApp({
          tenantId: order.tenantId || 'TEN-0001',
          patientPhone: order.patientPhone,
          patientName: order.patientName,
          orderId: order.id,
          recipeLink,
          interactionRecord: order
        }).catch((err) => console.error('Error enviando WhatsApp de receta emitida:', err));
      }

      if ((deliveryMethod === 'email' || deliveryMethod === 'both' || !order.patientPhone) && order.patientEmail) {
        notificationService.sendRecipeIssuedEmail({
          tenantId: order.tenantId || 'TEN-0001',
          patientEmail: order.patientEmail,
          patientName: order.patientName,
          orderId: order.id,
          recipeLink
        }).catch((err) => console.error('Error enviando Email de receta emitida:', err));
      }
    }

    // 4b. Auto-dispatch WhatsApp notification when recipe is rejected (coordinating full refund)
    if (updateData.status === 'Rechazada' && order.patientPhone) {
      notificationService.sendRecipeRejectedWhatsApp({
        tenantId: order.tenantId || 'TEN-0001',
        patientPhone: order.patientPhone,
        patientName: order.patientName,
        orderId: order.id,
        reason: updateData.doctorNotes || order.doctorNotes || 'No cumple con los criterios clínicos requeridos para la prescripción.',
        refundAmount: order.paymentAmount,
        interactionRecord: order
      }).catch((err) => console.error('Error enviando WhatsApp de solicitud rechazada:', err));
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

  async sendRecipeLink(
    id: string,
    channel: 'whatsapp' | 'email' | 'both',
    currentUser: any
  ): Promise<{
    success: boolean;
    channel: 'whatsapp' | 'email' | 'both';
    whatsapp?: { success: boolean; error?: string };
    email?: { success: boolean; error?: string };
    message: string;
  }> {
    const order: any = await this.orderRepo.findById(id);
    if (!order) throw new Error('Pedido no encontrado.');

    if (order.status !== 'Emitida' && order.status !== 'Enviada') {
      throw new Error('Solo se puede enviar el link de recetas que hayan sido emitidas.');
    }

    const host = process.env.PUBLIC_URL || 'https://mireceta.com';
    const recipeLink = `${host}/api/orders/public/${order.id}/pdf`;
    const tenantId = order.tenantId || 'TEN-0001';
    const operatorName = currentUser?.name ? `${currentUser.name} ${currentUser.lastName || ''} (${currentUser.role || 'Usuario'})`.trim() : 'Sistema';

    let waResult: { success: boolean; error?: string } | undefined;
    let emailResult: { success: boolean; error?: string } | undefined;

    const shouldSendWa = channel === 'whatsapp' || channel === 'both';
    const shouldSendEmail = channel === 'email' || channel === 'both';

    if (shouldSendWa) {
      if (!order.patientPhone) {
        waResult = { success: false, error: 'El paciente no tiene número de teléfono registrado.' };
      } else {
        const res = await notificationService.sendRecipeIssuedWhatsApp({
          tenantId,
          patientPhone: order.patientPhone,
          patientName: order.patientName,
          orderId: order.id,
          recipeLink,
          interactionRecord: order
        });
        waResult = { success: res.success, error: res.error };
      }
    }

    if (shouldSendEmail) {
      if (!order.patientEmail) {
        emailResult = { success: false, error: 'El paciente no tiene correo electrónico registrado.' };
      } else {
        const res = await notificationService.sendRecipeIssuedEmail({
          tenantId,
          patientEmail: order.patientEmail,
          patientName: order.patientName,
          orderId: order.id,
          recipeLink
        });
        emailResult = { success: res.success, error: res.error };
      }
    }

    const isOverallSuccess =
      (shouldSendWa && shouldSendEmail)
        ? Boolean(waResult?.success || emailResult?.success)
        : shouldSendWa
        ? Boolean(waResult?.success)
        : Boolean(emailResult?.success);

    const channelsSent: string[] = [];
    if (waResult?.success) channelsSent.push('WhatsApp');
    if (emailResult?.success) channelsSent.push('Email');
    const channelsFailed: string[] = [];
    if (waResult && !waResult.success) channelsFailed.push(`WhatsApp (${waResult.error})`);
    if (emailResult && !emailResult.success) channelsFailed.push(`Email (${emailResult.error})`);

    const logDetails = `Reenvío de link de receta solicitado por ${operatorName}. Exitosos: [${channelsSent.join(', ') || 'ninguno'}]. Fallidos: [${channelsFailed.join(', ') || 'ninguno'}].`;

    addAuditLogEntry(order, 'Reenvío de link de receta', operatorName, logDetails);
    await this.orderRepo.update(id, order);

    await auditLogService.log({
      tenantId,
      currentUser,
      action: 'ORDER_RESEND_LINK',
      entity: 'Order',
      entityId: id,
      details: logDetails
    });

    let message = 'Link de receta procesado correctamente.';
    if (channel === 'both') {
      if (waResult?.success && emailResult?.success) {
        message = 'Link enviado con éxito por WhatsApp y Correo electrónico.';
      } else if (waResult?.success) {
        message = `Link enviado por WhatsApp. Falló el envío por correo: ${emailResult?.error}`;
      } else if (emailResult?.success) {
        message = `Link enviado por Correo. Falló el envío por WhatsApp: ${waResult?.error}`;
      } else {
        message = `No se pudo enviar el link. WhatsApp: ${waResult?.error || 'error'}. Email: ${emailResult?.error || 'error'}.`;
      }
    } else if (channel === 'whatsapp') {
      message = waResult?.success ? 'Link enviado con éxito por WhatsApp.' : `Error al enviar WhatsApp: ${waResult?.error}`;
    } else if (channel === 'email') {
      message = emailResult?.success ? 'Link enviado con éxito por Correo electrónico.' : `Error al enviar Correo: ${emailResult?.error}`;
    }

    return {
      success: isOverallSuccess,
      channel,
      whatsapp: waResult,
      email: emailResult,
      message
    };
  }
}

