import { OrderRepository } from '../repositories/OrderRepository.js';
import { auditLogService } from './AuditLogService.js';

function addAuditAndNotification(order: any, action: string, user: string, notes?: string, notificationType?: string) {
  if (!order.auditLog) order.auditLog = [];
  order.auditLog.push({
    action,
    timestamp: new Date().toISOString(),
    user,
    notes
  });

  if (notificationType) {
    if (!order.notificationsSent) order.notificationsSent = [];
    order.notificationsSent.push({
      type: notificationType,
      sentAt: new Date().toISOString(),
      sentTo: order.patientEmail || order.patientPhone || 'paciente@mireceta.local',
      subject: `Notificación: ${action}`,
      content: notes || `Notificación de ${action} generada para la receta.`
    });
  }
}

export class OrderService {
  private orderRepo: OrderRepository;

  constructor() {
    this.orderRepo = new OrderRepository();
  }

  async getOrdersForUser(currentUser: any) {
    const tenantId = currentUser.tenantId || 'TEN-0001';
    const allOrders = await this.orderRepo.findByTenant(tenantId);

    if (currentUser.role === 'paciente') {
      const patientDniClean = currentUser.identifier.replace(/\s/g, '').replace(/\./g, '');
      return allOrders.filter((o: any) => {
        const orderDniClean = (o.patientDni || '').replace(/\s/g, '').replace(/\./g, '');
        return orderDniClean === patientDniClean;
      });
    }

    if (currentUser.role === 'medico' || currentUser.role === 'colaborador') {
      // Regla Médica: Los médicos solo visibilizan solicitudes con pago válido y aprobado (o PAMI/Ventanilla).
      // Si el pago fue cancelado, rechazado o devuelto, la receta no se procesa.
      return allOrders.filter((o: any) => {
        if (o.obraSocial === 'PAMI (Inssjp)' || (o.paymentReceiptUrl && o.paymentReceiptUrl.includes('cobrado_ventanilla'))) {
          return true;
        }
        return o.paymentStatus === 'approved' && o.status !== 'Rechazada';
      });
    }

    return allOrders;
  }

