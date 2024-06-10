import * as base64 from "jsr:@std/encoding/base64";

interface Link {
  href: string;
  rel: string;
  method: string;
}

/**
 * @see https://developer.paypal.com/api/rest/responses/
 */
interface FailureResponseData {
  name: string;
  details: {
    issue: string;
    description: string;
  }[];
  message: string;
  debug_id: string;
  links: Link[];
}

type GenericResponse<SuccessResponse> =
  | { ok: true; data: SuccessResponse }
  | { ok: false; data: FailureResponseData };

export interface ServerUtilsOptions {
  /**
   * This option controls which PayPal base url to use.
   */
  isSandbox: boolean;
  credentials: {
    clientId: string;
    clientSecret: string;
  };
}

export enum ServerUtilsCreateOrderOptionsIntent {
  Capture = "CAPTURE",
  Authorize = "AUTHORIZE",
}

export interface ServerUtilsCreateOrderOptions {
  /**
   * @see https://developer.paypal.com/docs/api/orders/v2/#orders_create!path=intent&t=request
   */
  intent: ServerUtilsCreateOrderOptionsIntent;
  /**
   * @see https://developer.paypal.com/docs/api/orders/v2/#orders_create!path=purchase_units&t=request
   */
  purchaseUnits: {
    /**
     * @see https://developer.paypal.com/docs/api/orders/v2/#orders_create!path=purchase_units/amount&t=request
     */
    amount: {
      /**
       * @see https://developer.paypal.com/docs/api/orders/v2/#orders_create!path=purchase_units/amount/currency_code&t=request
       *
       * The three-character [ISO-4217 currency code](https://developer.paypal.com/api/rest/reference/currency-codes/) that identifies the currency.
       */
      currencyCode: string;
      /**
       * @see https://developer.paypal.com/docs/api/orders/v2/#orders_create!path=purchase_units/amount/value&t=request
       *
       * The value, which might be:
       * - An integer for currencies like JPY that are not typically fractional.
       * - A decimal fraction for currencies like TND that are subdivided into thousandths.
       *
       * For the required number of decimal places for a currency code, see [Currency Codes](https://developer.paypal.com/api/rest/reference/currency-codes/).
       */
      value: string;
    };
  }[];
}

export interface ServerUtilsCreateOrderResponseData {
  /**
   * @see https://developer.paypal.com/docs/api/orders/v2/#orders_create!c=200&path=id&t=response
   *
   * The newly-created order id.
   */
  id: string;
  /**
   * @see https://developer.paypal.com/docs/api/orders/v2/#orders_create!c=200&path=links&t=response
   */
  status: string;
  /**
   * @see https://developer.paypal.com/docs/api/orders/v2/#orders_create!c=200&path=status&t=response
   */
  links: Link[];
}

export interface ServerUtilsCaptureOrderOptions {
  orderId: string;
}

export enum ServerUtilsCaptureOrderResponseDataStatus {
  /**
   * The order was created with the specified context.
   */
  Created = "CREATED",
  /**
   * The order was saved and persisted.
   * The order status continues to be in progress until a capture is
   * made with `final_capture = true` for all purchase units within the order.
   */
  Saved = "SAVED",
  /**
   * The customer approved the payment through the PayPal wallet
   * or another form of guest or unbranded payment. For example, a card, bank account, or so on.
   */
  Approved = "APPROVED",
  /**
   * All purchase units in the order are voided.
   */
  Voided = "VOIDED",
  /**
   * The payment was authorized or the authorized payment was captured for the order.
   */
  Completed = "COMPLETED",
  /**
   * The order requires an action from the payer (e.g. 3DS authentication).
   * Redirect the payer to the "rel":"payer-action" HATEOAS link returned as part
   * of the response prior to authorizing or capturing the order.
   * Some payment sources may not return a payer-action HATEOAS link (eg. MB WAY).
   * For these payment sources the payer-action is managed by the scheme itself (eg. through SMS, email, in-app notification, etc).
   */
  PayerActionRequired = "PAYER_ACTION_REQUIRED",
}

/**
 * Not fully implemented.
 */
