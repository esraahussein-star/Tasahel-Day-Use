import {
  Injectable
} from '@angular/core';

import {
  RealtimeChannel
} from '@supabase/supabase-js';

import {
  SupabaseService
} from '../../services/supabase.service';


@Injectable({
  providedIn: 'root'
})
export class AccountWorkspaceService {

  constructor(
    private supabaseService:
      SupabaseService
  ) {}


  // =========================================================
  // SUPABASE
  // =========================================================

  private get supabase() {
    return this.supabaseService.client;
  }


  // =========================================================
  // ACCOUNT REQUESTS
  // =========================================================

  async getAccountRequests():
    Promise<any[]> {

    const {
      data,
      error
    } = await this.supabase
      .from('day_use_requests')
      .select('*')
      .in(
        'workflow_status',
        [
          'sent_to_accounts',
          'payment_review',
          'paid'
        ]
      )
      .order(
        'sent_to_accounts_at',
        {
          ascending: false,
          nullsFirst: false
        }
      )
      .order(
        'updated_at',
        {
          ascending: false
        }
      );


    if (error) {

      console.error(
        'Account requests error:',
        error
      );

      throw error;
    }


    return data || [];
  }


  // =========================================================
  // SINGLE REQUEST
  // =========================================================

  async getRequestById(
    requestId: string
  ):
    Promise<any | null> {

    const {
      data,
      error
    } = await this.supabase
      .from('day_use_requests')
      .select('*')
      .eq(
        'id',
        requestId
      )
      .maybeSingle();


    if (error) {

      console.error(
        'Account request details error:',
        error
      );

      throw error;
    }


    return data;
  }


  // =========================================================
  // REQUEST ASSIGNMENT
  // عشان نعرف الـAgent المسؤول
  // =========================================================

  async getRequestAssignment(
    requestId: string
  ):
    Promise<any | null> {

    const {
      data,
      error
    } = await this.supabase
      .from('request_assignments')
      .select(`
        id,
        request_id,
        assigned_to,
        assigned_by,
        assignment_type,
        status,
        started_at,
        completed_at,
        created_at
      `)
      .eq(
        'request_id',
        requestId
      )
      .in(
        'status',
        [
          'assigned',
          'in_progress'
        ]
      )
      .order(
        'created_at',
        {
          ascending: false
        }
      )
      .limit(1)
      .maybeSingle();


    if (error) {

      console.error(
        'Request assignment error:',
        error
      );

      throw error;
    }


    return data;
  }


  // =========================================================
  // USER BY ID
  // =========================================================

  async getUserById(
    userId: string
  ):
    Promise<any | null> {

    const {
      data,
      error
    } = await this.supabase
      .from('admin_users')
      .select(`
        id,
        full_name,
        email,
        role,
        active
      `)
      .eq(
        'id',
        userId
      )
      .maybeSingle();


    if (error) {

      console.error(
        'Account user lookup error:',
        error
      );

      throw error;
    }


    return data;
  }


  // =========================================================
  // START PAYMENT REVIEW
  // =========================================================

  async startReview(
    requestId: string,
    accountUserId: string
  ):
    Promise<any> {

    const {
      data,
      error
    } = await this.supabase
      .from('day_use_requests')
      .update({
        workflow_status:
          'payment_review',

        payment_status:
          'under_review',

        updated_at:
          new Date()
            .toISOString()
      })
      .eq(
        'id',
        requestId
      )
      .select('*')
      .single();


    if (error) {

      console.error(
        'Start payment review error:',
        error
      );

      throw error;
    }


    await this.createRequestEvent(
      requestId,
      'payment_review_started',
      {
        account_user_id:
          accountUserId,

        payment_status:
          'under_review',

        workflow_status:
          'payment_review'
      }
    );


    return data;
  }


  // =========================================================
  // UPDATE PAYMENT NOTES
  // =========================================================

