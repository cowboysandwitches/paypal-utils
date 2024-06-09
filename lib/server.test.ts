import { assert } from "jsr:@std/assert";
import { ServerUtils, ServerUtilsCreateOrderOptionsIntent } from "./server.ts";

Deno.test("ServerUtils, integration test", async () => {
  const serverUtils = new ServerUtils({
    isSandbox: true,
    credentials: {
      clientId: Deno.env.get("PAYPAL_CLIENT_ID")!,
      clientSecret: Deno.env.get("PAYPAL_CLIENT_SECRET")!,
    },
  });

  const createRes = await serverUtils.createOrder({
    intent: ServerUtilsCreateOrderOptionsIntent.Capture,
    purchaseUnits: [
      {
        amount: {
          currencyCode: "EUR",
          value: "1",
        },
      },
    ],
  });
  console.debug({ createRes });
  assert(createRes.ok);
  assert(typeof createRes.data.id === "string", "No valid order id received");

  const captureRes = await serverUtils.captureOrder({
    orderId: createRes.data.id,
  });
  console.debug({ captureRes });
  assert(!captureRes.ok);
});
