import { Header } from '@/components/islandbee/header'
import { Footer } from '@/components/islandbee/footer'
import { InsuranceWizard } from './insurance-wizard'

// Shell: Header + 3-adımlı wizard + Footer. Pazarlama/landing içeriği B5'te
// genişler. Auth yok → force-dynamic gerekmez. Locale layout'ta valide edilir.
export default function InsurancePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <InsuranceWizard />
      </main>
      <Footer />
    </div>
  )
}
