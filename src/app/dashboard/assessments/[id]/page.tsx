import dynamic from 'next/dynamic'
import { DetailSkeleton } from './DetailSkeleton'

const AssessmentDetailClient = dynamic(() => import('./AssessmentDetailClient'), {
  ssr: false,
  loading: () => <DetailSkeleton />,
})

export default function Page() {
  return <AssessmentDetailClient />
}
