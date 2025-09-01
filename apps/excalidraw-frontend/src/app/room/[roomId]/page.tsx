import Canvas from '@/components/Canvas'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export default function page({ params }: { params: {slug: string[] }}) {
  return (
    <main>
      <Navbar />
      <Canvas />
      <Footer />
    </main>
  )
}