  async updatePaymentNotes(
    requestId: string,
    paymentNotes: string | null
  ):
    Promise<any> {

    const {
      data,
      error
    } = await this.supabase
      .from('day_use_requests')
      .update({
        payment_notes:
          paymentNotes,

        updated_at:
          new Date()
            .toISOString()
      })
      .eq(
        'id',
        requestId
      )
      .select('*')
      .single();


    if (error) {

      console.error(
        'Update payment notes error:',
        error
      );

      throw error;
    }


    return data;
  }


  // =========================================================
  // CONFIRM PAYMENT
  // =========================================================

  async confirmPayment(
    requestId: string,
    accountUserId: string,
    paymentNotes: string | null
  ):
    Promise<any> {

    const {
      data,
      error
    } = await this.supabase
      .from('day_use_requests')
      .update({
        workflow_status:
          'paid',

        payment_status:
          'paid',

        payment_notes:
          paymentNotes,

        paid_at:
          new Date()
            .toISOString(),

        updated_at:
          new Date()
            .toISOString()
      })
      .eq(
        'id',
        requestId
      )
      .select('*')
      .single();


    if (error) {

      console.error(
        'Confirm payment error:',
        error
      );

      throw error;
    }


    await this.createRequestEvent(
      requestId,
      'payment_confirmed',
      {
        account_user_id:
          accountUserId,

        payment_status:
          'paid',

        workflow_status:
          'paid',

        payment_notes:
          paymentNotes
      }
    );


    return data;
  }


  // =========================================================
  // FAIL PAYMENT
  // =========================================================

  async failPayment(
    requestId: string,
    accountUserId: string,
    paymentNotes: string
  ):
    Promise<any> {

    const {
      data,
      error
    } = await this.supabase
      .from('day_use_requests')
      .update({
        workflow_status:
          'payment_review',

        payment_status:
          'failed',

        payment_notes:
          paymentNotes,

        updated_at:
          new Date()
            .toISOString()
      })
      .eq(
        'id',
        requestId
      )
      .select('*')
      .single();


    if (error) {

      console.error(
        'Fail payment error:',
        error
      );

      throw error;
    }


    await this.createRequestEvent(
      requestId,
      'payment_failed',
      {
        account_user_id:
          accountUserId,

        payment_status:
          'failed',

        workflow_status:
          'payment_review',

        payment_notes:
          paymentNotes
      }
    );


    return data;
  }


  // =========================================================
  // NEEDS AGENT ACTION
  //
  // مفيش status مخصص لها في الـconstraint،
  // فنخلي الحسابات تحت المراجعة ونوضح المطلوب
  // داخل payment_notes + event.
  // =========================================================

  async requestAgentAction(
    requestId: string,
    accountUserId: string,
    paymentNotes: string
  ):
    Promise<any> {

    const {
      data,
      error
    } = await this.supabase
      .from('day_use_requests')
      .update({
        workflow_status:
          'payment_review',

        payment_status:
          'under_review',

        payment_notes:
          paymentNotes,

        updated_at:
          new Date()
            .toISOString()
      })
      .eq(
        'id',
        requestId
      )
      .select('*')
      .single();


    if (error) {

      console.error(
        'Request agent action error:',
        error
      );

      throw error;
    }


    await this.createRequestEvent(
      requestId,
      'account_needs_agent_action',
      {
        account_user_id:
          accountUserId,

        payment_status:
          'under_review',

        workflow_status:
          'payment_review',

        payment_notes:
          paymentNotes
      }
    );


    return data;
  }


  // =========================================================
  // REFUND
  // =========================================================

