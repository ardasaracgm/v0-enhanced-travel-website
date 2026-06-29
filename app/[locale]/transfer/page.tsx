import { Header } from '@/components/islandbee/header'
import { Footer } from '@/components/islandbee/footer'
import { TransferWizard } from './transfer-wizard'

// Shell: Header + 3-adımlı transfer wizard + Footer (insurance page deseni).
// Auth yok → force-dynamic gerekmez. Locale layout'ta valide edilir.
export default function TransferPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <TransferWizard />
      </main>
      <Footer />
    </div>
  )
}
