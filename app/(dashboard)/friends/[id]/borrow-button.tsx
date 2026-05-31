'use client'

import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function BorrowButton() {
  return (
    <Button
      size="sm"
      variant="outline"
      className="border-stone-300 text-stone-700 hover:bg-stone-50 shrink-0"
      onClick={() => toast.info('Coming soon — borrow requests are on the way!')}
    >
      Request to borrow
    </Button>
  )
}