  async markRefunded(
    requestId: string,
    accountUserId: string,
    paymentNotes: string
  ):
    Promise<any> {

    const request =
      await this.getRequestById(
        requestId
      );


    const refundAmount =
      Number(
        request?.customer_payable_amount
        ??
        request?.selling_price_snapshot
        ??
        0
      );


    const {
      data,
      error
    } = await this.supabase
      .from('day_use_requests')
      .update({
        payment_status:
          'refunded',

        payment_notes:
          paymentNotes,

        refunded_at:
          new Date()
            .toISOString(),

        refund_amount:
          refundAmount,

        updated_at:
          new Date()
            .toISOString()
      })
      .eq(
        'id',
        requestId
      )
      .select('*')
      .single();


    if (error) {

      console.error(
        'Mark refunded error:',
        error
      );

      throw error;
    }


    await this.createRequestEvent(
      requestId,
      'payment_refunded',
      {
        account_user_id:
          accountUserId,

        payment_status:
          'refunded',

        payment_notes:
          paymentNotes,

        refund_amount:
          refundAmount
      }
    );


    return data;
  }


  // =========================================================
  // PAYMENT RECEIPTS
  // =========================================================

  async getPaymentReceipts(
    requestId: string
  ): Promise<any[]> {

    const {
      data,
      error
    } = await this.supabase
      .from('request_payment_receipts')
      .select(`
        id,
        request_id,
        file_path,
        file_name,
        mime_type,
        file_size,
        uploaded_at,
        status,
        reviewed_by,
        reviewed_at,
        review_notes
      `)
      .eq(
        'request_id',
        requestId
      )
      .order(
        'uploaded_at',
        {
          ascending: false
        }
      );

    if (error) {

      console.error(
        'Payment receipts error:',
        error
      );

      throw error;
    }


    const receipts = data || [];


    return await Promise.all(
      receipts.map(
        async receipt => {

          if (!receipt.file_path) {
            return {
              ...receipt,
              signed_url: null
            };
          }


          const {
            data: signedData,
            error: signedError
          } = await this.supabase.storage
            .from('payment-receipts')
            .createSignedUrl(
              receipt.file_path,
              60 * 60
            );


          if (signedError) {

            console.error(
              'Payment receipt signed URL error:',
              signedError
            );

            return {
              ...receipt,
              signed_url: null
            };
          }


          return {
            ...receipt,
            signed_url:
              signedData?.signedUrl || null
          };

        }
      )
    );
  }


  // =========================================================
  // REQUEST NOTES
  // =========================================================

  async getRequestNotes(
    requestId: string
  ):
    Promise<any[]> {

    const {
      data,
      error
    } = await this.supabase
      .from('request_notes')
      .select(`
        id,
        request_id,
        user_id,
        note_type,
        content,
        created_at
      `)
      .eq(
        'request_id',
        requestId
      )
      .order(
        'created_at',
        {
          ascending: false
        }
      );


    if (error) {

      console.error(
        'Account request notes error:',
        error
      );

      throw error;
    }


    return data || [];
  }


  // =========================================================
  // ADD ACCOUNT NOTE
  // =========================================================

  async createAccountNote(
    requestId: string,
    userId: string,
    content: string
  ):
    Promise<any> {

    const {
      data,
      error
    } = await this.supabase
      .from('request_notes')
      .insert({
        request_id:
          requestId,

        user_id:
          userId,

        note_type:
          'payment',

        content
      })
      .select('*')
      .single();


    if (error) {

      console.error(
        'Create account note error:',
        error
      );

      throw error;
    }


    return data;
  }


  // =========================================================
  // REQUEST EVENTS
  // =========================================================

  async getRequestEvents(
    requestId: string
  ):
    Promise<any[]> {

    const {
      data,
      error
    } = await this.supabase
      .from('request_events')
      .select('*')
      .eq(
        'request_id',
        requestId
      )
      .order(
        'created_at',
        {
          ascending: false
        }
      );


    if (error) {

      console.error(
        'Account request events error:',
        error
      );

      throw error;
    }


    return data || [];
  }


  // =========================================================
  // CREATE EVENT
  // =========================================================

