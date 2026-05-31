'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import PhotoModal from './photo-modal'

export default function PhotoButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        className="border-stone-200 text-stone-700 hover:bg-stone-100"
        onClick={() => setOpen(true)}
      >
        Add by photo
      </Button>
      <PhotoModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
