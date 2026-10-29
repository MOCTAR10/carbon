'use client'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Leaf } from 'lucide-react'

function PrintCard() {
  const searchParams = useSearchParams()
  const name = searchParams.get('name') || 'Partenaire'
  const num = searchParams.get('num') || '0000 0000 0000 0000'
  const type = searchParams.get('type') || 'NGO'

  // Standard CR80 dimensions: 3.375" x 2.125"
  // For precise printing in CSS: 85.6mm x 54mm
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-800 p-8 font-sans">
      
      <div className="mb-8 text-center no-print">
         <h1 className="text-2xl font-bold text-white mb-2">Interface d&apos;Impression CR-80</h1>
         <p className="text-gray-400">Insérez un badge vierge dans l&apos;imprimante Evolis / Luka 40 KM.</p>
      </div>

      {/* The Printable Card Object */}
      <div className="bg-white print-target" style={{ width: '85.6mm', height: '54mm', borderRadius: '3mm', position: 'relative', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
         {/* Background gradient */}
         <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-emerald-700 to-green-600"></div>
         
         {/* Decorative Overlay */}
         <div className="absolute -right-8 -top-8 opacity-20 transform rotate-12">
            <Leaf className="w-40 h-40 text-white" />
         </div>
         <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/40 to-transparent"></div>
         
         <div className="relative z-10 p-5 h-full flex flex-col justify-between text-white drop-shadow-sm">
            
            {/* Header */}
            <div className="flex justify-between items-start">
               <div>
                  <h1 className="text-[13px] font-black tracking-[0.2em] text-emerald-100 uppercase">CarbonTrack</h1>
                  <p className="text-[7px] text-emerald-300 font-bold uppercase tracking-widest mt-0.5">{type}</p>
               </div>
               
               {/* Simulating EVM Smart Chip */}
               <div className="w-10 h-8 bg-gradient-to-br from-yellow-200 to-yellow-500 rounded-md flex items-center justify-center border border-yellow-600 shadow-inner">
                 <div className="w-7 h-5 border border-yellow-700/50 rounded-[3px] flex items-center justify-center">
                    <div className="w-full h-[1px] bg-yellow-700/50 absolute"></div>
                    <div className="h-full w-[1px] bg-yellow-700/50 absolute"></div>
                 </div>
               </div>
            </div>

            {/* Content Bottom */}
            <div>
               <p className="font-mono text-[17px] tracking-[0.15em] drop-shadow-md mb-2">{num}</p>
               <div className="flex justify-between items-end">
                  <p className="font-bold text-[12px] tracking-widest uppercase truncate max-w-[60%]">{name}</p>
                  
                  {/* Bank affiliation */}
                  <div className="flex flex-col items-end">
                    <span className="text-[6px] text-emerald-200 uppercase tracking-wider mb-0.5">Partenaire Financier</span>
                    <p className="text-[9px] font-black uppercase tracking-widest bg-white text-emerald-900 px-1.5 py-0.5 rounded-sm">AFG Bank</p>
                  </div>
               </div>
            </div>
         </div>
      </div>
      
      <div className="fixed bottom-0 left-0 w-full bg-gray-900 p-4 flex justify-center gap-4 no-print border-t border-gray-700 z-50">
        <button onClick={() => window.print()} className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold tracking-wide transition-colors flex items-center gap-2">
          <Leaf className="w-5 h-5" />
          Imprimer la Carte Plastique
        </button>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
            body { margin: 0; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none !important; }
            .print-target { box-shadow: none !important; margin: 0 !important; }
            @page { size: 85.6mm 54mm; margin: 0; }
        }
      `}} />
    </div>
  )
}

// useSearchParams needs a Suspense boundary, otherwise the production build fails to prerender this page
export default function PrintCardPage() {
  return (
    <Suspense fallback={null}>
      <PrintCard />
    </Suspense>
  )
}