export interface ServerUtilsCaptureOrderResponseData {
  /**
   * @see https://developer.paypal.com/docs/api/orders/v2/#orders_capture!c=201&path=purchase_units/id&t=response
   *
   * The order id.
   */
  id: string;
  /**
   * @see https://developer.paypal.com/docs/api/orders/v2/#orders_capture!c=201&path=status&t=response
   */
  status: ServerUtilsCaptureOrderResponseDataStatus;
  /**
   * @see https://developer.paypal.com/docs/api/orders/v2/#orders_capture!c=201&path=links&t=response
   */
  links: Link[];
}

export class ServerUtils {
  private baseUrl: string;

  constructor(private options: ServerUtilsOptions) {
    this.baseUrl = options.isSandbox
      ? "https://api-m.sandbox.paypal.com"
      : "https://api-m.paypal.com";
  }

  /**
   * @see https://developer.paypal.com/api/rest/authentication/
   */
  public async generateAccessToken() {
    const auth = base64.encodeBase64(
      this.options.credentials.clientId +
        ":" +
        this.options.credentials.clientSecret
    );
    const res = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      body: "grant_type=client_credentials",
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });
    const data = (await res.json()) as { access_token: string };
    return data.access_token;
  }

  /**
   * @see https://developer.paypal.com/docs/api/orders/v2/#orders_create
   *
   * Creates an order. Merchants and partners can add Level 2 and 3 data to payments
   * to reduce risk and payment processing costs.
   * For more information about processing payments, see [checkout](https://developer.paypal.com/docs/checkout/advanced/processing/)
   * or [multiparty checkout](https://developer.paypal.com/docs/multiparty/checkout/advanced/processing/).
   */
  public async createOrder(
    options: ServerUtilsCreateOrderOptions
  ): Promise<GenericResponse<ServerUtilsCreateOrderResponseData>> {
    const accessToken = await this.generateAccessToken();
    const url = `${this.baseUrl}/v2/checkout/orders`;
    const payload = {
      intent: options.intent,
      purchase_units: options.purchaseUnits.map((purchaseUnit) => {
        return {
          amount: {
            currency_code: purchaseUnit.amount.currencyCode,
            value: purchaseUnit.amount.value,
          },
        };
      }),
    };

    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        // Uncomment one of these to force an error for negative testing (in sandbox mode only). Documentation:
        // https://developer.paypal.com/tools/sandbox/negative-testing/request-headers/
        // "PayPal-Mock-Response": '{"mock_application_codes": "MISSING_REQUIRED_PARAMETER"}'
        // "PayPal-Mock-Response": '{"mock_application_codes": "PERMISSION_DENIED"}'
        // "PayPal-Mock-Response": '{"mock_application_codes": "INTERNAL_SERVER_ERROR"}'
      },
      method: "POST",
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    return res.ok
      ? {
          ok: true,
          data: data as ServerUtilsCreateOrderResponseData,
        }
      : {
          ok: false,
          data: data as FailureResponseData,
        };
  }

  /**
   * @see https://developer.paypal.com/docs/api/orders/v2/#orders_capture
   *
   * Captures payment for an order. To successfully capture payment for an order,
   * the buyer must first approve the order or a valid payment_source must be provided in the request.
   * A buyer can approve the order upon being redirected to the rel:approve URL
   * that was returned in the HATEOAS links in the create order response.
   */
  public async capturePaymentForOrder(
    options: ServerUtilsCaptureOrderOptions
  ): Promise<GenericResponse<ServerUtilsCaptureOrderResponseData>> {
    const accessToken = await this.generateAccessToken();
    const url = `${this.baseUrl}/v2/checkout/orders/${options.orderId}/capture`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        // Uncomment one of these to force an error for negative testing (in sandbox mode only). Documentation:
        // https://developer.paypal.com/tools/sandbox/negative-testing/request-headers/
        // "PayPal-Mock-Response": '{"mock_application_codes": "INSTRUMENT_DECLINED"}'
        // "PayPal-Mock-Response": '{"mock_application_codes": "TRANSACTION_REFUSED"}'
        // "PayPal-Mock-Response": '{"mock_application_codes": "INTERNAL_SERVER_ERROR"}'
      },
    });
    const data = await res.json();

    return res.ok
      ? {
          ok: true,
          data: data as ServerUtilsCaptureOrderResponseData,
        }
      : {
          ok: false,
          data: data as FailureResponseData,
        };
  }
}
