# @cowboysandwitches/paypal-utils

An unofficial PayPal utils package helping to integrate PayPal Checkout more easily - with good types and JSDoc annotations.

## Usage

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

### Capturing an order

```typescript
const serverUtils = new ServerUtils(...);

const capturedOrder = await serverUtils.captureOrder({
  orderId: "...",
});
assert(capturedOrder.ok);
console.debug(`Captured order ${capturedOrder.id}.`);
```
