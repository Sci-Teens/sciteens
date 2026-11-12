import { doc, getDoc } from 'firebase/firestore'
import { db } from './firestore'

export async function fetchCollectionProgramImages(
  programs
) {
  return Promise.all(
    programs.map(async (program) => {
      if (program.imageUrl || !program.slug) return program
      const snapshot = await getDoc(
        doc(db, 'opportunities', program.slug)
      ).catch(() => null)
      const record = snapshot?.data()
      return {
        ...program,
        imageUrl: record?.imageUrl || '',
        imageFit:
          record?.imageFit === 'contain'
            ? 'contain'
            : 'cover',
      }
    })
  )
}
