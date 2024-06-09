# @cowboysandwitches/paypal-utils

An unofficial PayPal utils package helping to integrate PayPal Checkout more easily - with good types and JSDoc annotations.

## Usage

### Creating an `ServerUtils` instance

```typescript
const serverUtils = new ServerUtils({
  isSandbox: true,
  credentials: {
    clientId: "blibla...",
    clientSecret: "blub...",
  },
});
```

### Creating an order

```typescript
const serverUtils = new ServerUtils(...);

const order = serverUtils.createOrder({
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
assert(order.ok);
console.debug(`Created order ${order.data.id}`);
```

### Capturing the payment for an order

```typescript
const serverUtils = new ServerUtils(...);

const capturedOrder = await serverUtils.capturePaymentForOrder({
  orderId: "...",
});
assert(capturedOrder.ok);
console.debug(`Captured order ${capturedOrder.id}.`);
```
