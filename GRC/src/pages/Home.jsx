import React from 'react'
import { useState } from 'react'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import Footer from '../components/Footer'

const Home = () => {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      
      {/* Blur quand modal ouvert */}
      <div className={open ? "blur-sm pointer-events-none" : ""}>
        <Navbar />
        <Hero />
        <Footer />
      </div>
      {open && <AProposModal close={() => setOpen(false)} />}
      
    </div>
  )
}

export default Home