  private async createRequestEvent(
    requestId: string,
    eventType: string,
    eventData: any
  ):
    Promise<void> {

    const {
      error
    } = await this.supabase
      .from('request_events')
      .insert({
        request_id:
          requestId,

        event_type:
          eventType,

        event_data:
          eventData
      });


    if (error) {

      console.error(
        'Create request event error:',
        error
      );

      /*
       * ما نرميش error هنا عشان لو تسجيل الـevent
       * فشل ما نلغيش تحديث الدفع الأساسي.
       */

    }

  }


  // =========================================================
  // PLACE FINANCIALS
  // =========================================================

async getPlacesFinancials():
  Promise<any[]> {

  const {
    data,
    error
  } = await this.supabase
    .from('places')
    .select(`
      id,
      name,
      area,
      price,
      cost_price,
      active,
      packages,
      sort_order
    `)
    .order(
      'sort_order',
      {
        ascending: true
      }
    );


  if (error) {

    console.error(
      'Get places financials error:',
      error
    );

    throw error;

  }


  return (
    data || []
  ).map(
    place => {

      const sellingPrice =
        Number(
          place.price
          ?? 0
        );


      const costPrice =
        Number(
          place.cost_price
          ?? 0
        );


      const profit =
        sellingPrice
        -
        costPrice;


      const marginPercent =
        sellingPrice > 0
          ? (
              profit
              /
              sellingPrice
              *
              100
            )
          : 0;


      return {

        ...place,

        selling_price:
          sellingPrice,

        cost_price:
          costPrice,

        profit,

        margin_percent:
          marginPercent,

        packages:
          Array.isArray(
            place.packages
          )
            ? place.packages
            : (
                place.packages
                &&
                typeof place.packages === 'object'
                  ? Object.values(
                      place.packages
                    )
                  : []
              )

      };

    }
  );

}

 async updatePlacePrices(
  placeId: string,
  sellingPrice: number,
  costPrice: number
):
  Promise<any> {

  const {
    data,
    error
  } = await this.supabase
    .from('places')
    .update({

      price:
        sellingPrice,

      cost_price:
        costPrice,

      updated_at:
        new Date().toISOString()

    })
    .eq(
      'id',
      placeId
    )
    .select('*')
    .single();


  if (error) {

    console.error(
      'Update place prices error:',
      error
    );

    throw error;

  }


  return data;

}

  // =========================================================
  // PAYMENT METHODS MANAGEMENT
  // =========================================================

  async getPaymentMethods(): Promise<any[]> {

    const {
      data,
      error
    } = await this.supabase
      .from('payment_methods')
      .select('*')
      .order('sort_order', {
        ascending: true
      })
      .order('name', {
        ascending: true
      });


    if (error) {

      console.error(
        'Account payment methods error:',
        error
      );

      throw error;
    }


    return data || [];
  }


  async createPaymentMethod(
    payload: {
      name: string;
      code: string;
      fee_percent?: number;
      instructions?: string | null;
      account_name?: string | null;
      account_number?: string | null;
      active?: boolean;
      sort_order?: number;
    }
  ): Promise<any> {

    const {
      data,
      error
    } = await this.supabase
      .from('payment_methods')
      .insert({
        name:
          payload.name,
        code:
          payload.code,
        fee_percent:
          Number(payload.fee_percent || 0),
        instructions:
          payload.instructions || null,
        account_name:
          payload.account_name || null,
        account_number:
          payload.account_number || null,
        active:
          payload.active !== false,
        sort_order:
          Number(payload.sort_order || 0),
        updated_at:
          new Date().toISOString()
      })
      .select('*')
      .single();


    if (error) {

      console.error(
        'Create payment method error:',
        error
      );

      throw error;
    }


    return data;
  }