  async createOrder(orderData: any, currentUser: any) {
    if (currentUser?.role === 'admin') {
      throw new Error('Los administradores no tienen permiso para crear solicitudes, solo pueden visualizarlas.');
    }

    const newId = `REC-${Math.floor(1000 + Math.random() * 9000)}`;
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
      status: orderData.status || 'Pendiente', // 'En revisión' if Oficio
      createdAt: new Date().toISOString(),
      auditLog: [],
      notificationsSent: []
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

    addAuditAndNotification(
      newOrder,
      'Creada',
      creatorName,
      `Solicitud de renovación ingresada para paciente ${newOrder.patientName} ${newOrder.patientLastName}`,
      'solicitud_recibida'
    );

    if (newOrder.paymentStatus === 'approved') {
      addAuditAndNotification(
        newOrder,
        'Pago aprobado',
        'Sistema (Mercado Pago)',
        `Se acreditó el pago de $${newOrder.paymentAmount} con código de operación ${newOrder.paymentId}`,
        'pago_confirmado'
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

  async updateOrder(id: string, updateData: any, currentUser: any) {
    const order: any = await this.orderRepo.findById(id);
    if (!order) throw new Error('Pedido no encontrado.');

    if (currentUser?.role === 'admin') {
      throw new Error('Los administradores no tienen permiso para modificar solicitudes, solo pueden visualizarlas.');
    }

    if (currentUser.role === 'paciente') {
      const patientDniClean = currentUser.identifier.replace(/\s/g, '').replace(/\./g, '');
      const orderDniClean = (order.patientDni || '').replace(/\s/g, '').replace(/\./g, '');
      if (patientDniClean !== orderDniClean) throw new Error('Acceso no autorizado a este pedido.');
      
      if (updateData.status === 'Cancelada' && (order.status === 'Pendiente' || order.status === 'En revisión')) {
        order.status = 'Cancelada';
        addAuditAndNotification(order, 'Cancelada por paciente', 'Paciente (Autogestión)', 'El paciente canceló la solicitud antes de su aprobación.', 'solicitud_cancelada');
        
        await auditLogService.log({
          tenantId: order.tenantId || 'TEN-0001',
          currentUser,
          action: 'ORDER_CANCEL',
          entity: 'Order',
          entityId: id,
          details: `Cancelada solicitud ${id} por el paciente`
        });

        return this.orderRepo.update(id, order);
      } else {
        throw new Error('Los pacientes solo pueden cancelar pedidos pendientes.');
      }
    }

    // Medic / Admin / Colaborador updates
    const operatorName = `${currentUser.name} ${currentUser.lastName} (${currentUser.role})`;

    if (updateData.status && updateData.status !== order.status) {
      let notificationType;
      if (updateData.status === 'Aprobada') notificationType = 'receta_aprobada';
      else if (updateData.status === 'En revisión') notificationType = 'receta_en_revision';
      else if (updateData.status === 'Rechazada') notificationType = 'receta_rechazada';
      else if (updateData.status === 'Emitida') notificationType = 'receta_emitida';

      addAuditAndNotification(order, `Cambio de estado: ${updateData.status}`, operatorName, updateData.doctorNotes, notificationType);
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
      addAuditAndNotification(order, 'Receta adjuntada', operatorName, `Se adjuntó el documento: ${updateData.recipePdfName}`);

      await auditLogService.log({
        tenantId: order.tenantId || 'TEN-0001',
        currentUser,
        action: 'ORDER_PDF_ATTACH',
        entity: 'Order',
        entityId: id,
        details: `Adjuntado PDF de receta: ${updateData.recipePdfName}`
      });
    }

    if (updateData.messages) {
      order.messages = updateData.messages;
      
      // If last message was sent by doctor/collaborator, attempt sending via WhatsApp API considering 24h window
      const lastMsg = updateData.messages[updateData.messages.length - 1];
      if (lastMsg && (lastMsg.sender === 'medico' || lastMsg.sender === 'colaborador' || lastMsg.sender === 'admin') && order.patientPhone) {
        try {
          const { NotificationService } = await import('./NotificationService.js');
          const notificationService = new NotificationService();
          const isWithin24h = notificationService.isWithinWhatsApp24hWindow(order);

          if (isWithin24h) {
            await notificationService.sendNotification({
              tenantId: order.tenantId || 'TEN-0001',
              channel: 'whatsapp',
              to: order.patientPhone,
              body: `[Consulta Dr. ${lastMsg.senderName} - Receta #${order.id}]\n${lastMsg.text || 'Nuevo mensaje adjunto en su consulta.'}`
            }).catch(err => console.log('WhatsApp 24h direct send catch:', err));
          } else {
            const waConfig = await notificationService.getConfig(order.tenantId || 'TEN-0001', 'whatsapp');
            const templateCode = waConfig?.credentials?.doctorInquiryTemplateCode || waConfig?.credentials?.templateCode;

            await notificationService.sendNotification({
              tenantId: order.tenantId || 'TEN-0001',
              channel: 'whatsapp',
              to: order.patientPhone,
              templateCode: templateCode || undefined,
              variables: templateCode ? {
                patientName: `${order.patientName} ${order.patientLastName}`,
                doctorName: lastMsg.senderName,
                orderId: order.id,
                messagePreview: (lastMsg.text || 'Consulta sobre su receta').substring(0, 60)
              } : undefined,
              body: `Hola ${order.patientName}, el Dr. ${lastMsg.senderName} envió una consulta sobre su receta #${order.id}: "${(lastMsg.text || '').substring(0, 80)}...". Por favor responda a este WhatsApp para continuar la conversación directa.`
            }).catch(err => console.log('WhatsApp template send catch:', err));
          }
        } catch (e) {
          // Non-blocking
        }
      }
    }

    return this.orderRepo.update(id, order);
  }

  async addChatMessage(id: string, messageData: any, currentUser: any) {
    const order: any = await this.orderRepo.findById(id);
    if (!order) throw new Error('Pedido no encontrado');

    const newMessage = {
      id: `MSG-${Math.floor(1000 + Math.random() * 9000)}`,
      senderId: currentUser.id,
      senderName: `${currentUser.name} ${currentUser.lastName}`,
      senderRole: currentUser.role,
      text: messageData.text,
      timestamp: new Date().toISOString(),
      attachments: messageData.attachments || []
    };

    if (!order.chatMessages) order.chatMessages = [];
    order.chatMessages.push(newMessage);

    if ((currentUser.role === 'medico' || currentUser.role === 'colaborador' || currentUser.role === 'admin') && order.patientPhone) {
      try {
        const { NotificationService } = await import('./NotificationService.js');
        const notificationService = new NotificationService();
        const isWithin24h = notificationService.isWithinWhatsApp24hWindow(order);

        if (isWithin24h) {
          await notificationService.sendNotification({
            tenantId: order.tenantId || 'TEN-0001',
            channel: 'whatsapp',
            to: order.patientPhone,
            body: `[Consulta Dr. ${currentUser.name} - Receta #${order.id}]\n${messageData.text || 'Nuevo archivo adjunto en la consulta'}`
          }).catch(err => console.log('WhatsApp chat 24h direct send catch:', err));
        } else {
          const waConfig = await notificationService.getConfig(order.tenantId || 'TEN-0001', 'whatsapp');
          const templateCode = waConfig?.credentials?.doctorInquiryTemplateCode || waConfig?.credentials?.templateCode;

          await notificationService.sendNotification({
            tenantId: order.tenantId || 'TEN-0001',
            channel: 'whatsapp',
            to: order.patientPhone,
            templateCode: templateCode || undefined,
            variables: templateCode ? {
              patientName: `${order.patientName} ${order.patientLastName}`,
              doctorName: `${currentUser.name} ${currentUser.lastName}`,
              orderId: order.id,
              messagePreview: (messageData.text || 'Consulta sobre su receta').substring(0, 60)
            } : undefined,
            body: `Hola ${order.patientName}, el Dr. ${currentUser.name} envió una consulta sobre su receta #${order.id}: "${(messageData.text || '').substring(0, 80)}...". Por favor responda a este WhatsApp para continuar la conversación directa.`
          }).catch(err => console.log('WhatsApp chat template send catch:', err));
        }
      } catch (e) {
        // Non-blocking
      }
    }

    return this.orderRepo.update(id, { chatMessages: order.chatMessages });
  }
}
