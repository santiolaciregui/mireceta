import { OrderRepository } from '../repositories/OrderRepository.js';
import { PatientRepository } from '../repositories/PatientRepository.js';
import { TenantRepository } from '../repositories/TenantRepository.js';
import { auditLogService } from './AuditLogService.js';
import { notificationService } from './NotificationService.js';
import { chatService } from './ChatService.js';
import { storageService } from './storage/StorageService.js';
import { addAuditLogEntry } from '../utils/orderUtils.js';
import { cleanDni } from '../utils/formatters.js';
import { PricingService } from './PricingService.js';
import { PaymentService } from './PaymentService.js';
import { generateOrderId, generateMessageId } from '../utils/idGenerator.js';

export class OrderService {
  private orderRepo: OrderRepository;
  private patientRepo: PatientRepository;
  private tenantRepo: TenantRepository;
  private paymentService: PaymentService;

  constructor() {
    this.orderRepo = new OrderRepository();
    this.patientRepo = new PatientRepository();
    this.tenantRepo = new TenantRepository();
    this.paymentService = new PaymentService();
  }

  private async refreshPendingOrderLimitAlert(tenantId: string): Promise<void> {
    try {
      await notificationService.evaluatePendingOrderLimitAlert(tenantId);
    } catch (error) {
      console.error('[OrderService] Pending order limit evaluation failed:', error);
    }
  }

  async getOrdersForUser(currentUser: any, summaryOnly = false) {
    const tenantId = currentUser?.tenantId || 'TEN-0001';

    if (currentUser?.role === 'paciente') {
      const patientDniClean = cleanDni(currentUser.identifier);
      const rawPatientDni = (currentUser.identifier || '').trim();
      const dependentDnisClean = (currentUser.dependents || [])
        .map((d: any) => cleanDni(d.dni || d.identifier))
        .filter(Boolean);
      const rawDependentDnis = (currentUser.dependents || [])
        .flatMap((d: any) => [d.dni, d.identifier])
        .filter(Boolean)
        .map((s: string) => s.trim());

      const targetDnis = Array.from(
        new Set([patientDniClean, rawPatientDni, ...dependentDnisClean, ...rawDependentDnis])
      ).filter(Boolean);

      const candidateOrders = summaryOnly
        ? await this.orderRepo.findSummariesByPatientDnis(tenantId, targetDnis)
        : await this.orderRepo.findByPatientDnis(tenantId, targetDnis);

      return candidateOrders.filter((o: any) => {
        const orderDniClean = cleanDni(o.patientDni);
        const titularDniClean = cleanDni(o.requestedByTitularDni);
        return (
          orderDniClean === patientDniClean ||
          dependentDnisClean.includes(orderDniClean) ||
          titularDniClean === patientDniClean
        );
      });
    }

    return summaryOnly
      ? this.orderRepo.findSummariesByTenant(tenantId)
      : this.orderRepo.findByTenant(tenantId);
  }

  async getOrderForUser(id: string, currentUser: any) {
    const order: any = await this.orderRepo.findById(id);
    if (!order) throw new Error('Pedido no encontrado.');

    const tenantId = currentUser?.tenantId || 'TEN-0001';
    if ((order.tenantId || 'TEN-0001') !== tenantId) {
      throw new Error('Acceso no autorizado a este pedido.');
    }

    if (currentUser?.role === 'paciente') {
      const patientDniClean = cleanDni(currentUser.identifier);
      const dependentDnisClean = (currentUser.dependents || [])
        .map((dependent: any) => cleanDni(dependent.dni || dependent.identifier))
        .filter(Boolean);
      const orderDniClean = cleanDni(order.patientDni);
      const titularDniClean = cleanDni(order.requestedByTitularDni);
      const canAccess =
        orderDniClean === patientDniClean ||
        dependentDnisClean.includes(orderDniClean) ||
        titularDniClean === patientDniClean;

      if (!canAccess) throw new Error('Acceso no autorizado a este pedido.');
    }

    return order;
  }