  async updatePaymentMethod(
    paymentMethodId: string,
    payload: {
      name?: string;
      code?: string;
      fee_percent?: number;
      instructions?: string | null;
      account_name?: string | null;
      account_number?: string | null;
      active?: boolean;
      sort_order?: number;
    }
  ): Promise<any> {

    const updatePayload: any = {
      ...payload,
      updated_at:
        new Date().toISOString()
    };


    if (
      payload.fee_percent !== undefined
    ) {
      updatePayload.fee_percent =
        Number(payload.fee_percent);
    }


    if (
      payload.sort_order !== undefined
    ) {
      updatePayload.sort_order =
        Number(payload.sort_order);
    }


    const {
      data,
      error
    } = await this.supabase
      .from('payment_methods')
      .update(updatePayload)
      .eq('id', paymentMethodId)
      .select('*')
      .single();


    if (error) {

      console.error(
        'Update payment method error:',
        error
      );

      throw error;
    }


    return data;
  }


  async togglePaymentMethod(
    paymentMethodId: string,
    active: boolean
  ): Promise<any> {

    return await this.updatePaymentMethod(
      paymentMethodId,
      {
        active
      }
    );
  }


  async deletePaymentMethod(
    paymentMethodId: string
  ): Promise<void> {

    const {
      error
    } = await this.supabase
      .from('payment_methods')
      .delete()
      .eq('id', paymentMethodId);


    if (error) {

      console.error(
        'Delete payment method error:',
        error
      );

      throw error;
    }
  }


  // =========================================================
  // DASHBOARD STATS
  // =========================================================

  async getDashboardStats():
    Promise<{
      pending: number;
      underReview: number;
      paid: number;
      failed: number;
      refunded: number;
      total: number;
    }> {

    const requests =
      await this.getAccountRequests();


    return {

      pending:
        requests.filter(
          request =>
            request.payment_status ===
              'pending'
        ).length,

      underReview:
        requests.filter(
          request =>
            request.payment_status ===
              'under_review'
        ).length,

      paid:
        requests.filter(
          request =>
            request.payment_status ===
              'paid'
        ).length,

      failed:
        requests.filter(
          request =>
            request.payment_status ===
              'failed'
        ).length,

      refunded:
        requests.filter(
          request =>
            request.payment_status ===
              'refunded'
        ).length,

      total:
        requests.length

    };

  }


  // =========================================================
  // REALTIME REQUEST CHANGES
  // =========================================================

  subscribeToAccountRequests(
    callback:
      (payload: any) => void
  ):
    RealtimeChannel {

    const channel =
      this.supabase
        .channel(
          `account-requests-${Date.now()}`
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table:
              'day_use_requests'
          },
          payload => {

            const request =
              (
                payload.new ||
                payload.old
              ) as any;


            if (!request) {
              return;
            }


            const relevant =
              [
                'sent_to_accounts',
                'payment_review',
                'paid'
              ].includes(
                request.workflow_status
              )
              ||
              [
                'pending',
                'under_review',
                'paid',
                'failed',
                'refunded'
              ].includes(
                request.payment_status
              );


            if (!relevant) {
              return;
            }


            callback(
              payload
            );

          }
        )
        .subscribe();


