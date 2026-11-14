const PAYSTACK_PUBLIC_KEY =
  import.meta.env.VITE_PAYSTACK_PUBLIC_KEY ||
  'pk_test_ecdaff8143801cc6497e0645333bdd3f4e970b7f'

export function loadPaystackScript() {
  return new Promise((resolve, reject) => {
    if (window.PaystackPop) return resolve()
    const script = document.createElement('script')
    script.src = 'https://js.paystack.co/v1/inline.js'
    script.onload = resolve
    script.onerror = () => reject(new Error('Could not load Paystack'))
    document.head.appendChild(script)
  })
}

export function openPaystackPayment({ email, amount, reference, metadata }) {
  return new Promise((resolve, reject) => {
    if (!window.PaystackPop) return reject(new Error('Paystack SDK not loaded'))
    const handler = window.PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email,
      amount: Math.round(Number(amount) * 100),
      currency: 'NGN',
      ref: reference,
      metadata: metadata || {},
      callback: (response) => resolve(response),
      onClose: () => reject(new Error('Payment cancelled'))
    })
    handler.openIframe()
  })
}
