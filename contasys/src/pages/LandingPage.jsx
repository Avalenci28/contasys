import { useState } from 'react'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import DashboardPreview from '../components/DashboardPreview'
import Features from '../components/Features'
import AdSense from '../components/ui/AdSense'
import Modules from '../components/Modules'
import Stats from '../components/Stats'
import CallToAction from '../components/CallToAction'
import Footer from '../components/Footer'
import Modal from '../components/Modal'
import AuthFlow from '../components/auth/AuthFlow'

export default function LandingPage({ onAuthSuccess }) {
  const [activePage, setActivePage] = useState('home')

  const [isAuthOpen, setIsAuthOpen] = useState(false)

  const scrollToId = (id) => {
    const el = document.getElementById(id)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const openLogin = () => setIsAuthOpen(true)
  const openRegister = () => setIsAuthOpen(true)
  const closeAllModals = () => setIsAuthOpen(false)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        activePage={activePage}
        setActivePage={setActivePage}
        onOpenLogin={openLogin}
        onOpenRegister={openRegister}
      />

      <main style={{ flex: 1 }}>
        <Hero onOpenRegister={openRegister} onScrollDemo={() => scrollToId('demo')} />
        <DashboardPreview />

        <AdSense slot="1111111111" style={{ maxWidth: 1100, margin: '3rem auto', minHeight: 90 }} />

        <Features />
        <Modules />
        <Stats />

        <AdSense slot="2222222222" style={{ maxWidth: 1100, margin: '3rem auto', minHeight: 90 }} />

        <CallToAction onOpenRegister={openRegister} onScrollModules={() => scrollToId('modulos')} />
      </main>

      <Footer onScroll={(id) => scrollToId(id)} />

      <Modal isOpen={isAuthOpen} title="Acceso ContaSys" onClose={closeAllModals}>
        <AuthFlow onAuthSuccess={onAuthSuccess} />
      </Modal>
    </div>
  )
}


