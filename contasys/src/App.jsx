import { useState } from 'react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import DashboardPreview from './components/DashboardPreview'
import Features from './components/Features'
import Modules from './components/Modules'
import Stats from './components/Stats'
import CallToAction from './components/CallToAction'
import Footer from './components/Footer'

export default function App() {
  const [activePage, setActivePage] = useState('home')

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar activePage={activePage} setActivePage={setActivePage} />
      <main style={{ flex: 1 }}>
        <Hero />
        <DashboardPreview />
        <Features />
        <Modules />
        <Stats />
        <CallToAction />
      </main>
      <Footer />
    </div>
  )
}
