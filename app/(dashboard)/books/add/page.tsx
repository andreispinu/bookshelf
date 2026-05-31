import { Suspense } from 'react'
import AddBookForm from './add-book-form'

export default function AddBookPage() {
  return (
    <Suspense>
      <AddBookForm />
    </Suspense>
  )
}
