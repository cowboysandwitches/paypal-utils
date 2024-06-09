import * as base64 from "jsr:@std/encoding/base64";

interface Link {
  href: string;
  rel: string;
  method: string;
}

interface FailureResponseData {
  name: string;
  details: {
    issue: string;
    description: string;
  }[];
  message: string;
  debug_id: string;
  /**
   * https://developer.paypal.com/docs/api/orders/v2/#orders_capture!c=201&path=links&t=response
   */
  links: Link[];
}

type GenericResponse<SuccessResponse> =
  | { ok: true; data: SuccessResponse }
  | { ok: false; data: FailureResponseData };

export interface ServerUtilsOptions {
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
   * https://developer.paypal.com/docs/api/orders/v2/#orders_create!path=intent&t=request
   */
  intent: ServerUtilsCreateOrderOptionsIntent;
  /**
   * https://developer.paypal.com/docs/api/orders/v2/#orders_create!path=purchase_units&t=request
   */
  purchaseUnits: {
    /**
     * https://developer.paypal.com/docs/api/orders/v2/#orders_create!path=purchase_units/amount&t=request
     */
    amount: {
      /**
       * https://developer.paypal.com/docs/api/orders/v2/#orders_create!path=purchase_units&t=request
       *
       * The three-character [ISO-4217 currency code](https://developer.paypal.com/api/rest/reference/currency-codes/) that identifies the currency.
       */
      currencyCode: string;
      /**
       * https://developer.paypal.com/docs/api/orders/v2/#orders_create!path=purchase_units&t=request
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
   * https://developer.paypal.com/docs/api/orders/v2/#orders_create!c=200&path=id&t=response
   *
   * The newly-created order id.
   */
  id: string;
  /**
   * https://developer.paypal.com/docs/api/orders/v2/#orders_create!c=200&path=links&t=response
   */
  status: string;
  /**
   * https://developer.paypal.com/docs/api/orders/v2/#orders_create!c=200&path=status&t=response
   */
  links: Link[];
}

export interface ServerUtilsCaptureOrderOptions {
  orderId: string;
}

export interface ServerUtilsCaptureOrderResponseData {
  name: string;
  details: {
    issue: string;
    description: string;
  }[];
  message: string;
  debug_id: string;
  /**
   * https://developer.paypal.com/docs/api/orders/v2/#orders_capture!c=201&path=links&t=response
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
   * Generate an OAuth 2.0 access token for authenticating with PayPal REST APIs.
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

    return {
      ok: res.ok,
      data,
    };
  }

  public async captureOrder(
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

    return { ok: res.ok, data };
  }
}
