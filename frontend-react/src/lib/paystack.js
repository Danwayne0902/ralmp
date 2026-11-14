const SCRIPT_SRC = 'https://js.paystack.co/v1/inline.js'

let scriptPromise = null

export function loadPaystackScript() {
  if (window.PaystackPop) return Promise.resolve(window.PaystackPop)
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.onload = () => resolve(window.PaystackPop)
    script.onerror = () => reject(new Error('Could not load Paystack'))
    document.body.appendChild(script)
  })

  return scriptPromise
}

export function openPaystackPayment({ email, amount, reference, metadata, onClose }) {
  return new Promise((resolve, reject) => {
    if (!window.PaystackPop) {
      reject(new Error('Paystack is not available'))
      return
    }

    const handler = window.PaystackPop.setup({
      key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
      email,
      amount: Math.round(Number(amount || 0) * 100),
      currency: 'NGN',
      ref: reference,
      metadata,
      callback: (response) => resolve(response),
      onClose: () => {
        onClose?.()
        reject(new Error('Payment cancelled'))
      },
    })

    handler.openIframe()
  })
}