  async createOrder(orderData: any, currentUser: any) {
    if (currentUser?.role === 'admin') {
      throw new Error('Los administradores no tienen permiso para crear solicitudes, solo pueden visualizarlas.');
    }

    const newId = generateOrderId();

    const tenantIdToUse = currentUser?.tenantId || orderData.tenantId || 'TEN-0001';
    const clientRequestId = typeof orderData.clientRequestId === 'string'
      ? orderData.clientRequestId.trim()
      : '';

    if (clientRequestId) {
      const existingOrder = await this.orderRepo.findByClientRequestId(clientRequestId);
      if (existingOrder) {
        if (existingOrder.tenantId !== tenantIdToUse) {
          throw new Error('La solicitud no pertenece al centro médico actual.');
        }
        return existingOrder;
      }
    }
    let basePricePerPrescription = 10000;
    try {
      const tenant = await this.tenantRepo.findById(tenantIdToUse);
      if (tenant && tenant.pricePerPrescription) {
         basePricePerPrescription = tenant.pricePerPrescription;
      }
    } catch(err) {
      console.error('Error fetching tenant pricing:', err);
    }

    // Calculate official price in backend
    const pricing = PricingService.calculatePrice({
      medicationItems: orderData.medicationItems,
      medicationPhotos: orderData.medicationPhotos,
      obraSocial: orderData.obraSocial,
      paymentMethod: orderData.paymentMethod,
      userRole: currentUser?.role,
      customAmount: orderData.paymentAmount,
      basePricePerPrescription,
    });

    const isExempt = pricing.isExempt;
    const calculatedPaymentStatus = isExempt ? 'exempt' : (orderData.paymentStatus || 'pending');

    // Guard against rapid duplicate submissions (within 15s) from same patient with identical medication text or arancel
    if (currentUser?.role === 'paciente') {
      const patientDniClean = cleanDni(orderData.patientDni || currentUser.identifier);
      const recentThreshold = new Date(Date.now() - 15 * 1000).toISOString();
      const existingRecentOrders = await this.orderRepo.findByTenant(tenantIdToUse);
      const duplicate = existingRecentOrders.find((o: any) => {
        return (
          cleanDni(o.patientDni) === patientDniClean &&
          o.status === 'Pendiente' &&
          o.createdAt && o.createdAt >= recentThreshold &&
          (o.medicationText === (orderData.medicationText || '') || o.paymentAmount === pricing.amountFormatted)
        );
      });
      if (duplicate) {
        console.log(`[OrderService] Prevented duplicate order creation for DNI ${patientDniClean}. Returning existing order ${duplicate.id}`);
        return duplicate;
      }
    }

    // Payment method & ID resolution
    let finalPaymentMethod = orderData.paymentMethod || 'mp';
    let finalPaymentId = orderData.paymentId;

    if (isExempt) {
      finalPaymentMethod = 'bonificado';
      finalPaymentId = orderData.paymentId && !orderData.paymentId.startsWith('MP-') ? orderData.paymentId : 'EXENTO';
    } else if (!finalPaymentId) {
      if (finalPaymentMethod === 'cash_desk') {
        finalPaymentId = `EFECTIVO-${Math.floor(100000 + Math.random() * 900000)}`;
      } else if (finalPaymentMethod === 'transfer') {
        finalPaymentId = `TRANS-${Math.floor(100000 + Math.random() * 900000)}`;
      } else {
        finalPaymentId = `MP-${Math.floor(10000000 + Math.random() * 90000000)}`;
      }
    }

    const isForDependent = Boolean(orderData.isForDependent);
    const dependentRelationship = orderData.dependentRelationship;
    const requestedByTitularName = orderData.requestedByTitularName || (isForDependent && currentUser?.role === 'paciente' ? `${currentUser.name || ''} ${currentUser.lastName || ''}`.trim() : undefined);
    const requestedByTitularDni = orderData.requestedByTitularDni || (isForDependent && currentUser?.role === 'paciente' ? currentUser.identifier : undefined);
    const requestedByTitularEmail = orderData.requestedByTitularEmail || (isForDependent && currentUser?.role === 'paciente' ? currentUser.email : undefined);
    const requestedByTitularPhone = orderData.requestedByTitularPhone || (isForDependent && currentUser?.role === 'paciente' ? currentUser.phone : undefined);

    // Process and save payment receipt if it's a base64 string
    let paymentReceiptUrl = orderData.paymentReceiptUrl;
    if (paymentReceiptUrl && (paymentReceiptUrl.startsWith('data:') || paymentReceiptUrl.length > 500)) {
      try {
        const fileName = orderData.paymentReceiptName || `comprobante_${newId}.pdf`;
        const savedUrl = await storageService.saveRecipePdf(fileName, paymentReceiptUrl);
        paymentReceiptUrl = savedUrl;
      } catch (storageErr) {
        console.error('[OrderService] Error guardando comprobante en almacenamiento, utilizando URL directa:', storageErr);
      }
    }

    // Process and save medication photos if they are base64 strings
    let medicationPhotos = orderData.medicationPhotos || [];
    if (Array.isArray(medicationPhotos) && medicationPhotos.length > 0) {
      const savedPhotos = [];
      for (let i = 0; i < medicationPhotos.length; i++) {
        const photo = medicationPhotos[i];
        if (photo.url && (photo.url.startsWith('data:') || photo.url.length > 500)) {
          try {
            const fileName = photo.name || `medica_${newId}_${i}.jpg`;
            const savedUrl = await storageService.saveRecipePdf(fileName, photo.url);
            savedPhotos.push({ ...photo, url: savedUrl, name: photo.name });
          } catch (storageErr) {
            console.error('[OrderService] Error guardando foto en almacenamiento, utilizando URL directa:', storageErr);
            savedPhotos.push(photo);
          }
        } else {
          savedPhotos.push(photo);
        }
      }
      medicationPhotos = savedPhotos;
    }

    const newOrder: any = {
      ...orderData,
      id: newId,
      clientRequestId: clientRequestId || undefined,
      patientName: orderData.patientName || currentUser?.name || 'Paciente',
      patientLastName: orderData.patientLastName || currentUser?.lastName || '',
      patientDni: orderData.patientDni || currentUser?.identifier || '',
      patientEmail: orderData.patientEmail || currentUser?.email || '',
      tenantId: currentUser?.tenantId || orderData.tenantId || 'TEN-0001',
      isForDependent,
      dependentRelationship,
      requestedByTitularName,
      requestedByTitularDni,
      requestedByTitularEmail,
      requestedByTitularPhone,
      paymentMethod: finalPaymentMethod,
      paymentId: finalPaymentId,
      paymentStatus: calculatedPaymentStatus,
      paymentAmount: pricing.amountFormatted,
      status: orderData.status || 'Pendiente',
      createdAt: new Date().toISOString(),
      auditLog: [],
      notificationsSent: [],
      messages: orderData.messages || [],
      paymentReceiptUrl,
      medicationPhotos,
      medicationPhotoUrl: medicationPhotos.length > 0 ? medicationPhotos[0].url : null,
      medicationPhotoName: medicationPhotos.length > 0 ? medicationPhotos[0].name : null
    };

    let creatorName = 'Paciente (Autogestión)';
    let auditLogCreationDetails = `Solicitud de renovación ingresada para paciente ${newOrder.patientName} ${newOrder.patientLastName}`;

    if (newOrder.isForDependent) {
      creatorName = `Titular ${newOrder.requestedByTitularName || currentUser?.name || 'Titular'} (${newOrder.dependentRelationship || 'A cargo'})`;
      auditLogCreationDetails = `Solicitud ingresada por el titular ${newOrder.requestedByTitularName || ''} para su familiar a cargo: ${newOrder.patientName} ${newOrder.patientLastName} (${newOrder.dependentRelationship || 'A cargo'})`;
    } else if (currentUser?.role === 'colaborador') {
      newOrder.createdByOperatorId = currentUser.id;
      newOrder.createdByOperatorName = `${currentUser.name || ''} ${currentUser.lastName || ''}`.trim();
      creatorName = `Colaborador ${currentUser.name || ''} ${currentUser.lastName || ''}`.trim();
    } else if (currentUser?.role === 'medico') {
      newOrder.createdByOperatorId = currentUser.id;
      newOrder.createdByOperatorName = `${currentUser.name || ''} ${currentUser.lastName || ''}`.trim();
      creatorName = `Médico ${currentUser.name || ''} ${currentUser.lastName || ''}`.trim();
    }

    addAuditLogEntry(
      newOrder,
      'Creada',
      creatorName,
      auditLogCreationDetails
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
        'Sistema (Convenio / Bonificado)',
        `Solicitud registrada como exenta / bonificada (arancel $0). Detalle: ${pricing.breakdown}.`
      );
    } else {
      addAuditLogEntry(
        newOrder,
        'Arancel oficial fijado',
        'Sistema (Cálculo Oficial)',
        `Arancel calculado por el servidor: $${newOrder.paymentAmount} (${pricing.breakdown}).`
      );
    }

