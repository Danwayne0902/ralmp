import { Compass } from 'lucide-react'
import { Button } from '../components/ui'

export default function NotFound() {
  return (
    <div className="container-page py-12 sm:py-16">
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="card w-full max-w-lg px-6 py-16 text-center sm:py-20">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-brand-600">
            <Compass size={28} />
          </div>
          <p className="mt-5 font-display text-5xl font-extrabold tracking-tight text-gradient-brand tnum">404</p>
          <h1 className="mt-2 font-display text-xl font-bold text-ink">Page not found</h1>
          <p className="mt-1.5 text-sm text-sand-500">
            The page you&apos;re looking for may have moved or no longer exists.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button to="/">Go home</Button>
            <Button to="/commodities" variant="outline">Marketplace</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
