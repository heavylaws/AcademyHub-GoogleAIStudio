import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import { requireOwnership } from './requireOwnership';
import { AuthUser } from './types';

const suffix = `phase33_${Date.now()}`;
const parentId = `${suffix}_parent`;
const otherParentId = `${suffix}_other`;
const coachId = `${suffix}_coach`;
const assessmentId = `${suffix}_assessment`;
const athleteId = `${suffix}_athlete`;

const parentUser: AuthUser = { uid: parentId, role: 'parent', claims: { role: 'parent' } };
const otherParent: AuthUser = { uid: otherParentId, role: 'parent', claims: { role: 'parent' } };
const coachUser: AuthUser = { uid: coachId, role: 'coach', claims: { role: 'coach' } };

describe('requireOwnership assessment live Postgres join', () => {
  it('resolves ownership through Assessment.athlete.parentUserId', async () => {
    await prisma.user.createMany({
      data: [
        { id: parentId, email: `${parentId}@example.com`, displayName: 'Test Parent', role: 'PARENT' },
        { id: otherParentId, email: `${otherParentId}@example.com`, displayName: 'Other Test Parent', role: 'PARENT' },
        { id: coachId, email: `${coachId}@example.com`, displayName: 'Test Coach', role: 'COACH' },
      ],
    });
    await prisma.athlete.create({
      data: {
        id: athleteId,
        name: 'Phase 3.3 Test Athlete',
        parentUserId: parentId,
        parentEmail: `${parentId}@example.com`,
        guardianConsent: true,
      },
    });
    await prisma.assessment.create({
      data: {
        id: assessmentId,
        athleteId,
        athleteName: 'Phase 3.3 Test Athlete',
        sport: 'Test',
        exerciseType: 'Test Exercise',
        quantitativeMetrics: { valid_reps: 1, duration_seconds: 1 },
        qualitativeObservations: { form_quality_score: 1, endurance_score: 1, fault_tags: [], coach_notes: '' },
        mediaReferences: { smart_grid_processed: false },
        computedScore: 1,
        coachId,
      },
    });

    await expect(requireOwnership(parentUser, 'assessment', assessmentId)).resolves.toBeUndefined();
    await expect(requireOwnership(otherParent, 'assessment', assessmentId)).rejects.toThrow('You do not own');
    await expect(requireOwnership(coachUser, 'assessment', assessmentId)).resolves.toBeUndefined();
  });

  afterAll(async () => {
    await prisma.assessment.deleteMany({ where: { id: assessmentId } });
    await prisma.athlete.deleteMany({ where: { id: athleteId } });
    await prisma.user.deleteMany({ where: { id: { in: [parentId, otherParentId, coachId] } } });
    await prisma.$disconnect();
  });
});