    let createdOrder;
    try {
      createdOrder = await this.orderRepo.create(newOrder);
    } catch (error: any) {
      if (error?.code === 11000 && clientRequestId) {
        const existingOrder = await this.orderRepo.findByClientRequestId(clientRequestId);
        if (existingOrder) return existingOrder;
      }
      throw error;
    }

    await auditLogService.log({
      tenantId: newOrder.tenantId,
      currentUser,
      action: 'ORDER_CREATE',
      entity: 'Order',
      entityId: newId,
      details: `Creada receta ${newId} para paciente ${newOrder.patientName} ${newOrder.patientLastName}`
    });

    await this.refreshPendingOrderLimitAlert(newOrder.tenantId);

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
          const refund = await this.paymentService.refundApprovedCheckoutPayment(order);
          if (refund.refunded) {
            order.paymentStatus = 'refunded';
            order.paymentRefundId = refund.refundId;
            addAuditLogEntry(order, 'Reembolso acreditado', 'Sistema (Mercado Pago)', `Cancelación de orden paga. Mercado Pago confirmó el reintegro de $${order.paymentAmount || '0'}${refund.refundId ? ` (ID ${refund.refundId})` : ''}.`);
          } else {
            addAuditLogEntry(order, 'Reembolso pendiente de gestión', 'Sistema', `Cancelación de orden paga. No se realizó un reintegro automático: ${refund.reason}`);
          }
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