    return channel;
  }


  // =========================================================
  // REMOVE CHANNEL
  // =========================================================

  async removeChannel(
    channel:
      RealtimeChannel |
      null |
      undefined
  ):
    Promise<void> {

    if (!channel) {
      return;
    }


    try {

      await this.supabase
        .removeChannel(
          channel
        );


    } catch (error) {

      console.error(
        'Remove account realtime channel error:',
        error
      );

    }

  }


  // =========================================================
  // FINANCIAL DASHBOARD REPORT
  // =========================================================

  async getFinancialReport(
    fromInclusiveIso: string,
    toExclusiveIso: string
  ): Promise<{
    totalSales: number;
    totalCost: number;
    grossProfit: number;
    collected: number;
    refunded: number;
    netCollected: number;
    paidRequests: number;
    refundedRequests: number;
  }> {

    const [
      paidResult,
      refundedResult
    ] = await Promise.all([

      this.supabase
        .from('day_use_requests')
        .select(`
          id,
          payment_status,
          amount_due,
          payment_fee_percent,
          payment_fee_amount,
          customer_payable_amount,
          selling_price_snapshot,
          total_selling_price,
          cost_price_snapshot,
          total_cost_price,
          guests,
          paid_at
        `)
        .eq('payment_status', 'paid')
        .not('paid_at', 'is', null)
        .gte('paid_at', fromInclusiveIso)
        .lt('paid_at', toExclusiveIso),

      this.supabase
        .from('day_use_requests')
        .select(`
          id,
          refund_amount,
          refunded_at
        `)
        .not('refunded_at', 'is', null)
        .gte('refunded_at', fromInclusiveIso)
        .lt('refunded_at', toExclusiveIso)

    ]);

    if (paidResult.error) {
      console.error(
        'Financial paid report error:',
        paidResult.error
      );
      throw paidResult.error;
    }

    if (refundedResult.error) {
      console.error(
        'Financial refund report error:',
        refundedResult.error
      );
      throw refundedResult.error;
    }

    const paidRows =
      paidResult.data || [];

    const refundedRows =
      refundedResult.data || [];

    const totalSales =
      paidRows.reduce(
        (sum, row) => {
          const amountDue =
            Number(row.amount_due || 0);

          const feeAmount =
            Number(row.payment_fee_amount || 0);

          let saleAmount = 0;

          if (amountDue > 0) {
            saleAmount =
              Math.max(
                amountDue - feeAmount,
                0
              );
          } else {
            const totalSelling =
              Number(row.total_selling_price || 0);

            const unitSelling =
              Number(row.selling_price_snapshot || 0);

            const guests =
              Number(row.guests || 1);

            saleAmount =
              totalSelling > 0
                ? totalSelling
                : unitSelling * guests;
          }

          return sum + saleAmount;
        },
        0
      );

    const totalCost =
      paidRows.reduce(
        (sum, row) => {
          const totalCostValue =
            Number(row.total_cost_price || 0);

          const unitCost =
            Number(row.cost_price_snapshot || 0);

          const guests =
            Number(row.guests || 1);

          const cost =
            totalCostValue > 0
              ? totalCostValue
              : unitCost * guests;

          return sum + cost;
        },
        0
      );

    const collected =
      paidRows.reduce(
        (sum, row) => {
          const amountDue =
            Number(row.amount_due || 0);

          const customerPayable =
            Number(row.customer_payable_amount || 0);

          const feeAmount =
            Number(row.payment_fee_amount || 0);

          // In the current payment flow amount_due is the final amount
          // charged to the customer (base amount + payment fee).
          // Fall back to customer_payable_amount only for legacy rows.
          const actualCollected =
            amountDue > 0
              ? amountDue
              : customerPayable + feeAmount;

          return sum + actualCollected;
        },
        0
      );

    const paymentFees =
      paidRows.reduce(
        (sum, row) =>
          sum + Number(row.payment_fee_amount || 0),
        0
      );

    const refunded =
      refundedRows.reduce(
        (sum, row) =>
          sum + Number(row.refund_amount || 0),
        0
      );

    const grossProfit =
      totalSales - totalCost;

    return {
      totalSales,
      totalCost,
      grossProfit,
      collected,
      refunded,
      netCollected:
        Math.max(
          collected - paymentFees - refunded,
          0
        ),
      paidRequests:
        paidRows.length,
      refundedRequests:
        refundedRows.length
    };
  }

// UPDATE PLACE PACKAGES
// =========================================================

async updatePlacePackages(
  placeId: string,
  packages: any[]
):
  Promise<any> {

  const {
    data,
    error
  } = await this.supabase
    .from('places')
    .update({

      packages,

      updated_at:
        new Date().toISOString()

    })
    .eq(
      'id',
      placeId
    )
    .select('*')
    .single();


  if (error) {

    console.error(
      'Update place packages error:',
      error
    );

    throw error;

  }


  return data;

}
}