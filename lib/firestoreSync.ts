import { collection, getDocs, addDoc, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { INITIAL_ASSESSMENTS, INITIAL_SCHEDULES, INITIAL_COACHES, INITIAL_BILLING } from './seedData';

export async function ensureFirestoreSeeded() {
  try {
    // 1. Seed Assessments
    const assessmentsCol = collection(db, 'athlete_assessments');
    const assessmentsSnap = await getDocs(assessmentsCol);
    if (assessmentsSnap.empty) {
      for (const item of INITIAL_ASSESSMENTS) {
        await addDoc(assessmentsCol, item);
      }
      console.log('Seeded athlete_assessments into Firestore');
    }

    // 2. Seed Schedules
    const schedulesCol = collection(db, 'schedules');
    const schedulesSnap = await getDocs(schedulesCol);
    if (schedulesSnap.empty) {
      for (const item of INITIAL_SCHEDULES) {
        await addDoc(schedulesCol, item);
      }
      console.log('Seeded schedules into Firestore');
    }

    // 3. Seed Coaches
    const coachesCol = collection(db, 'coaches');
    const coachesSnap = await getDocs(coachesCol);
    if (coachesSnap.empty) {
      for (const item of INITIAL_COACHES) {
        await setDoc(doc(db, 'coaches', item.coachId), item);
      }
      console.log('Seeded coaches into Firestore');
    }

    // 4. Seed Billing
    const billingCol = collection(db, 'billing');
    const billingSnap = await getDocs(billingCol);
    if (billingSnap.empty) {
      for (const item of INITIAL_BILLING) {
        await addDoc(billingCol, item);
      }
      console.log('Seeded billing into Firestore');
    }
  } catch (err) {
    console.error('Error seeding Firestore:', err);
  }
}