        const updatedOrder = await this.orderRepo.update(id, order);
        await this.refreshPendingOrderLimitAlert(order.tenantId || 'TEN-0001');
        return updatedOrder;
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
    const wasAlreadyIssued = order.status === 'Emitida' || order.status === 'Enviada';
    const isFileUpdated = Boolean(updateData.recipePdfUrl && updateData.recipePdfUrl !== order.recipePdfUrl);

    if (updateData.status && updateData.status !== order.status) {
      const isBeingRejected = updateData.status === 'Rechazada';
      if (isBeingRejected && order.paymentStatus === 'approved') {
        const refund = await this.paymentService.refundApprovedCheckoutPayment(order);
        if (refund.refunded) {
          order.paymentStatus = 'refunded';
          order.paymentRefundId = refund.refundId;
          addAuditLogEntry(order, 'Reembolso acreditado', 'Sistema (Mercado Pago)', `Solicitud rechazada. Mercado Pago confirmó el reintegro de $${order.paymentAmount || '0'}${refund.refundId ? ` (ID ${refund.refundId})` : ''}.`);
        } else {
          addAuditLogEntry(order, 'Reembolso pendiente de gestión', operatorName, `Solicitud rechazada. No se realizó un reintegro automático: ${refund.reason}`);
        }
      }

      addAuditLogEntry(order, `Cambio de estado: ${updateData.status}`, operatorName, updateData.doctorNotes);
      order.status = updateData.status;

      if (currentUser?.role === 'medico' && (updateData.status === 'Emitida' || updateData.status === 'Enviada' || updateData.status === 'Aprobada')) {
        order.issuedByDoctorId = currentUser.id;
        order.issuedByDoctorName = `${currentUser.name || ''} ${currentUser.lastName || ''}`.trim();
      }

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
      const oldPdfUrl = order.recipePdfUrl;
      // If the PDF is sent as Base64 from the client, persist it to storage
      if (updateData.recipePdfUrl.startsWith('data:') || updateData.recipePdfUrl.length > 500) {
        try {
          const fileName = updateData.recipePdfName || `receta_${order.id}.pdf`;
          const savedUrl = await storageService.saveRecipePdf(fileName, updateData.recipePdfUrl);
          order.recipePdfUrl = savedUrl;
          if (oldPdfUrl && oldPdfUrl.startsWith('/uploads/recipes/') && oldPdfUrl !== savedUrl) {
            await storageService.deleteRecipeFile(oldPdfUrl).catch(() => {});
          }
        } catch (storageErr) {
          console.error('[OrderService] Error guardando PDF en almacenamiento, utilizando URL directa:', storageErr);
          order.recipePdfUrl = updateData.recipePdfUrl;
        }
      } else {
        order.recipePdfUrl = updateData.recipePdfUrl;
      }
      
      order.recipePdfName = updateData.recipePdfName || order.recipePdfName;
      const logAction = wasAlreadyIssued ? 'Receta modificada' : 'Receta adjuntada';
      const logDetails = wasAlreadyIssued
        ? `Se modificó el archivo adjunto: ${order.recipePdfName}. El enlace público se mantiene idéntico.`
        : `Se adjuntó el documento: ${order.recipePdfName}`;

      addAuditLogEntry(order, logAction, operatorName, logDetails);

      await auditLogService.log({
        tenantId: order.tenantId || 'TEN-0001',
        currentUser,
        action: wasAlreadyIssued ? 'ORDER_PDF_UPDATE' : 'ORDER_PDF_ATTACH',
        entity: 'Order',
        entityId: id,
        details: `${logAction}: ${order.recipePdfName}`
      });
    }

    // 4. Auto-dispatch notifications & chat message when recipe is first issued
    const host = process.env.PUBLIC_URL || 'https://mireceta.online';
    const recipeLink = `${host}/api/orders/public/${order.id}/pdf`;
    const deliveryMethod = order.deliveryMethod || 'whatsapp';

    const isFirstTimeEmission = !wasAlreadyIssued && (updateData.status === 'Emitida' || updateData.status === 'Enviada');
    const shouldNotifyUpdatedFile = wasAlreadyIssued && isFileUpdated && Boolean(updateData.notifyPatient);

    if (isFirstTimeEmission || shouldNotifyUpdatedFile) {
      if ((deliveryMethod === 'whatsapp' || deliveryMethod === 'both' || !order.patientEmail) && order.patientPhone) {
        notificationService.sendRecipeIssuedWhatsApp({
          tenantId: order.tenantId || 'TEN-0001',
          patientPhone: order.patientPhone,
          patientName: order.patientName,
          orderId: order.id,
          recipeLink,
          interactionRecord: order,
          recipePdfUrl: order.recipePdfUrl,
          obraSocial: order.obraSocial,
          obraSocialNumber: order.obraSocialNumber
        }).catch((err) => console.error('Error enviando WhatsApp de receta:', err));
      }

      if ((deliveryMethod === 'email' || deliveryMethod === 'both' || !order.patientPhone) && order.patientEmail) {
        notificationService.sendRecipeIssuedEmail({
          tenantId: order.tenantId || 'TEN-0001',
          patientEmail: order.patientEmail,
          patientName: order.patientName,
          orderId: order.id,
          recipeLink,
          recipePdfUrl: order.recipePdfUrl,
          obraSocial: order.obraSocial,
          obraSocialNumber: order.obraSocialNumber
        }).catch((err) => console.error('Error enviando Email de receta:', err));
      }

      // Persist recipe link message in patient conversation
      const doctorDisplayName = currentUser?.name
        ? `${currentUser.name} ${currentUser.lastName || ''}`.trim()
        : 'Equipo Médico';

      const isElectronic = order.recipePdfUrl === 'PAMI' || order.recipePdfUrl === 'IOMA';
      let chatText = '';
      if (shouldNotifyUpdatedFile) {
        chatText = `¡Hola ${order.patientName}! Tu profesional médico ha actualizado el archivo de tu receta digital #${order.id}.\n\nPuedes acceder y descargar la versión actualizada en el mismo enlace:\n${recipeLink}`;
      } else {
        chatText = isElectronic
          ? `¡Hola ${order.patientName}! Tu solicitud #${order.id} ha sido aprobada por el profesional médico.\n\nSu receta ya ha sido emitida y transmitida a la red de farmacias.\nPodrá retirarla con su DNI o Carnet de obra social que lo acredite.`
          : `¡Hola ${order.patientName}! Tu receta digital #${order.id} ha sido emitida y aprobada por el profesional médico.\n\nPuedes acceder y descargar tu receta en formato PDF directamente aquí:\n${recipeLink}`;
      }

      const emissionChatMessage: any = {
        id: generateMessageId(),
        sender: currentUser?.role === 'medico' ? 'medico' : (currentUser?.role === 'admin' ? 'admin' : (currentUser?.role === 'colaborador' ? 'colaborador' : 'sistema')),
        senderName: doctorDisplayName,
        senderRole: currentUser?.role || 'medico',
        timestamp: new Date().toISOString(),
        status: 'sent',
        text: chatText,
        fileUrl: order.recipePdfUrl || recipeLink,
        fileName: order.recipePdfName || `receta_${order.id}.pdf`,
        fileType: isElectronic ? 'text' : 'pdf'
      };

      const currentOrderMsgs = Array.isArray(order.messages) ? order.messages : [];
      order.messages = [...currentOrderMsgs, emissionChatMessage];

      if (order.patientDni) {
        const cleanPatientDni = cleanDni(order.patientDni);
        this.patientRepo.findByDni(cleanPatientDni, order.tenantId || 'TEN-0001').then((pDoc) => {
          if (pDoc) {
            const currentPatientMsgs = Array.isArray(pDoc.messages) ? pDoc.messages : [];
            pDoc.messages = [...currentPatientMsgs, emissionChatMessage];
            pDoc.save().catch((pErr) => console.error('Error guardando mensaje en paciente:', pErr));
          }
        }).catch((pErr) => console.error('Error buscando paciente para chat:', pErr));
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

    const updatedOrder = await this.orderRepo.update(id, order);
    await this.refreshPendingOrderLimitAlert(order.tenantId || 'TEN-0001');
    return updatedOrder;
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
      const titularDniClean = cleanDni(order.requestedByTitularDni);

      const isOwner = 
        orderDniClean === patientDniClean || 
        dependentDnis.includes(orderDniClean) || 
        titularDniClean === patientDniClean ||
        (order.patientEmail && order.patientEmail === currentUser.email);
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

    if (result) {
      await this.refreshPendingOrderLimitAlert(order.tenantId || currentUser?.tenantId || 'TEN-0001');
    }

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

    const host = process.env.PUBLIC_URL || 'https://mireceta.online';
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
          interactionRecord: order,
          recipePdfUrl: order.recipePdfUrl,
          obraSocial: order.obraSocial,
          obraSocialNumber: order.obraSocialNumber
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
          recipeLink,
          recipePdfUrl: order.recipePdfUrl,
          obraSocial: order.obraSocial,
          obraSocialNumber: order.obraSocialNumber
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

    // Persist resend event as chat message in patient conversation
    const channelText = channel === 'both' ? 'WhatsApp y Correo electrónico' : channel === 'whatsapp' ? 'WhatsApp' : 'Correo electrónico';
    const isElectronicResend = order.recipePdfUrl === 'PAMI' || order.recipePdfUrl === 'IOMA';
    const resendText = isElectronicResend
      ? `Se han enviado los detalles de tu receta electrónica #${order.id} mediante ${channelText}.\n\nLos medicamentos están listos para ser retirados en la farmacia bajo la cobertura de ${order.recipePdfUrl} con tu número de obra social: ${order.obraSocialNumber || 'No ingresado'}.`
      : `Se ha enviado el enlace de tu receta digital #${order.id} mediante ${channelText}.\n\nEnlace de descarga directa del PDF:\n${recipeLink}`;

    const resendChatMessage: any = {
      id: generateMessageId(),
      sender: currentUser?.role === 'medico' ? 'medico' : (currentUser?.role === 'admin' ? 'admin' : (currentUser?.role === 'colaborador' ? 'colaborador' : 'sistema')),
      senderName: operatorName,
      senderRole: currentUser?.role || 'medico',
      timestamp: new Date().toISOString(),
      status: 'sent',
      text: resendText,
      fileUrl: order.recipePdfUrl || recipeLink,
      fileName: order.recipePdfName || `receta_${order.id}.pdf`,
      fileType: isElectronicResend ? 'text' : 'pdf'
    };

    const currentOrderMsgs = Array.isArray(order.messages) ? order.messages : [];
    order.messages = [...currentOrderMsgs, resendChatMessage];

    if (order.patientDni) {
      const cleanPatientDni = cleanDni(order.patientDni);
      const patientDoc = await this.patientRepo.findByDni(cleanPatientDni, tenantId);
      if (patientDoc) {
        const currentPatientMsgs = Array.isArray(patientDoc.messages) ? patientDoc.messages : [];
        patientDoc.messages = [...currentPatientMsgs, resendChatMessage];
        await patientDoc.save();
      }
    }

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
